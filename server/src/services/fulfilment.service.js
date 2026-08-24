import { Order, ADMIN_CONTROLLED, COURIER_OWNED } from "../models/Order.js";
import { Shipment } from "../models/Shipment.js";
import { ShipmentEvent } from "../models/ShipmentEvent.js";
import { Product } from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";
import { mailer } from "./mailer.js";
import { shiprocketService } from "./shiprocket.service.js";

/**
 * Order fulfilment — the admin's half of the journey, and the handover.
 *
 * The whole module rests on one rule: we own the order until a courier has it,
 * and the courier owns it afterwards. Everything the admin can press lives
 * before the handover; everything after it arrives as a tracking event. That
 * boundary is what keeps the customer's tracking page honest.
 */

/* ─────────────────────────── status history ───────────────────────────── */

/**
 * Records a transition. Never throws into the caller: losing an audit line is
 * bad, but failing the shipment that produced it is worse.
 */
export async function recordEvent({
  order,
  shipment,
  status,
  courierStatus,
  source = "system",
  note,
  location,
  actorName,
  raw,
}) {
  try {
    return await ShipmentEvent.create({
      order: order._id ?? order,
      orderNo: order.orderNo,
      shipment: shipment?._id,
      status,
      courierStatus,
      source,
      note,
      location,
      actorName,
      raw,
      at: new Date(),
    });
  } catch (err) {
    logger.error(`[fulfilment] could not record "${status}": ${err.message}`);
    return null;
  }
}

/** Full timeline for an order, newest last. */
export async function getTimeline(orderId) {
  return ShipmentEvent.find({ order: orderId }).sort({ at: 1 }).lean();
}

/* ──────────────────────────── admin actions ───────────────────────────── */

/** Moves a new order into the fulfilment queue. */
export async function acceptOrder({ orderId, admin, note }) {
  const order = await Order.findById(orderId).populate("user", "name email");
  if (!order) throw ApiError.notFound("Order not found");

  if (order.status === "cancelled") {
    throw ApiError.badRequest("This order was cancelled and cannot be accepted.");
  }
  if (order.status !== "placed") {
    throw ApiError.badRequest(
      order.acceptedAt
        ? "This order has already been accepted."
        : `An order can only be accepted while it is new — this one is ${order.status}.`,
    );
  }

  order.status = "confirmed";
  order.acceptedAt = new Date();
  order.acceptedBy = admin?._id;
  order.acceptedByName = admin?.name;
  order.timeline.push({ status: "confirmed", at: new Date(), note: note ?? "Order accepted" });
  await order.save();

  await recordEvent({
    order,
    status: "confirmed",
    source: "admin",
    actorName: admin?.name,
    note: note ?? "Order accepted",
  });

  logger.info(`[fulfilment] ${order.orderNo} accepted by ${admin?.name ?? "admin"}`);
  return { order };
}

/**
 * Marks an order packed and freezes the measured parcel.
 *
 * Dimensions are required rather than defaulted: couriers bill on volumetric
 * weight, and a default that quietly under-declares turns into a billing
 * adjustment weeks later that nobody can trace back to this moment.
 */
export async function packOrder({ orderId, admin, parcel, note }) {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound("Order not found");

  if (!["confirmed", "packed"].includes(order.status)) {
    throw ApiError.badRequest(
      order.status === "placed"
        ? "Accept the order before packing it."
        : `This order is ${order.status} and can no longer be packed.`,
    );
  }

  const p = {
    weightKg: Number(parcel?.weightKg),
    lengthCm: Number(parcel?.lengthCm),
    breadthCm: Number(parcel?.breadthCm),
    heightCm: Number(parcel?.heightCm),
  };

  for (const [key, value] of Object.entries(p)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw ApiError.badRequest(`Enter a valid ${key.replace(/([A-Z])/g, " $1").toLowerCase()}.`);
    }
  }

  const repack = order.status === "packed";
  order.parcel = p;
  order.status = "packed";
  order.packedAt = order.packedAt ?? new Date();
  order.packedBy = admin?._id;
  order.packedByName = admin?.name;
  if (!repack) {
    order.timeline.push({ status: "packed", at: new Date(), note: note ?? "Order packed" });
  }
  await order.save();

  await recordEvent({
    order,
    status: "packed",
    source: "admin",
    actorName: admin?.name,
    note: repack
      ? `Parcel re-measured: ${p.weightKg}kg, ${p.lengthCm}×${p.breadthCm}×${p.heightCm}cm`
      : `Packed: ${p.weightKg}kg, ${p.lengthCm}×${p.breadthCm}×${p.heightCm}cm`,
  });

  return { order };
}

