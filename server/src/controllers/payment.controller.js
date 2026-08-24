import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, paginated } from "../utils/response.js";
import { readPaging } from "../utils/pagination.js";
import { razorpayService } from "../services/razorpay.service.js";
import { Order } from "../models/Order.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";

/* ─────────────────────────── customer ─────────────────────────────────── */

/** Creates the Razorpay order the checkout widget opens against. */
export const createPaymentOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.body.orderId, user: req.user.id });
  if (!order) throw ApiError.notFound("Order not found");
  if (order.payment.status === "paid") throw ApiError.badRequest("This order is already paid");

  return ok(res, await razorpayService.createPaymentOrder({ order, user: req.user }));
});

/** Confirms a browser-reported success. Signature is verified server-side. */
export const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, razorpayOrderId, razorpayPaymentId, signature } = req.body;

  const order = await Order.findOne({ _id: orderId, user: req.user.id });
  if (!order) throw ApiError.notFound("Order not found");

  await razorpayService.verifyPaymentSignature({
    razorpayOrderId,
    razorpayPaymentId,
    signature,
  });

  order.payment.status = "paid";
  order.payment.reference = razorpayPaymentId;
  order.payment.paidAt = new Date();
  if (order.status === "placed") {
    order.status = "confirmed";
    order.timeline.push({ status: "confirmed", at: new Date(), note: "Payment received" });
  }
  await order.save();

  return ok(res, { paid: true, orderNo: order.orderNo, status: order.status });
});

/* ─────────────────────────── webhook ──────────────────────────────────── */

/**
 * Razorpay webhook.
 *
 * Uses the raw body captured by the route's express.raw() parser — re-encoding
 * a parsed object would change the bytes and break the HMAC.
 */
export const webhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  const raw = req.body instanceof Buffer ? req.body.toString("utf8") : JSON.stringify(req.body);

  if (!razorpayService.verifyWebhookSignature(raw, signature)) {
    logger.warn("[razorpay] webhook signature mismatch — ignored");
    // 200 so Razorpay stops retrying a request we will never accept.
    return res.status(200).json({ received: true, verified: false });
  }

  const event = JSON.parse(raw);
  const result = await razorpayService.handleWebhookEvent(event);

  // Keep the order's own payment state in step with the gateway.
  const entity = event.payload?.payment?.entity;
  if (entity?.notes?.orderNo) {
    const order = await Order.findOne({ orderNo: entity.notes.orderNo });
    if (order) {
      if (event.event === "payment.captured" && order.payment.status !== "paid") {
        order.payment.status = "paid";
        order.payment.reference = entity.id;
        order.payment.paidAt = new Date();
        if (order.status === "placed") {
          order.status = "confirmed";
          order.timeline.push({ status: "confirmed", at: new Date(), note: "Payment captured" });
        }
        await order.save();
      } else if (event.event === "payment.failed" && order.payment.status === "pending") {
        order.payment.status = "failed";
        await order.save();
      }
    }
  }

  return res.status(200).json({ received: true, ...result });
});

/* ───────────────────────── admin panel ────────────────────────────────── */

export const summary = asyncHandler(async (req, res) =>
  ok(res, await razorpayService.paymentSummary(req.query)),
);

export const series = asyncHandler(async (req, res) =>
  ok(res, await razorpayService.paymentSeries(Number(req.query.days) || 14)),
);

export const list = asyncHandler(async (req, res) => {
  const paging = readPaging(req.query, { defaultLimit: 25 });
  const { items, total } = await razorpayService.listPayments(req.query, paging);
  return paginated(res, items, { ...paging, total });
});

/** Manual refund from the payments panel. */
/** Balance, settlements and refund states for the finance screen. */
export const finance = asyncHandler(async (req, res) =>
  ok(res, await razorpayService.financeSummary()),
);

/** Pulls settlements from Razorpay on demand — the panel's refresh button. */
export const syncSettlements = asyncHandler(async (req, res) =>
  ok(res, await razorpayService.syncSettlements()),
);

export const refund = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.body.orderId);
  if (!order) throw ApiError.notFound("Order not found");

  const result = await razorpayService.refundOrderPayment({
    order,
    amount: req.body.amount,
    reason: req.body.reason ?? "Refunded by admin",
  });

  order.refund = {
    status: "processed",
    amount: result.amount,
    reference: result.refundId,
    processedAt: new Date(),
  };
  await order.save();

  return ok(res, result);
});
