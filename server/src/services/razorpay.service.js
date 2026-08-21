import crypto from "node:crypto";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { ApiError } from "../utils/ApiError.js";
import { Payment } from "../models/Payment.js";

/**
 * Razorpay integration.
 *
 * Talks to the REST API directly rather than pulling in the SDK — the surface
 * used here is four endpoints, and this keeps the dependency list smaller and
 * the error handling uniform with the rest of the codebase.
 */

const BASE = "https://api.razorpay.com/v1";

const authHeader = () =>
  `Basic ${Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString("base64")}`;

function assertConfigured() {
  if (!env.razorpay.enabled) {
    throw ApiError.badRequest(
      "Online payments are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the server .env.",
    );
  }
}

async function rzp(path, { method = "GET", body, params } = {}) {
  assertConfigured();

  const url = new URL(`${BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: authHeader(),
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const description = json?.error?.description ?? `Razorpay responded ${res.status}`;
    logger.error(`[razorpay] ${method} ${path} → ${res.status}: ${description}`);
    throw new ApiError(res.status === 400 ? 400 : 502, description, {
      code: "PAYMENT_GATEWAY_ERROR",
    });
  }

  return json;
}

/* Razorpay works in paise; the app works in rupees. Convert at the boundary
   only, so no rounding error can creep into stored totals. */
const toPaise = (rupees) => Math.round(Number(rupees) * 100);
const toRupees = (paise) => Math.round(Number(paise)) / 100;

/* ────────────────────────────── checkout ──────────────────────────────── */

/** Creates the Razorpay order the client-side checkout widget opens against. */
export async function createPaymentOrder({ order, user }) {
  const rzpOrder = await rzp("/orders", {
    method: "POST",
    body: {
      amount: toPaise(order.total),
      currency: "INR",
      receipt: order.orderNo,
      notes: {
        orderNo: order.orderNo,
        userId: String(user._id ?? user.id),
      },
    },
  });

  await Payment.create({
    order: order._id,
    orderNo: order.orderNo,
    user: user._id ?? user.id,
    razorpayOrderId: rzpOrder.id,
    amount: order.total,
    currency: "INR",
    status: "created",
    email: user.email,
    contact: user.phone,
  });

  return {
    keyId: env.razorpay.keyId,
    razorpayOrderId: rzpOrder.id,
    amount: order.total,
    amountInPaise: rzpOrder.amount,
    currency: rzpOrder.currency,
    orderNo: order.orderNo,
  };
}

/**
 * Confirms a payment the browser reported as successful.
 *
 * The HMAC check is the whole point: without it a client could POST any
 * payment id and mark an order paid. `timingSafeEqual` avoids leaking the
 * expected signature through comparison timing.
 */
export async function verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, signature }) {
  assertConfigured();

  const expected = crypto
    .createHmac("sha256", env.razorpay.keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature ?? ""));
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!valid) throw ApiError.badRequest("Payment could not be verified");

  const payment = await fetchPayment(razorpayPaymentId);

  await Payment.findOneAndUpdate(
    { razorpayOrderId },
    {
      razorpayPaymentId,
      razorpaySignature: signature,
      status: payment.status === "captured" ? "captured" : "authorized",
      method: payment.method,
      bank: payment.bank,
      wallet: payment.wallet,
      vpa: payment.vpa,
      cardLast4: payment.card?.last4,
      cardNetwork: payment.card?.network,
      email: payment.email,
      contact: payment.contact,
      capturedAt: payment.status === "captured" ? new Date() : undefined,
      raw: payment,
    },
    { new: true, upsert: true },
  );

  return { verified: true, payment };
}

export const fetchPayment = (paymentId) => rzp(`/payments/${paymentId}`);

/* ─────────────────────────────── refunds ──────────────────────────────── */

/**
 * Issues a refund against the payment that settled an order.
 *
 * `speed: "optimum"` lets Razorpay use the instant rail when the bank supports
 * it and fall back to the normal one otherwise — the customer gets the fastest
 * available refund without us having to detect capability per bank.
 */
export async function refundOrderPayment({ order, amount, reason = "Order cancelled" }) {
  const payment = await Payment.findOne({
    order: order._id,
    status: { $in: ["captured", "authorized", "partially_refunded"] },
  }).sort({ createdAt: -1 });

  if (!payment?.razorpayPaymentId) {
    throw ApiError.badRequest("No captured payment found for this order");
  }

  const refundable = payment.amount - (payment.refundedAmount ?? 0);
  const value = Math.min(amount ?? refundable, refundable);

  if (value <= 0) throw ApiError.badRequest("This payment has already been fully refunded");

  const refund = await rzp(`/payments/${payment.razorpayPaymentId}/refund`, {
    method: "POST",
    body: {
      amount: toPaise(value),
      speed: "optimum",
      notes: { orderNo: order.orderNo, reason },
    },
  });

  payment.refunds.push({
    refundId: refund.id,
    amount: toRupees(refund.amount),
    status: refund.status,
    speed: refund.speed_processed ?? refund.speed_requested,
    reason,
  });
  payment.refundedAmount = (payment.refundedAmount ?? 0) + toRupees(refund.amount);
  payment.status =
    payment.refundedAmount >= payment.amount ? "refunded" : "partially_refunded";
  await payment.save();

  logger.success(`[razorpay] refunded ₹${value} for ${order.orderNo} (${refund.id})`);

  return { refundId: refund.id, amount: toRupees(refund.amount), status: refund.status };
}

/* ────────────────────────────── webhooks ──────────────────────────────── */

/** Verifies the webhook body against the shared secret before trusting it. */
export function verifyWebhookSignature(rawBody, signature) {
  if (!env.razorpay.webhookSecret) return false;

  const expected = crypto
    .createHmac("sha256", env.razorpay.webhookSecret)
    .update(rawBody)
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature ?? ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Applies a webhook event.
 *
 * Written to be idempotent — Razorpay retries, and the browser callback may
 * have already recorded the same payment.
 */
export async function handleWebhookEvent(event) {
  const entity =
    event.payload?.payment?.entity ??
    event.payload?.refund?.entity ??
    null;
  if (!entity) return { handled: false };

  switch (event.event) {
    case "payment.captured":
    case "payment.authorized": {
      await Payment.findOneAndUpdate(
        { razorpayPaymentId: entity.id },
        {
          razorpayOrderId: entity.order_id,
          razorpayPaymentId: entity.id,
          amount: toRupees(entity.amount),
          status: event.event === "payment.captured" ? "captured" : "authorized",
          method: entity.method,
          bank: entity.bank,
          wallet: entity.wallet,
          vpa: entity.vpa,
          cardLast4: entity.card?.last4,
          cardNetwork: entity.card?.network,
          email: entity.email,
          contact: entity.contact,
          orderNo: entity.notes?.orderNo,
          capturedAt: event.event === "payment.captured" ? new Date() : undefined,
          raw: entity,
        },
        { upsert: true, new: true },
      );
      break;
    }

    case "payment.failed": {
      await Payment.findOneAndUpdate(
        { razorpayPaymentId: entity.id },
        {
          razorpayOrderId: entity.order_id,
          razorpayPaymentId: entity.id,
          amount: toRupees(entity.amount),
          status: "failed",
          method: entity.method,
          email: entity.email,
          contact: entity.contact,
          orderNo: entity.notes?.orderNo,
          errorCode: entity.error_code,
          errorDescription: entity.error_description,
          failedAt: new Date(),
          raw: entity,
        },
        { upsert: true, new: true },
      );
      break;
    }

    case "refund.processed":
    case "refund.failed": {
      const payment = await Payment.findOne({ razorpayPaymentId: entity.payment_id });
      if (payment) {
        const existing = payment.refunds.find((r) => r.refundId === entity.id);
        if (existing) existing.status = entity.status;
        else {
          payment.refunds.push({
            refundId: entity.id,
            amount: toRupees(entity.amount),
            status: entity.status,
          });
          payment.refundedAmount = (payment.refundedAmount ?? 0) + toRupees(entity.amount);
        }
        payment.status =
          payment.refundedAmount >= payment.amount ? "refunded" : "partially_refunded";
        await payment.save();
      }
      break;
    }

    default:
      return { handled: false, event: event.event };
  }

  return { handled: true, event: event.event };
}

/* ──────────────────────── admin payments panel ────────────────────────── */

/** Everything the panel needs, from our own mirror — no Razorpay call. */
export async function paymentSummary({ from, to } = {}) {
  const match = {};
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }

  const [byStatus, totals] = await Promise.all([
    Payment.aggregate([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$amount" } } },
    ]),
    Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          refunded: { $sum: "$refundedAmount" },
          attempts: { $sum: 1 },
        },
      },
    ]),
  ]);

  const pick = (status) => byStatus.find((s) => s._id === status) ?? { count: 0, amount: 0 };

  const captured = pick("captured");
  const failed = pick("failed");
  const refunded = pick("refunded");
  const partial = pick("partially_refunded");
  const created = pick("created");

  const collected = captured.amount + partial.amount;
  const refundedAmount = totals[0]?.refunded ?? 0;

  return {
    collected,
    net: Math.max(0, collected - refundedAmount),
    refundedAmount,
    counts: {
      captured: captured.count + partial.count,
      failed: failed.count,
      refunded: refunded.count + partial.count,
      pending: created.count,
      attempts: totals[0]?.attempts ?? 0,
    },
    failedAmount: failed.amount,
    /* Share of attempts that ended in money — the number worth watching. */
    successRate:
      totals[0]?.attempts > 0
        ? Math.round(((captured.count + partial.count) / totals[0].attempts) * 1000) / 10
        : 0,
  };
}

export async function listPayments(query, { page, limit, skip }) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.method) filter.method = query.method;
  if (query.q) {
    const rx = new RegExp(String(query.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { orderNo: rx },
      { razorpayPaymentId: rx },
      { email: rx },
      { contact: rx },
    ];
  }

  const [items, total] = await Promise.all([
    Payment.find(filter)
      .populate("user", "name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments(filter),
  ]);

  return { items, total, page, limit };
}

/** Daily collected vs refunded, for the panel's chart. */
export async function paymentSeries(days = 14) {
  const since = new Date(Date.now() - days * 86_400_000);

  const rows = await Payment.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        collected: {
          $sum: {
            $cond: [{ $in: ["$status", ["captured", "partially_refunded"]] }, "$amount", 0],
          },
        },
        refunded: { $sum: "$refundedAmount" },
        failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return rows.map((r) => ({
    label: r._id.slice(5),
    collected: r.collected,
    refunded: r.refunded,
    failed: r.failed,
  }));
}

export const razorpayService = {
  createPaymentOrder,
  verifyPaymentSignature,
  fetchPayment,
  refundOrderPayment,
  verifyWebhookSignature,
  handleWebhookEvent,
  paymentSummary,
  listPayments,
  paymentSeries,
};