/* ─────────────────────────── courier options ──────────────────────────── */

/** Quotes every courier that will carry this specific parcel. */
export async function getCourierOptions(orderId) {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound("Order not found");

  if (!env.shiprocket.enabled) {
    throw ApiError.badRequest(
      "Shiprocket is not configured. Add SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD to the server .env.",
    );
  }
  if (order.status !== "packed") {
    throw ApiError.badRequest("Mark the order packed before booking a courier.");
  }

  const pin = order.address?.pincode;
  if (!pin) throw ApiError.badRequest("This order has no delivery pincode.");
  if (!env.warehouse.pincode) {
    throw ApiError.badRequest("Set WAREHOUSE_PINCODE in the server .env before booking.");
  }

  const cod = order.payment?.method === "cod" ? order.total : 0;

  const result = await shiprocketService.courierOptions({
    pickupPincode: env.warehouse.pincode,
    deliveryPincode: pin,
    weight: order.parcel?.weightKg ?? 0.5,
    cod: cod > 0 ? 1 : 0,
    orderValue: order.total,
  });

  return {
    ...result,
    parcel: order.parcel,
    codAmount: cod,
    from: env.warehouse.pincode,
    to: pin,
  };
}

/* ──────────────────────────── booking a parcel ─────────────────────────── */

/**
 * Books one parcel with the courier the admin chose.
 *
 * Written to be safe to retry. A booking is four calls to Shiprocket — create
 * order, assign AWB, request pickup, read back — and a timeout can leave any
 * of them half-done. So the Shipment row is created FIRST, in "booking", and
 * a unique index on the order means a second attempt cannot start a parallel
 * booking. Each Shiprocket step is skipped if its result is already stored,
 * which makes a retry resume rather than duplicate.
 */
