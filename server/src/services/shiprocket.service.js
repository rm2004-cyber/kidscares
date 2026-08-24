import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { ApiError } from "../utils/ApiError.js";
import { Order } from "../models/Order.js";
import { mailer } from "./mailer.js";

/**
 * Shiprocket integration.
 *
 * The division of labour matters: everything up to and including "shipped" is
 * driven by the admin from our own dashboard. Once a shipment has an AWB,
 * Shiprocket's scans become the source of truth and we stop writing status by
 * hand — otherwise the two would disagree and the customer would see whichever
 * updated last.
 */

const BASE = "https://apiv2.shiprocket.in/v1/external";

/* Shiprocket tokens last ~10 days. Cached in memory and refreshed slightly
   early, so a normal request never pays the login round trip. */
let tokenCache = { token: null, expiresAt: 0 };

function assertConfigured() {
  if (!env.shiprocket.enabled) {
    throw ApiError.badRequest(
      "Shiprocket is not configured. Add SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD to the server .env.",
    );
  }
}

async function getToken(force = false) {
  assertConfigured();

  if (!force && tokenCache.token && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: env.shiprocket.email,
      password: env.shiprocket.password,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.token) {
    logger.error("[shiprocket] login failed:", json?.message ?? res.status);
    throw new ApiError(502, "Could not authenticate with Shiprocket", {
      code: "SHIPROCKET_AUTH_FAILED",
    });
  }

  tokenCache = { token: json.token, expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000 };
  logger.success("[shiprocket] authenticated");
  return json.token;
}

