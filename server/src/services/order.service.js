import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";
import { Coupon } from "../models/Coupon.js";
import { Settings } from "../models/Settings.js";
import { ApiError } from "../utils/ApiError.js";
import { summarise } from "./cart.service.js";
import { mailer } from "./mailer.js";
import { computeTax } from "../utils/tax.js";
import { shiprocketService } from "./shiprocket.service.js";
import { ADMIN_CONTROLLED } from "../models/Order.js";
import { pdfService } from "./pdf.service.js";
import { logger } from "../config/logger.js";

/** KC + zero-padded daily counter, readable and unique. */
async function nextOrderNo() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const todayCount = await Order.countDocuments({ createdAt: { $gte: start } });
  const stamp = start.toISOString().slice(2, 10).replace(/-/g, "");
  return `KC${stamp}${String(todayCount + 1).padStart(3, "0")}`;
}

export async function placeOrder({ user, address, paymentMethod, deliverySpeed = "standard" }) {
  const cart = await Cart.findOne({ user: user.id });
  if (!cart || cart.lines.length === 0) throw ApiError.badRequest("Your bag is empty");

  const summary = await summarise(cart);
  if (summary.lines.length === 0) {
    throw ApiError.badRequest("The items in your bag are no longer available");
  }

  const settings = await Settings.getSite();
  if (paymentMethod === "cod") {
    if (!settings.codEnabled) throw ApiError.badRequest("Cash on delivery is unavailable");
    if (summary.totals.total > settings.codMaxOrderValue) {
      throw ApiError.badRequest(
        `Cash on delivery is only available up to ₹${settings.codMaxOrderValue.toLocaleString("en-IN")}`,
      );
    }
  }

  const expressFee = deliverySpeed === "express" ? settings.expressDeliveryFee : 0;
  const shipping = summary.totals.shipping + expressFee;
  const total = Math.max(0, summary.totals.subtotal + shipping - summary.totals.discount);

  /* GST is extracted from the goods value only — delivery is billed separately
     and the discount reduces the taxable base, so tax is computed on what the
     customer actually pays for the products. */
  const goodsValue = Math.max(0, summary.totals.subtotal - summary.totals.discount);
  const tax = computeTax({ gross: goodsValue, buyerState: address?.state });

  /* Return policy is read once here and copied onto every line below. */
  const products = await Product.find(
    { _id: { $in: summary.lines.map((l) => l.productId) } },
    { isReturnable: 1, returnWindowDays: 1 },
  ).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  /* Stock is decremented and the order written inside one transaction, so two
     shoppers cannot both buy the last unit. Falls back to a plain write on a
     standalone mongod, which has no transaction support. */
  const session = await mongoose.startSession();
  let order;

  try {
    const supportsTx = Boolean(mongoose.connection.client?.topology?.hasSessionSupport?.());

    const run = async () => {
      for (const line of summary.lines) {
        const updated = await Product.findOneAndUpdate(
          { _id: line.productId, isActive: true },
          { $inc: { stock: -line.qty } },
          { new: true, ...(supportsTx ? { session } : {}) },
        );
        if (updated && updated.stock <= 0) {
          updated.stock = Math.max(0, updated.stock);
          updated.inStock = false;
          await updated.save(supportsTx ? { session } : {});
        }
      }

      const [doc] = await Order.create(
        [
          {
            orderNo: await nextOrderNo(),
            user: user.id,
            items: summary.lines.map((l) => {
              const p = byId.get(String(l.productId));
              return {
                product: l.productId,
                slug: l.slug,
                title: l.title,
                brand: l.brand,
                image: l.image,
                size: l.size,
                color: l.color,
                qty: l.qty,
                price: l.price,
                mrp: l.mrp,
                /* Frozen at purchase: the policy the customer agreed to, not
                   whatever the product says months later. */
                isReturnable: p?.isReturnable ?? true,
                returnWindowDays: p?.returnWindowDays ?? 30,
                returnStatus: "none",
              };
            }),
            address,
            subtotal: summary.totals.subtotal,
            shipping,
            discount: summary.totals.discount,
            couponCode: summary.couponCode,
            total,
            tax,
            deliverySpeed,
            payment: {
              method: paymentMethod,
              status: paymentMethod === "cod" ? "pending" : "paid",
              paidAt: paymentMethod === "cod" ? undefined : new Date(),
            },
            status: "placed",
            timeline: [{ status: "placed", at: new Date() }],
            eta: new Date(Date.now() + (deliverySpeed === "express" ? 1 : 4) * 86_400_000),
          },
        ],
        supportsTx ? { session } : {},
      );

      return doc;
    };

    if (supportsTx) {
      await session.withTransaction(run);
      order = await Order.findOne({ user: user.id }).sort({ createdAt: -1 });
    } else {
      order = await run();
    }
  } finally {
    await session.endSession();
  }

  if (summary.couponCode) {
    await Coupon.updateOne({ code: summary.couponCode }, { $inc: { usedCount: 1 } });
  }

  cart.lines = [];
  cart.couponCode = "";
  await cart.save();

  /* Invoice is generated and attached to the confirmation. Both the PDF and
     the send are best-effort: the order exists either way, and a failed email
     must never surface as a failed checkout. */
  (async () => {
    let invoicePdf;
    try {
      const siteSettings = await Settings.getSite();
      invoicePdf = await pdfService.generateInvoicePdf({
        order,
        user,
        settings: siteSettings,
      });
    } catch (e) {
      logger.error("[order] invoice PDF failed:", e.message);
    }

    await mailer.sendOrderConfirmationEmail({
      to: user.email,
      order,
      customerName: user.name,
      invoicePdf,
    });
  })().catch((e) => logger.error("[order] confirmation email failed:", e.message));

  return order;
}