export async function bookShipment({ orderId, courierId, admin }) {
  const order = await Order.findById(orderId).populate("user", "name email phone");
  if (!order) throw ApiError.notFound("Order not found");

  if (order.status === "cancelled") {
    throw ApiError.badRequest("This order was cancelled.");
  }
  if (!["packed", "shipment-booked"].includes(order.status)) {
    throw ApiError.badRequest(
      order.status === "placed" || order.status === "confirmed"
        ? "Mark the order packed before booking a shipment."
        : "This parcel is already with the courier.",
    );
  }

  /* Claim the order. The partial unique index rejects a second live shipment,
     so two admins pressing Book at once cannot both proceed. */
  let shipment = await Shipment.findOne({
    order: order._id,
    status: { $nin: ["cancelled", "failed"] },
  });

  if (shipment?.awb) {
    /* Already booked — hand back what exists rather than consigning twice. */
    return { shipment, order, alreadyBooked: true };
  }

  if (!shipment) {
    try {
      shipment = await Shipment.create({
        order: order._id,
        orderNo: order.orderNo,
        status: "booking",
        weightKg: order.parcel?.weightKg,
        lengthCm: order.parcel?.lengthCm,
        breadthCm: order.parcel?.breadthCm,
        heightCm: order.parcel?.heightCm,
        codAmount: order.payment?.method === "cod" ? order.total : 0,
        bookedBy: admin?._id,
        bookedByName: admin?.name,
      });
    } catch (err) {
      if (err.code === 11000) {
        throw ApiError.badRequest("A booking for this order is already in progress.");
      }
      throw err;
    }
  }

  try {
    /* 1. The order must exist on Shiprocket before an AWB can attach to it.
          Reuse the id if a previous attempt already created it. */
    if (!shipment.shiprocketOrderId) {
      const created = await shiprocketService.createShipment(order._id, order.user);
      shipment.shiprocketOrderId = String(created.shiprocketOrderId ?? "");
      shipment.shipmentId = String(created.shipmentId ?? "");
      await shipment.save();
    }

    if (!shipment.shipmentId) {
      throw new Error("Shiprocket did not return a shipment id for this order.");
    }

    /* 2. Assign the chosen courier and take the AWB. */
    if (!shipment.awb) {
      const assigned = await shiprocketService.assignAwb(shipment.shipmentId, courierId);
      if (!assigned.awb) {
        throw new Error(
          "The courier did not return a tracking number. It may have run out of capacity for this pincode — try another courier.",
        );
      }
      shipment.awb = String(assigned.awb);
      shipment.courierName = assigned.courier ?? null;
      shipment.courierId = courierId ?? null;
      shipment.shippingCharge = Number(assigned.freightCharge) || 0;
      await shipment.save();
    }

    /* 3. Ask for a pickup. A failure here is recoverable — the consignment
          exists and the admin can re-request — so it must not undo the AWB. */
    try {
      await shiprocketService.requestPickup(shipment.shipmentId);
      shipment.pickup = { requested: true, scheduledAt: new Date() };
    } catch (err) {
      shipment.pickup = { requested: false, failureReason: err.message };
      logger.warn(`[fulfilment] pickup request failed for ${order.orderNo}: ${err.message}`);
    }

    shipment.status = "booked";
    shipment.bookedAt = new Date();
    shipment.trackingUrl = `https://shiprocket.co/tracking/${shipment.awb}`;
    await shipment.save();

    /* The order is booked, NOT shipped. "shipped" is a pickup scan. */
    order.status = "shipment-booked";
    order.shipment = shipment._id;
    order.shipping_details = {
      ...(order.shipping_details?.toObject?.() ?? order.shipping_details ?? {}),
      provider: "shiprocket",
      shiprocketOrderId: shipment.shiprocketOrderId,
      shipmentId: shipment.shipmentId,
      awb: shipment.awb,
      courier: shipment.courierName,
      trackingUrl: shipment.trackingUrl,
      trackingStatus: "shipment-booked",
      trackingUpdatedAt: new Date(),
    };
    order.timeline.push({
      status: "shipment-booked",
      at: new Date(),
      note: `${shipment.courierName ?? "Courier"} · AWB ${shipment.awb}`,
    });
    await order.save();

    await recordEvent({
      order,
      shipment,
      status: "shipment-booked",
      source: "admin",
      actorName: admin?.name,
      note: `Booked with ${shipment.courierName ?? "courier"} · AWB ${shipment.awb}`,
    });

    logger.success(
      `[fulfilment] ${order.orderNo} booked with ${shipment.courierName} (AWB ${shipment.awb})`,
    );

    mailer
      .sendShipmentBookedEmail({
        to: order.user.email,
        order,
        shipment,
      })
      .catch((e) => logger.error("[fulfilment] booking email failed:", e.message));

    return { shipment, order };
  } catch (err) {
    /* Keep the row so a retry can resume from whatever succeeded, but let the
       partial index free up if nothing was consigned. */
    shipment.failureReason = err.message;
    if (!shipment.awb && !shipment.shiprocketOrderId) {
      shipment.status = "failed";
    }
    await shipment.save();

    await recordEvent({
      order,
      shipment,
      status: "booking-failed",
      source: "system",
      note: err.message,
    });

    logger.error(`[fulfilment] booking failed for ${order.orderNo}: ${err.message}`);
    throw ApiError.badRequest(`Unable to book shipment. ${err.message}`);
  }
}

/* ───────────────────────────── tracking in ────────────────────────────── */

/** Shipment-level status for each of our order statuses. */
const SHIPMENT_STATUS_FOR = {
  shipped: "picked-up",
  "in-transit": "in-transit",
  "out-for-delivery": "out-for-delivery",
  delivered: "delivered",
  "delivery-failed": "delivery-failed",
  "rto-initiated": "rto-initiated",
  "rto-in-transit": "rto-in-transit",
  "rto-delivered": "rto-delivered",
  cancelled: "cancelled",
};