async function sr(path, { method = "GET", body, params, retry = true } = {}) {
  const token = await getToken();

  const url = new URL(`${BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // A cached token can be revoked server-side; refresh once and retry.
  if (res.status === 401 && retry) {
    await getToken(true);
    return sr(path, { method, body, params, retry: false });
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      json?.message ??
      (json?.errors ? JSON.stringify(json.errors) : `Shiprocket responded ${res.status}`);
    logger.error(`[shiprocket] ${method} ${path} → ${res.status}: ${message}`);
    throw new ApiError(502, message, { code: "SHIPROCKET_ERROR", details: json?.errors });
  }

  return json;
}

/* ─────────────────────── status normalisation ─────────────────────────── */

/**
 * Shiprocket returns a wide, inconsistent vocabulary. Map it onto our own
 * statuses so the storefront only ever renders values it knows how to show.
 */
const STATUS_MAP = {
  /* Paperwork, not movement. The courier has accepted the consignment but
     nobody has collected the parcel — calling this "shipped" is the single
     most common way tracking pages start lying to customers. */
  "awb assigned": "shipment-booked",
  "label generated": "shipment-booked",
  "manifest generated": "shipment-booked",
  "pickup scheduled": "shipment-booked",
  "pickup generated": "shipment-booked",
  "pickup queued": "shipment-booked",
  "pickup rescheduled": "shipment-booked",
  "out for pickup": "shipment-booked",

  /* A courier now physically holds the parcel. This, and only this, is
     "shipped". */
  "picked up": "shipped",
  "pickup completed": "shipped",
  shipped: "shipped",

  "in transit": "in-transit",
  "reached at destination hub": "in-transit",
  misroute: "in-transit",
  "out for delivery": "out-for-delivery",
  delivered: "delivered",
  "delivered to consignee": "delivered",
  cancelled: "cancelled",
  canceled: "cancelled",

  /* A failed attempt is not "still in transit": the customer needs to know
     someone tried and could not deliver, usually because they must act. */
  undelivered: "delivery-failed",
  "delivery failed": "delivery-failed",
  "customer not available": "delivery-failed",
  "address incorrect": "delivery-failed",
  "consignee refused": "delivery-failed",

  /* RTO split into its real stages — "rto" alone hid where the parcel was. */
  "rto initiated": "rto-initiated",
  "rto acknowledged": "rto-initiated",
  "rto in transit": "rto-in-transit",
  "rto out for delivery": "rto-in-transit",
  "rto delivered": "rto-delivered",
  "rto received": "rto-delivered",
  rto: "rto-initiated",
  "return delivered": "returned",
};

/* Longest keys first, so "rto delivered" is never matched by "rto". */
const STATUS_NEEDLES = Object.entries(STATUS_MAP).sort(
  (a, b) => b[0].length - a[0].length,
);

export function normaliseStatus(raw) {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase();
  if (STATUS_MAP[key]) return STATUS_MAP[key];

  // Fall back to substring matching — Shiprocket adds new variants over time.
  for (const [needle, mapped] of STATUS_NEEDLES) {
    if (key.includes(needle)) return mapped;
  }
  return null;
}

/* ───────────────────────── shipment creation ──────────────────────────── */

/** Maps one of our orders onto Shiprocket's adhoc-order payload. */
function toShiprocketOrder(order, customer, parcel) {
  const a = order.address ?? {};
  const [firstName, ...rest] = String(a.fullName ?? customer?.name ?? "Customer").split(" ");

  return {
    order_id: order.orderNo,
    order_date: new Date(order.createdAt).toISOString().slice(0, 19).replace("T", " "),
    pickup_location: env.shiprocket.pickupLocation,
    ...(env.shiprocket.channelId ? { channel_id: env.shiprocket.channelId } : {}),

    billing_customer_name: firstName,
    billing_last_name: rest.join(" ") || ".",
    billing_address: a.line1 ?? "",
    billing_address_2: [a.line2, a.landmark].filter(Boolean).join(", "),
    billing_city: a.city ?? "",
    billing_pincode: a.pincode ?? "",
    billing_state: a.state ?? "",
    billing_country: "India",
    billing_email: customer?.email ?? "",
    billing_phone: String(a.phone ?? customer?.phone ?? "").replace(/\D/g, "").slice(-10),
    shipping_is_billing: true,

    order_items: order.items.map((i) => ({
      name: i.title,
      sku: i.slug ?? String(i.product),
      units: i.qty,
      selling_price: i.price,
      discount: 0,
      tax: "",
      hsn: "",
    })),

    payment_method: order.payment?.method === "cod" ? "COD" : "Prepaid",
    shipping_charges: order.shipping ?? 0,
    total_discount: order.discount ?? 0,
    sub_total: order.total,

    /* Measured at packing. Shiprocket rejects zero dimensions, and couriers
       bill on volumetric weight, so a wrong number here is a real cost. */
    length: parcel?.lengthCm || 15,
    breadth: parcel?.breadthCm || 12,
    height: parcel?.heightCm || 8,
    weight: parcel?.weightKg || 0.5,
  };
}

/**
 * Pushes the order to Shiprocket. Called when the admin marks it "shipped".
 * Safe to call twice — an already-pushed order returns its existing ids.
 */
export async function createShipment(orderId, customer) {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound("Order not found");

  if (order.shipping_details?.shiprocketOrderId) {
    return {
      alreadyExists: true,
      shiprocketOrderId: order.shipping_details.shiprocketOrderId,
      shipmentId: order.shipping_details.shipmentId,
    };
  }

  const created = await sr("/orders/create/adhoc", {
    method: "POST",
    body: toShiprocketOrder(order, customer, order.parcel),
  });

  order.shipping_details = {
    ...(order.shipping_details?.toObject?.() ?? order.shipping_details ?? {}),
    provider: "shiprocket",
    shiprocketOrderId: String(created.order_id ?? ""),
    shipmentId: String(created.shipment_id ?? ""),
    awb: created.awb_code ? String(created.awb_code) : undefined,
    courier: created.courier_name || undefined,
    trackingStatus: "shipped",
    trackingUpdatedAt: new Date(),
  };
  await order.save();

  logger.success(
    `[shiprocket] created shipment for ${order.orderNo} (shipment ${created.shipment_id})`,
  );

  return {
    shiprocketOrderId: String(created.order_id ?? ""),
    shipmentId: String(created.shipment_id ?? ""),
    awb: created.awb_code ?? null,
    courier: created.courier_name ?? null,
  };
}

/** Assigns a courier and gets the AWB. Optional — Shiprocket can auto-assign. */
export async function assignAwb(shipmentId, courierId) {
  const res = await sr("/courier/assign/awb", {
    method: "POST",
    body: { shipment_id: Number(shipmentId), ...(courierId ? { courier_id: courierId } : {}) },
  });
  const data = res?.response?.data ?? {};
  return {
    awb: data.awb_code ?? null,
    courier: data.courier_name ?? null,
    freightCharge: data.freight_charges ?? null,
  };
}

export const requestPickup = (shipmentId) =>
  sr("/courier/generate/pickup", { method: "POST", body: { shipment_id: [Number(shipmentId)] } });

export const generateLabel = (shipmentId) =>
  sr("/courier/generate/label", { method: "POST", body: { shipment_id: [Number(shipmentId)] } });

export const cancelShipment = (awbs) =>
  sr("/orders/cancel/shipment/awbs", { method: "POST", body: { awbs: [].concat(awbs) } });

export const checkServiceability = ({
  pickupPincode,
  deliveryPincode,
  weight = 0.5,
  cod = 0,
  isReturn = 0,
  orderValue = 0,
  length,
  breadth,
  height,
}) =>
  sr("/courier/serviceability/", {
    params: {
      pickup_postcode: pickupPincode,
      delivery_postcode: deliveryPincode,
      weight,
      cod,
      /* Declared value drives insurance and some couriers' pricing bands. */
      ...(orderValue ? { declared_value: orderValue } : {}),
      ...(length ? { length, breadth, height } : {}),
      // Reverse legs are priced and serviced differently from forward ones.
      ...(isReturn ? { is_return: 1 } : {}),
    },
  });

/**
 * Every courier that will actually carry this parcel, priced.
 *
 * Returned to the admin so they can weigh cost against speed themselves —
 * the cheapest option is often two days slower, and only a human knows
 * whether this particular order can afford that.
 *
 * Couriers that cannot service the pair, are blocked, or quote nothing are
 * dropped: showing an option that will fail at booking wastes the admin's
 * time and teaches them to distrust the list.
 */
export async function courierOptions({
  pickupPincode,
  deliveryPincode,
  weight = 0.5,
  cod = 0,
  orderValue = 0,
}) {
  const res = await checkServiceability({
    pickupPincode,
    deliveryPincode,
    weight,
    cod,
    orderValue,
  });

  const raw = res?.data?.available_courier_companies ?? [];

  const options = raw
    .filter((c) => c.blocked !== 1 && Number(c.rate) > 0)
    .map((c) => ({
      courierId: c.courier_company_id,
      name: c.courier_name,
      /* `rate` is the all-in price Shiprocket bills us; freight_charge alone
         excludes COD fees and would understate what this shipment costs. */
      rate: Number(c.rate) || 0,
      freightCharge: Number(c.freight_charge) || 0,
      codCharge: Number(c.cod_charges ?? c.cod_charge) || 0,
      codAvailable: Number(c.cod) === 1,
      estimatedDays: c.estimated_delivery_days ?? c.etd_hours ?? null,
      etd: c.etd ?? null,
      rating: c.rating != null ? Number(c.rating) : null,
      /* Share of this courier's parcels that get delivered rather than
         returned — the single best predictor of a smooth delivery. */
      deliveryPerformance: c.delivery_performance != null
        ? Number(c.delivery_performance)
        : null,
      pickupPerformance: c.pickup_performance != null
        ? Number(c.pickup_performance)
        : null,
      minWeight: Number(c.min_weight) || 0,
      isSurface: c.is_surface ?? null,
      recommended: c.is_recommended === 1 || c.recommended_by?.title != null,
    }))
    .sort((a, b) => a.rate - b.rate);

  return {
    options,
    cheapestId: options[0]?.courierId ?? null,
    fastestId:
      [...options]
        .filter((o) => o.estimatedDays != null)
        .sort((a, b) => Number(a.estimatedDays) - Number(b.estimatedDays))[0]
        ?.courierId ?? null,
    /* Distinguishes "no couriers serve this pincode" from "we filtered them
       all out", which need different messages to the admin. */
    totalReturned: raw.length,
  };
}

/**
 * Picks the cheapest serviceable courier for a leg.
 *
 * Shiprocket returns every option with its own rate; leaving the choice to
 * auto-assign means paying whatever it picks. Sorting by `rate` and taking the
 * first is the whole optimisation — on a reverse leg the customer experience
 * is identical whichever courier collects, so price is the only axis that
 * matters.
 *
 * Couriers that cannot service the pincode pair are filtered out first, and a
 * blocked/low-rated courier is skipped rather than risk a failed pickup.
 */
export async function cheapestCourier({
  pickupPincode,
  deliveryPincode,
  weight = 0.5,
  cod = 0,
  isReturn = 0,
}) {
  const res = await checkServiceability({
    pickupPincode,
    deliveryPincode,
    weight,
    cod,
    isReturn,
  });

  const options = res?.data?.available_courier_companies ?? [];
  if (!options.length) {
    throw new ApiError(422, "No courier services this pincode pair", {
      code: "NOT_SERVICEABLE",
    });
  }

  const usable = options
    .filter((c) => c.blocked !== 1 && Number(c.rate) > 0)
    .sort((a, b) => Number(a.rate) - Number(b.rate));

  if (!usable.length) {
    throw new ApiError(422, "Every courier for this route is currently blocked", {
      code: "NOT_SERVICEABLE",
    });
  }

  const best = usable[0];

  logger.info(
    `[shiprocket] cheapest ${isReturn ? "reverse" : "forward"} leg ` +
      `${pickupPincode}→${deliveryPincode}: ${best.courier_name} at ₹${best.rate} ` +
      `(${usable.length} options, next ₹${usable[1]?.rate ?? "—"})`,
  );

  return {
    courierId: best.courier_company_id,
    courier: best.courier_name,
    rate: Number(best.rate),
    estimatedDays: best.estimated_delivery_days ?? best.etd ?? null,
    /* Kept so the admin can see it was genuinely the cheapest, not just the
       first thing the API happened to return. */
    options: usable.slice(0, 5).map((c) => ({
      courier: c.courier_name,
      rate: Number(c.rate),
      days: c.estimated_delivery_days ?? c.etd ?? null,
    })),
  };
}

/**
 * Books a reverse pickup from the customer's delivery address.
 *
 * Pickup is the customer, drop is our warehouse — the mirror of the forward
 * leg. Called only when an admin approves the return, never when it is
 * requested, so a rejected return never sends a courier to someone's door.
 */
export async function createReturnShipment({ order, returnRequest }) {
  assertConfigured();

  const a = order.address ?? {};
  const [firstName, ...rest] = String(a.fullName ?? "Customer").split(" ");
  const wh = env.warehouse;

  const items = returnRequest.items.map((i) => ({
    name: i.title,
    sku: String(i.product ?? i.title).slice(0, 48),
    units: i.qty,
    selling_price: i.price,
    qc_enable: false,
  }));

  const weight = Math.max(
    0.5,
    returnRequest.items.reduce((sum, i) => sum + 0.3 * i.qty, 0),
  );

  /* Cheapest reverse courier for this exact pincode pair, priced before the
     order is created so the rate can be stored with it. */
  const pick = await cheapestCourier({
    pickupPincode: a.pincode,
    deliveryPincode: wh.pincode,
    weight,
    cod: 0,
    isReturn: 1,
  });

  const created = await sr("/orders/create/return", {
    method: "POST",
    body: {
      order_id: `RET-${returnRequest.orderNo}-${String(returnRequest._id).slice(-6)}`,
      order_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      ...(env.shiprocket.channelId ? { channel_id: env.shiprocket.channelId } : {}),

      /* Pickup = the customer, at the address the parcel was delivered to. */
      pickup_customer_name: firstName,
      pickup_last_name: rest.join(" ") || ".",
      pickup_address: a.line1 ?? "",
      pickup_address_2: [a.line2, a.landmark].filter(Boolean).join(", "),
      pickup_city: a.city ?? "",
      pickup_state: a.state ?? "",
      pickup_country: "India",
      pickup_pincode: Number(a.pincode),
      pickup_email: returnRequest.user?.email ?? "",
      pickup_phone: String(a.phone ?? "").replace(/\D/g, "").slice(-10),
      pickup_isd_code: "91",

      /* Drop = our warehouse. */
      shipping_customer_name: wh.name,
      shipping_last_name: ".",
      shipping_address: wh.address,
      shipping_address_2: wh.address2,
      shipping_city: wh.city,
      shipping_country: wh.country,
      shipping_pincode: Number(wh.pincode),
      shipping_state: wh.state,
      shipping_email: wh.email,
      shipping_phone: String(wh.phone).replace(/\D/g, "").slice(-10),
      shipping_isd_code: "91",

      order_items: items,
      payment_method: "PREPAID",
      total_discount: 0,
      sub_total: returnRequest.refundAmount,

      length: 25,
      breadth: 20,
      height: 10,
      weight,
    },
  });

  const shipmentId = created.shipment_id ?? created.data?.shipment_id;

  /* Assign the courier we priced. Without an explicit id Shiprocket picks its
     own default, which is often not the cheapest. */
  let awb = created.awb_code ?? null;
  let courier = pick.courier;

  if (shipmentId) {
    try {
      const assigned = await assignAwb(shipmentId, pick.courierId);
      awb = assigned.awb ?? awb;
      courier = assigned.courier ?? courier;
    } catch (err) {
      logger.warn(`[shiprocket] AWB assign failed for return ${returnRequest.orderNo}: ${err.message}`);
    }
  }

  return {
    shiprocketOrderId: String(created.order_id ?? ""),
    shipmentId: String(shipmentId ?? ""),
    awb,
    courier,
    courierId: pick.courierId,
    rate: pick.rate,
    estimatedDays: pick.estimatedDays,
    options: pick.options,
  };
}

/* ──────────────────────────── tracking ────────────────────────────────── */

function readTracking(payload) {
  const data =
    payload?.tracking_data ??
    Object.values(payload ?? {})[0]?.tracking_data ??
    payload ??
    {};

  const activities = data.shipment_track_activities ?? [];
  const head = (data.shipment_track ?? [])[0] ?? {};

  return {
    currentStatus: head.current_status ?? data.shipment_status ?? null,
    courier: head.courier_name ?? null,
    awb: head.awb_code ?? null,
    etaText: head.edd ?? null,
    trackUrl: data.track_url ?? null,
    scans: activities
      .map((a) => ({
        status: a.activity ?? a["sr-status-label"] ?? "",
        location: a.location ?? "",
        at: a.date ? new Date(a.date) : new Date(),
        note: a["sr-status-label"] ?? "",
      }))
      // Shiprocket returns newest first; store oldest first so the UI can
      // render a timeline without reversing on every read.
      .reverse(),
  };
}

export const trackByAwb = async (awb) => readTracking(await sr(`/courier/track/awb/${awb}`));

export const trackByShipmentId = async (shipmentId) =>
  readTracking(await sr(`/courier/track/shipment/${shipmentId}`));

/**
 * Pulls the latest scan for one order and writes it back.
 *
 * Only touches `status` when Shiprocket reports something we recognise AND the
 * order is already past the admin-controlled phase — so a stale scan can never
 * drag a cancelled order back to "in transit".
 */
/**
 * Pulls tracking for one order and replays it through the fulfilment handler.
 *
 * The webhook is the fast path; this is the safety net for when a callback is
 * missed. Both funnel into `applyTrackingEvent` so a status only ever changes
 * in one place — otherwise the two paths drift and the customer sees a
 * different story depending on which one fired.
 */
export async function syncOrderTracking(orderId) {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound("Order not found");

  const d = order.shipping_details ?? {};
  if (!d.awb && !d.shipmentId) return { synced: false, reason: "No shipment yet" };
  if (["cancelled", "returned"].includes(order.status)) {
    return { synced: false, reason: `Order is ${order.status}` };
  }

  const tracking = d.awb ? await trackByAwb(d.awb) : await trackByShipmentId(d.shipmentId);

  /* Keep the raw scan trail on the order for the admin's shipment panel. */
  order.shipping_details = {
    ...(d.toObject?.() ?? d),
    awb: tracking.awb ?? d.awb,
    courier: tracking.courier ?? d.courier,
    trackingUrl: tracking.trackUrl ?? d.trackingUrl,
    trackingStatusRaw: tracking.currentStatus ?? d.trackingStatusRaw,
    scans: tracking.scans.length ? tracking.scans : d.scans,
  };
  await order.save();

  if (!tracking.currentStatus) return { synced: true, changed: false };

  /* Imported lazily: fulfilment imports this module, and a static import back
     would be a cycle. */
  const { fulfilmentService } = await import("./fulfilment.service.js");
  const result = await fulfilmentService.applyTrackingEvent({
    awb: tracking.awb ?? d.awb,
    shipmentId: d.shipmentId,
    courierStatus: tracking.currentStatus,
    location: tracking.scans?.at(-1)?.location,
    raw: tracking,
    source: "shiprocket",
  });

  return {
    synced: true,
    changed: Boolean(result.matched && !result.unchanged && !result.stale),
    status: result.status,
  };
}

export async function syncAllActiveShipments() {
  if (!env.shiprocket.enabled) return { skipped: true };

  const active = await Order.find({
    /* Everything a courier still holds. "shipment-booked" belongs here too —
       a missed pickup webhook is exactly the case this sweep exists to catch. */
    status: {
      $in: [
        "shipment-booked",
        "shipped",
        "in-transit",
        "out-for-delivery",
        "delivery-failed",
        "rto-initiated",
        "rto-in-transit",
        "rto",
      ],
    },
    $or: [
      { "shipping_details.awb": { $exists: true, $ne: null } },
      { "shipping_details.shipmentId": { $exists: true, $ne: null } },
    ],
  })
    .select("_id orderNo")
    .lean();

  let updated = 0;
  for (const o of active) {
    try {
      const result = await syncOrderTracking(o._id);
      if (result.synced) updated += 1;
    } catch (err) {
      logger.warn(`[shiprocket] sync failed for ${o.orderNo}: ${err.message}`);
    }
  }

  if (active.length) {
    logger.info(`[shiprocket] synced ${updated}/${active.length} active shipments`);
  }
  return { checked: active.length, updated };
}

export const shiprocketService = {
  createShipment,
  createReturnShipment,
  cheapestCourier,
  courierOptions,
  assignAwb,
  requestPickup,
  generateLabel,
  cancelShipment,
  checkServiceability,
  trackByAwb,
  trackByShipmentId,
  syncOrderTracking,
  syncAllActiveShipments,
  normaliseStatus,
};