export async function listUserOrders(userId, { page, limit, skip }) {
  const [items, total] = await Promise.all([
    Order.find({ user: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments({ user: userId }),
  ]);
  return { items, total, page, limit };
}

export async function getUserOrder(userId, id) {
  const order = await Order.findOne({ _id: id, user: userId }).lean();
  if (!order) throw ApiError.notFound("Order not found");
  return order;
}

export async function cancelOrder(userId, id, reason = "") {
  const order = await Order.findOne({ _id: id, user: userId });
  if (!order) throw ApiError.notFound("Order not found");

  if (!order.isCancellable()) {
    throw ApiError.badRequest(
      "This order has already shipped. Please use the help chat so we can recall it from the courier.",
    );
  }

  order.status = "cancelled";
  order.cancelledReason = reason;
  order.timeline.push({ status: "cancelled", at: new Date(), note: reason });
  await order.save();

  // Put the stock back so it can be sold again.
  await Promise.all(
    order.items.map((i) =>
      Product.updateOne({ _id: i.product }, { $inc: { stock: i.qty }, inStock: true }),
    ),
  );

  return order;
}

/* ─────────────────────────────── admin ────────────────────────────────── */

export async function listAllOrders(query, { page, limit, skip }) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.payment) filter["payment.method"] = query.payment;
  if (query.q) filter.orderNo = new RegExp(String(query.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const [items, total] = await Promise.all([
    Order.find(filter)
      .populate("user", "name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

/**
 * Admin status update.
 *
 * The admin owns the order only up to "shipped". Past that, Shiprocket's scans
 * drive the status — allowing a manual override there would let the dashboard
 * and the courier disagree, and the customer would see whichever wrote last.
 *
 * Marking "shipped" is also the handoff point: that is when the order is
 * pushed to Shiprocket and tracking takes over.
 */
export async function updateOrderStatus(id, status, note = "") {
  const order = await Order.findById(id).populate("user", "name email phone");
  if (!order) throw ApiError.notFound("Order not found");

  if (["cancelled", "returned"].includes(order.status)) {
    throw ApiError.badRequest(`This order is ${order.status} and can no longer be updated.`);
  }

  const courierOwned = !ADMIN_CONTROLLED.includes(order.status);
  if (courierOwned && status !== "cancelled") {
    throw ApiError.badRequest(
      "This shipment is with the courier — its status now comes from Shiprocket tracking.",
    );
  }

  const wasShipped = order.status === "shipped";
  order.status = status;
  order.timeline.push({ status, at: new Date(), note });

  if (status === "delivered" && order.payment.method === "cod") {
    order.payment.status = "paid";
    order.payment.paidAt = new Date();
  }

  await order.save();

  if (status === "delivered") {
    mailer
      .sendOrderDeliveredEmail({
        to: order.user.email,
        order,
        customerName: order.user.name,
      })
      .catch((e) => logger.error("[order] delivered email failed:", e.message));
  }

  /* Hand the parcel to Shiprocket exactly once, on the transition into
     "shipped". Failure is surfaced but does not roll back the status — the
     admin can retry from the shipment panel. */
  if (status === "shipped" && !wasShipped) {
    try {
      const shipment = await shiprocketService.createShipment(order._id, order.user);

      const fresh = await Order.findById(order._id);
      const d = fresh.shipping_details ?? {};

      mailer
        .sendOrderShippedEmail({
          to: order.user.email,
          order: fresh,
          tracking: {
            courier: d.courier,
            awb: d.awb,
            trackingUrl: d.trackingUrl,
            etaText: fresh.eta
              ? new Date(fresh.eta).toLocaleDateString("en-IN", { day: "numeric", month: "long" })
              : null,
          },
        })
        .catch((e) => logger.error("[order] shipped email failed:", e.message));

      return { order: fresh, shipment };
    } catch (err) {
      logger.error(`[order] Shiprocket handoff failed for ${order.orderNo}: ${err.message}`);
      return { order, shipmentError: err.message };
    }
  }

  return { order };
}

/** Latest one-line status for the storefront tracker. */
export async function getOrderStatusLine(userId, orderId) {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) throw ApiError.notFound("Order not found");

  /* Refresh from the courier on read, but only for in-flight shipments and
     only if the last sync is stale — a page view must not cost an API call
     to Shiprocket every time. */
  const d = order.shipping_details ?? {};
  const stale =
    !d.trackingUpdatedAt || Date.now() - new Date(d.trackingUpdatedAt).getTime() > 15 * 60_000;

  if (stale && (d.awb || d.shipmentId) &&
      ["shipped", "in-transit", "out-for-delivery", "rto"].includes(order.status)) {
    try {
      await shiprocketService.syncOrderTracking(order._id);
    } catch (err) {
      logger.warn(`[order] tracking refresh failed for ${order.orderNo}: ${err.message}`);
    }
  }

  const fresh = await Order.findById(order._id);
  return {
    orderNo: fresh.orderNo,
    status: fresh.status,
    line: fresh.statusLine(),
    cancellable: fresh.isCancellable(),
    tracking: {
      courier: fresh.shipping_details?.courier ?? null,
      awb: fresh.shipping_details?.awb ?? null,
      trackingUrl: fresh.shipping_details?.trackingUrl ?? null,
      updatedAt: fresh.shipping_details?.trackingUpdatedAt ?? null,
      scans: fresh.shipping_details?.scans ?? [],
    },
    timeline: fresh.timeline,
    eta: fresh.eta,
  };
}

export const orderService = {
  placeOrder,
  getOrderStatusLine,
  listUserOrders,
  getUserOrder,
  cancelOrder,
  listAllOrders,
  updateOrderStatus,
};