/**
 * How far along a status is, so a late or out-of-order scan cannot rewind an
 * order. Couriers do re-send old events, and a parcel that reads "in transit"
 * an hour after "delivered" reads as a bug to the customer.
 */
const PROGRESS = {
  "shipment-booked": 1,
  shipped: 2,
  "in-transit": 3,
  "out-for-delivery": 4,
  delivered: 5,
};

/**
 * Applies one courier tracking event to an order.
 *
 * This is the ONLY path by which an order becomes shipped, in transit, out for
 * delivery or delivered. Nothing in the admin panel can set those, which is
 * what makes the customer's tracking page trustworthy: every tick on it
 * corresponds to something a courier actually scanned.
 *
 * Safe to call repeatedly with the same event — webhooks are retried, and the
 * polling sweep replays whatever tracking currently says.
 */
export async function applyTrackingEvent({
  awb,
  shipmentId,
  courierStatus,
  status,
  location,
  at,
  raw,
  source = "shiprocket",
}) {
  const mapped = status ?? shiprocketService.normaliseStatus(courierStatus);
  if (!mapped) {
    logger.warn(`[tracking] unmapped courier status "${courierStatus}" for AWB ${awb}`);
    return { matched: false, reason: "unmapped-status" };
  }

  const shipment = await Shipment.findOne(
    awb ? { awb: String(awb) } : { shipmentId: String(shipmentId) },
  );
  if (!shipment) return { matched: false, reason: "unknown-shipment" };

  const order = await Order.findById(shipment.order).populate("user", "name email phone");
  if (!order) return { matched: false, reason: "unknown-order" };

  /* Ignore a repeat of the status we already hold, but still let a genuinely
     new courier wording through to the history. */
  const duplicate =
    order.status === mapped && shipment.lastCourierStatus === courierStatus;
  if (duplicate) return { matched: true, unchanged: true, order, shipment };

  /* Do not walk backwards. RTO and failure states are excluded from the
     ladder because they legitimately interrupt it. */
  const forwardOnly = PROGRESS[mapped] != null && PROGRESS[order.status] != null;
  if (forwardOnly && PROGRESS[mapped] < PROGRESS[order.status]) {
    logger.info(
      `[tracking] ignoring stale "${mapped}" for ${order.orderNo} (already ${order.status})`,
    );
    await recordEvent({
      order,
      shipment,
      status: mapped,
      courierStatus,
      source,
      location,
      note: "Out-of-order scan, order status left unchanged",
      raw,
    });
    return { matched: true, stale: true, order, shipment };
  }

  const when = at ? new Date(at) : new Date();

  shipment.status = SHIPMENT_STATUS_FOR[mapped] ?? shipment.status;
  shipment.lastCourierStatus = courierStatus;
  shipment.lastSyncedAt = new Date();
  if (mapped === "shipped" && !shipment.pickedUpAt) shipment.pickedUpAt = when;
  if (mapped === "delivered" && !shipment.deliveredAt) shipment.deliveredAt = when;
  if (mapped.startsWith("rto") && !shipment.rtoAt) shipment.rtoAt = when;
  await shipment.save();

  const previous = order.status;
  order.status = mapped;
  order.shipping_details = {
    ...(order.shipping_details?.toObject?.() ?? order.shipping_details ?? {}),
    trackingStatus: mapped,
    trackingUpdatedAt: new Date(),
    courier: shipment.courierName ?? order.shipping_details?.courier,
    awb: shipment.awb ?? order.shipping_details?.awb,
  };
  order.timeline.push({ status: mapped, at: when, note: courierStatus ?? "" });

  /* Cash on delivery is collected at the door, so delivery is also payment. */
  if (mapped === "delivered" && order.payment?.method === "cod" && order.payment.status !== "paid") {
    order.payment.status = "paid";
    order.payment.paidAt = when;
  }

  await order.save();

  await recordEvent({
    order,
    shipment,
    status: mapped,
    courierStatus,
    source,
    location,
    raw,
    note: location ? `At ${location}` : undefined,
  });

  logger.info(`[tracking] ${order.orderNo}: ${previous} → ${mapped}`);

  await notifyCustomer({ order, shipment, status: mapped });

  /* A parcel that came back is stock we never sold — count it in once. */
  if (mapped === "rto-delivered" && !shipment.rtoRestockedAt) {
    await restockFromRto({ order, shipment });
  }

  return { matched: true, order, shipment, status: mapped, previous };
}

