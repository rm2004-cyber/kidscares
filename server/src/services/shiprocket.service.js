import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { ApiError } from "../utils/ApiError.js";
import { Order } from "../models/Order.js";

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
  "awb assigned": "shipped",
  "label generated": "shipped",
  "pickup scheduled": "shipped",
  "pickup generated": "shipped",
  "pickup queued": "shipped",
  "manifest generated": "shipped",
  shipped: "shipped",
  "picked up": "in-transit",
  "in transit": "in-transit",
  "reached at destination hub": "in-transit",
  "out for pickup": "in-transit",
  misroute: "in-transit",
  "out for delivery": "out-for-delivery",
  delivered: "delivered",
  "delivered to consignee": "delivered",
  cancelled: "cancelled",
  canceled: "cancelled",
  rto: "rto",
  "rto initiated": "rto",
  "rto in transit": "rto",
  "rto delivered": "returned",
  "return delivered": "returned",
  "undelivered": "in-transit",
};

export function normaliseStatus(raw) {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase();
  if (STATUS_MAP[key]) return STATUS_MAP[key];

  // Fall back to substring matching — Shiprocket adds new variants over time.
  for (const [needle, mapped] of Object.entries(STATUS_MAP)) {
    if (key.includes(needle)) return mapped;
  }
  return null;
}

/* ───────────────────────── shipment creation ──────────────────────────── */

/** Maps one of our orders onto Shiprocket's adhoc-order payload. */
function toShiprocketOrder(order, customer) {
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

    /* Shiprocket requires non-zero package dimensions; these are conservative
       defaults for apparel/toys and can be tuned per product later. */
    length: 25,
    breadth: 20,
    height: 10,
    weight: Math.max(0.5, order.items.reduce((s, i) => s + 0.3 * i.qty, 0)),
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
    body: toShiprocketOrder(order, customer),
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

export const checkServiceability = ({ pickupPincode, deliveryPincode, weight = 0.5, cod = 0 }) =>
  sr("/courier/serviceability/", {
    params: {
      pickup_postcode: pickupPincode,
      delivery_postcode: deliveryPincode,
      weight,
      cod,
    },
  });

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
export async function syncOrderTracking(orderId) {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound("Order not found");

  const d = order.shipping_details ?? {};
  if (!d.awb && !d.shipmentId) {
    return { synced: false, reason: "No shipment yet" };
  }
  if (["cancelled", "returned"].includes(order.status)) {
    return { synced: false, reason: `Order is ${order.status}` };
  }

  const tracking = d.awb
    ? await trackByAwb(d.awb)
    : await trackByShipmentId(d.shipmentId);

  const mapped = normaliseStatus(tracking.currentStatus);

  order.shipping_details = {
    ...(d.toObject?.() ?? d),
    awb: tracking.awb ?? d.awb,
    courier: tracking.courier ?? d.courier,
    trackingUrl: tracking.trackUrl ?? d.trackingUrl,
    trackingStatusRaw: tracking.currentStatus ?? d.trackingStatusRaw,
    trackingStatus: mapped ?? d.trackingStatus,
    trackingUpdatedAt: new Date(),
    scans: tracking.scans.length ? tracking.scans : d.scans,
  };

  if (mapped && mapped !== order.status) {
    order.status = mapped;
    order.timeline.push({
      status: mapped,
      at: new Date(),
      note: tracking.currentStatus ?? "Courier update",
    });
  }

  await order.save();

  return {
    synced: true,
    status: order.status,
    raw: tracking.currentStatus,
    scans: order.shipping_details.scans?.length ?? 0,
  };
}

/** Sweeps every in-flight order. Driven by a timer in the server entrypoint. */
export async function syncAllActiveShipments() {
  if (!env.shiprocket.enabled) return { skipped: true };

  const active = await Order.find({
    status: { $in: ["shipped", "in-transit", "out-for-delivery", "rto"] },
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
