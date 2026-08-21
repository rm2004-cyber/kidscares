import { CancellationRequest, CANCEL_REASONS } from "../models/CancellationRequest.js";
import { Order, CANCELLABLE } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Payment } from "../models/Payment.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";
import { razorpayService } from "./razorpay.service.js";
import { shiprocketService } from "./shiprocket.service.js";
import { mailer } from "./mailer.js";

export { CANCEL_REASONS };

/**
 * Cancellation flow.
 *
 * Two paths, decided by whether the parcel has left us:
 *
 *  • Before shipping  — nothing has moved, so the request is auto-approved,
 *                       stock returns, and any prepaid amount is refunded.
 *  • After shipping   — the courier already has it, so the request is queued
 *                       for an admin who must arrange an RTO first.
 *
 * The storefront hides the cancel button after shipping, but this is enforced
 * here too: a hidden button is a UI convenience, not a rule.
 */

/** What the chatbot needs to decide which options to show for an order. */
export async function getCancellationContext(userId, orderId) {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) throw ApiError.notFound("Order not found");

  const existing = await CancellationRequest.findOne({
    order: order._id,
    status: { $in: ["pending", "approved", "auto-approved"] },
  }).lean();

  return {
    orderNo: order.orderNo,
    status: order.status,
    statusLine: order.statusLine(),
    cancellable: order.isCancellable(),
    afterShipping: !CANCELLABLE.includes(order.status),
    alreadyRequested: Boolean(existing),
    existingRequest: existing
      ? { status: existing.status, reasonText: existing.reasonText, at: existing.createdAt }
      : null,
    isPrepaid: order.payment?.method !== "cod" && order.payment?.status === "paid",
    refundableAmount:
      order.payment?.method !== "cod" && order.payment?.status === "paid" ? order.total : 0,
    reasons: CANCEL_REASONS,
  };
}

async function restock(order) {
  await Promise.all(
    order.items.map((i) =>
      Product.updateOne({ _id: i.product }, { $inc: { stock: i.qty }, inStock: true }),
    ),
  );
}

/** Refund + cancellation email. Never allowed to throw into the caller. */
async function refundAndNotify(order, user, reasonText) {
  let refund = null;

  const prepaid = order.payment?.method !== "cod" && order.payment?.status === "paid";

  if (prepaid) {
    try {
      order.refund.status = "pending";
      await order.save();

      const result = await razorpayService.refundOrderPayment({
        order,
        amount: order.total,
        reason: reasonText || "Order cancelled",
      });

      order.refund = {
        status: "processed",
        amount: result.amount,
        reference: result.refundId,
        processedAt: new Date(),
      };
      refund = { amount: result.amount, reference: result.refundId };
    } catch (err) {
      // The order is still cancelled; the refund becomes an admin task.
      order.refund = {
        status: "failed",
        amount: order.total,
        failureReason: err.message,
      };
      logger.error(`[support] refund failed for ${order.orderNo}: ${err.message}`);
    }
    await order.save();
  }

  mailer
    .sendOrderCancelledEmail({
      to: user.email,
      order,
      reason: reasonText,
      refund,
    })
    .catch((e) => logger.error("[support] cancellation email failed:", e.message));

  return refund;
}

