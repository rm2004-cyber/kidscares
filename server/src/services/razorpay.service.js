import crypto from "node:crypto";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { ApiError } from "../utils/ApiError.js";
import { Payment } from "../models/Payment.js";
import { Order } from "../models/Order.js";
import { Settlement } from "../models/Settlement.js";

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

  return {
    refundId: refund.id,
    amount: toRupees(refund.amount),
    status: refund.status,
    speed: refund.speed_processed ?? refund.speed_requested,
  };
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
          fee: toRupees(entity.fee ?? 0),
          tax: toRupees(entity.tax ?? 0),
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

      /* Propagate to whatever asked for the refund so the admin panel shows a
         real bank outcome rather than "sent" forever. Imported lazily: the
         return service imports this module, and a static import would be a
         cycle. */
      const settled = entity.status === "processed";

      const { returnService } = await import("./return.service.js");
      const hit = await returnService.applyRefundWebhook({
        refundId: entity.id,
        status: entity.status,
        failureReason: entity.error_description ?? entity.notes?.reason,
      });

      /* Not a return — then it belongs to a cancellation, tracked on the order. */
      if (!hit.matched) {
        await Order.updateOne(
          { "refund.reference": entity.id },
          settled
            ? { $set: { "refund.status": "processed", "refund.processedAt": new Date() } }
            : {
                $set: {
                  "refund.status": "failed",
                  "refund.failureReason":
                    entity.error_description ?? "The bank rejected the refund",
                },
              },
        );
      }

      logger.info(`[razorpay] refund ${entity.id} → ${entity.status}`);
      break;
    }

    case "settlement.processed": {
      const st = event.payload?.settlement?.entity;
      if (st) {
        await Settlement.updateOne(
          { settlementId: st.id },
          {
            $set: {
              settlementId: st.id,
              amount: toRupees(st.amount),
              fees: toRupees(st.fees ?? 0),
              tax: toRupees(st.tax ?? 0),
              status: st.status ?? "processed",
              utr: st.utr,
              settledAt: st.created_at ? new Date(st.created_at * 1000) : new Date(),
              raw: st,
            },
          },
          { upsert: true },
        );
        logger.success(`[razorpay] settlement ${st.id} → ${toRupees(st.amount)}`);
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
/* ──────────────────────────── settlements ─────────────────────────────── */

/**
 * Pulls settlements from Razorpay into the local mirror.
 *
 * Upserts by settlement id, so running it twice is harmless and a settlement
 * that moves from created to processed is updated in place. Returns what it
 * touched rather than throwing when Razorpay is down — the finance screen must
 * still render from the mirror.
 */
export async function syncSettlements({ count = 100 } = {}) {
  if (!env.razorpay.enabled) {
    return { synced: 0, skipped: "Razorpay is not configured" };
  }

  try {
    const res = await rzp("/settlements", { params: { count } });
    const items = res?.items ?? [];

    await Promise.all(
      items.map((s) =>
        Settlement.updateOne(
          { settlementId: s.id },
          {
            $set: {
              settlementId: s.id,
              amount: toRupees(s.amount),
              fees: toRupees(s.fees ?? 0),
              tax: toRupees(s.tax ?? 0),
              status: s.status,
              utr: s.utr,
              settledAt: s.created_at ? new Date(s.created_at * 1000) : new Date(),
              raw: s,
            },
          },
          { upsert: true },
        ),
      ),
    );

    logger.info(`[razorpay] synced ${items.length} settlement(s)`);
    return { synced: items.length };
  } catch (err) {
    logger.warn(`[razorpay] settlement sync failed: ${err.message}`);
    return { synced: 0, error: err.message };
  }
}

/**
 * The money view for the admin finance screen.
 *
 * Razorpay's public API has no "account balance" for a payment-gateway
 * account — balance endpoints belong to RazorpayX, which this business does
 * not use. So the figure shown as awaiting settlement is DERIVED:
 *
 *   captured − refunded − Razorpay's fees − already settled
 *
 * It matches the Razorpay dashboard's "to be settled" closely, but it is our
 * arithmetic over our own mirror, not a number Razorpay handed us. Labelled
 * that way in the UI so nobody reconciles the books against a guess.
 */
export async function financeSummary() {
  const [payAgg, refundAgg, settleAgg, recent, lastSettlement] = await Promise.all([
    Payment.aggregate([
      {
        $group: {
          _id: null,
          captured: {
            $sum: {
              $cond: [
                { $in: ["$status", ["captured", "refunded", "partially_refunded"]] },
                "$amount",
                0,
              ],
            },
          },
          fees: { $sum: { $add: [{ $ifNull: ["$fee", 0] }, { $ifNull: ["$tax", 0] }] } },
          refunded: { $sum: "$refundedAmount" },
        },
      },
    ]),

    /* Refund states live inside each payment, so they need unwinding to count. */
    Payment.aggregate([
      { $unwind: "$refunds" },
      { $group: { _id: "$refunds.status", count: { $sum: 1 }, amount: { $sum: "$refunds.amount" } } },
    ]),

    Settlement.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$amount" } } },
    ]),

    Settlement.find().sort({ settledAt: -1 }).limit(8).lean(),
    Settlement.findOne({ status: "processed" }).sort({ settledAt: -1 }).lean(),
  ]);

  const p = payAgg[0] ?? { captured: 0, fees: 0, refunded: 0 };
  const pickSettle = (st) => settleAgg.find((x) => x._id === st) ?? { count: 0, amount: 0 };
  const settled = pickSettle("processed");
  const settlingNow = pickSettle("created");

  const refunds = { processed: 0, pending: 0, failed: 0, processedAmount: 0, pendingAmount: 0 };
  for (const r of refundAgg) {
    /* Razorpay uses "pending" while a refund is with the bank; some accounts
       also report "processing". Both mean the same thing to an admin. */
    const key = r._id === "processing" ? "pending" : r._id;
    if (key in refunds) {
      refunds[key] += r.count;
      if (key === "processed") refunds.processedAmount += r.amount;
      if (key === "pending") refunds.pendingAmount += r.amount;
    }
  }

  const raw = p.captured - p.refunded - p.fees - settled.amount - settlingNow.amount;

  /* Settlements can cover payments this system never recorded — a Razorpay
     account that traded before the site went live, or a mirror that missed a
     webhook. Then the subtraction goes negative and clamping it to zero would
     present a meaningless number as fact, so the estimate is withheld instead. */
  const reliable = raw >= 0;
  const awaiting = reliable ? raw : null;

  return {
    /* Derived, not fetched — see the note above this function. */
    awaitingSettlement: awaiting === null ? null : Math.round(awaiting * 100) / 100,
    /* False when settlements outrun the payments we know about — see above. */
    estimateReliable: reliable,
    settledTotal: Math.round(settled.amount * 100) / 100,
    settlingNow: Math.round(settlingNow.amount * 100) / 100,
    settlementCount: settled.count,
    gatewayFees: Math.round(p.fees * 100) / 100,
    capturedTotal: Math.round(p.captured * 100) / 100,
    refundedTotal: Math.round(p.refunded * 100) / 100,
    refunds,
    lastSettlement: lastSettlement
      ? { amount: lastSettlement.amount, utr: lastSettlement.utr, at: lastSettlement.settledAt }
      : null,
    recentSettlements: recent.map((s) => ({
      id: s.settlementId,
      amount: s.amount,
      fees: s.fees,
      tax: s.tax,
      status: s.status,
      utr: s.utr,
      at: s.settledAt,
    })),
    /* The UI greys the settlement cards out rather than showing zeroes as fact. */
    live: env.razorpay.enabled,
  };
}

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
  syncSettlements,
  financeSummary,
  verifyWebhookSignature,
  handleWebhookEvent,
  paymentSummary,
  listPayments,
  paymentSeries,
};