/**
 * Emails the customer on the transitions they care about.
 *
 * Not every scan deserves a message — a parcel moving between two hubs is
 * noise, and mailing it trains people to ignore the ones that matter.
 */
async function notifyCustomer({ order, shipment, status }) {
  const to = order.user?.email;
  if (!to) return;

  const tracking = {
    courier: shipment.courierName,
    awb: shipment.awb,
    trackingUrl: `${env.siteUrl}/orders/${order.orderNo}/track`,
    etaText: shipment.estimatedDeliveryAt
      ? new Date(shipment.estimatedDeliveryAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
        })
      : null,
  };

  const send = (fn) => fn.catch((e) => logger.error(`[tracking] email failed: ${e.message}`));

  if (status === "shipped") {
    send(mailer.sendOrderShippedEmail({ to, order, tracking }));
  } else if (status === "out-for-delivery") {
    send(mailer.sendOutForDeliveryEmail({ to, order, tracking }));
  } else if (status === "delivered") {
    send(mailer.sendOrderDeliveredEmail({ to, order, customerName: order.user?.name }));
  } else if (status === "delivery-failed") {
    send(mailer.sendDeliveryFailedEmail({ to, order, tracking }));
  }
}

/**
 * Puts an RTO parcel's stock back on the shelf.
 *
 * Deliberately NOT a customer return: nobody asked for a refund, the goods
 * never changed hands, and filing it as a return would inflate the return rate
 * and pay out money that was never collected. For a prepaid order the refund
 * is a separate, human decision.
 */
async function restockFromRto({ order, shipment }) {
  try {
    await Promise.all(
      order.items.map((i) =>
        Product.updateOne({ _id: i.product }, { $inc: { stock: i.qty }, inStock: true }),
      ),
    );

    shipment.rtoRestockedAt = new Date();
    await shipment.save();

    await recordEvent({
      order,
      shipment,
      status: "rto-restocked",
      source: "system",
      note: `${order.items.reduce((n, i) => n + i.qty, 0)} unit(s) returned to stock`,
    });

    logger.success(`[tracking] ${order.orderNo}: RTO stock counted back in`);
  } catch (err) {
    logger.error(`[tracking] RTO restock failed for ${order.orderNo}: ${err.message}`);
  }
}

/**
 * Entry point for Shiprocket's webhook.
 *
 * Shiprocket posts a flattish body whose field names vary a little between
 * account types, so each value is read from a few plausible keys rather than
 * assuming one shape.
 */
export async function handleShiprocketWebhook(body) {
  const awb = body?.awb ?? body?.awb_code ?? body?.data?.awb;
  const shipmentId = body?.shipment_id ?? body?.data?.shipment_id;
  const courierStatus =
    body?.current_status ?? body?.status ?? body?.shipment_status ?? body?.data?.current_status;

  if (!awb && !shipmentId) {
    return { matched: false, reason: "no-identifier" };
  }

  return applyTrackingEvent({
    awb,
    shipmentId,
    courierStatus,
    location: body?.location ?? body?.current_location ?? body?.data?.location,
    at: body?.current_timestamp ?? body?.status_time ?? body?.timestamp,
    raw: body,
    source: "shiprocket",
  });
}

export const fulfilmentService = {
  applyTrackingEvent,
  handleShiprocketWebhook,
  recordEvent,
  getTimeline,
  acceptOrder,
  packOrder,
  getCourierOptions,
  bookShipment,
};