export async function requestCancellation({ user, orderId, reasonCode, reasonText, transcript }) {
  const order = await Order.findOne({ _id: orderId, user: user.id });
  if (!order) throw ApiError.notFound("Order not found");

  if (["cancelled", "returned"].includes(order.status)) {
    throw ApiError.badRequest("This order is already cancelled.");
  }
  if (order.status === "delivered") {
    throw ApiError.badRequest(
      "This order has been delivered. Please start a return instead.",
    );
  }

  const duplicate = await CancellationRequest.findOne({
    order: order._id,
    status: "pending",
  });
  if (duplicate) {
    throw ApiError.conflict("We already have a cancellation request for this order.");
  }

  const afterShipping = !CANCELLABLE.includes(order.status);
  const prepaid = order.payment?.method !== "cod" && order.payment?.status === "paid";

  const request = await CancellationRequest.create({
    order: order._id,
    orderNo: order.orderNo,
    user: user.id,
    reasonCode,
    reasonText: reasonText ?? "",
    orderStatusAtRequest: order.status,
    afterShipping,
    status: afterShipping ? "pending" : "auto-approved",
    refundRequired: prepaid,
    refundAmount: prepaid ? order.total : 0,
    transcript: transcript ?? [],
  });

  if (afterShipping) {
    // Nothing is cancelled yet — an admin has to arrange the RTO first.
    return {
      request,
      outcome: "review",
      message:
        "Your parcel has already left our warehouse, so we need to recall it from the courier. " +
        "Our team will confirm within 24 hours.",
    };
  }

  order.status = "cancelled";
  order.cancelledReason = reasonText || reasonCode;
  order.cancelledBy = "customer";
  order.cancelledAt = new Date();
  order.timeline.push({
    status: "cancelled",
    at: new Date(),
    note: reasonText || reasonCode,
  });
  await order.save();

  await restock(order);
  const refund = await refundAndNotify(order, user, reasonText || reasonCode);

  return {
    request,
    outcome: "cancelled",
    refund,
    message: prepaid
      ? `Cancelled. A refund of ₹${order.total.toLocaleString("en-IN")} has been initiated and usually reaches your account in 5–7 working days.`
      : "Cancelled. Nothing was charged, so there is no refund to process.",
  };
}

/* ─────────────────────────────── admin ────────────────────────────────── */

export async function listCancellations(query, { page, limit, skip }) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.q) {
    filter.orderNo = new RegExp(
      String(query.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
  }

  const [items, total] = await Promise.all([
    CancellationRequest.find(filter)
      .populate("user", "name email phone")
      .populate("order", "orderNo total status items address payment shipping_details createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CancellationRequest.countDocuments(filter),
  ]);

  return { items, total, page, limit };
}

export async function resolveCancellation({ admin, requestId, approve, note }) {
  const request = await CancellationRequest.findById(requestId).populate("user");
  if (!request) throw ApiError.notFound("Request not found");
  if (request.status !== "pending") {
    throw ApiError.badRequest("This request has already been handled.");
  }

  const order = await Order.findById(request.order);
  if (!order) throw ApiError.notFound("Order not found");

  request.handledBy = admin.id;
  request.handledAt = new Date();
  request.adminNote = note ?? "";

  if (!approve) {
    request.status = "rejected";
    await request.save();
    return { request, outcome: "rejected" };
  }

  request.status = "approved";
  await request.save();

  // The parcel is with the courier — recall it before cancelling our side.
  if (order.shipping_details?.awb) {
    try {
      await shiprocketService.cancelShipment(order.shipping_details.awb);
    } catch (err) {
      logger.warn(`[support] Shiprocket cancel failed for ${order.orderNo}: ${err.message}`);
    }
  }

  order.status = "cancelled";
  order.cancelledReason = request.reasonText || request.reasonCode;
  order.cancelledBy = "admin";
  order.cancelledAt = new Date();
  order.timeline.push({
    status: "cancelled",
    at: new Date(),
    note: note || request.reasonText || request.reasonCode,
  });
  await order.save();

  await restock(order);
  const refund = await refundAndNotify(order, request.user, request.reasonText);

  return { request, outcome: "cancelled", refund };
}

/** Manual retry for a refund that failed the first time. */
export async function retryRefund({ orderId }) {
  const order = await Order.findById(orderId).populate("user");
  if (!order) throw ApiError.notFound("Order not found");

  const payment = await Payment.findOne({ order: order._id, status: "captured" });
  if (!payment) throw ApiError.badRequest("No captured payment to refund");

  const result = await razorpayService.refundOrderPayment({
    order,
    amount: order.total - (order.refund?.amount ?? 0),
    reason: "Manual refund retry",
  });

  order.refund = {
    status: "processed",
    amount: result.amount,
    reference: result.refundId,
    processedAt: new Date(),
  };
  await order.save();

  mailer
    .sendRefundProcessedEmail({
      to: order.user.email,
      order,
      amount: result.amount,
      reference: result.refundId,
    })
    .catch((e) => logger.error("[support] refund email failed:", e.message));

  return { refund: result };
}

export const supportService = {
  getCancellationContext,
  requestCancellation,
  listCancellations,
  resolveCancellation,
  retryRefund,
  CANCEL_REASONS,
};
