import { ReturnRequest, RETURN_REASONS } from "../models/ReturnRequest.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";
import { razorpayService } from "./razorpay.service.js";
import { shiprocketService } from "./shiprocket.service.js";
import { mailer } from "./mailer.js";

export { RETURN_REASONS };

/**
 * Returns.
 *
 * Eligibility is decided by the order line, not the live product: the policy
 * was snapshotted at purchase, so tightening it later cannot revoke a return
 * the customer was already promised.
 */

export async function getReturnContext(userId, orderId) {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) throw ApiError.notFound("Order not found");

  const items = order.returnableItems();

  const prepaid = order.payment?.method !== "cod" && order.payment?.status === "paid";

  return {
    orderNo: order.orderNo,
    status: order.status,
    delivered: order.status === "delivered",
    items,
    anyEligible: items.some((i) => i.eligible),
    reasons: RETURN_REASONS,
    payment: {
      method: order.payment?.method,
      prepaid,
      /* Prepaid refunds go back to the card or UPI that paid, so bank details
         are optional there. Cash on delivery has no source to reverse, so they
         are the only way to pay the customer back. */
      bankRequired: !prepaid,
      defaultMode: prepaid ? "source" : "bank",
    },
    /* Where the courier will collect from — the address it was delivered to. */
    pickupAddress: order.address
      ? {
          fullName: order.address.fullName,
          line1: order.address.line1,
          line2: order.address.line2,
          city: order.address.city,
          state: order.address.state,
          pincode: order.address.pincode,
          phone: order.address.phone,
        }
      : null,
  };
}

export async function requestReturn({
  user,
  orderId,
  itemIndexes,
  reasonCode,
  reasonText,
  resolution,
  refundMode,
  bankDetails,
}) {
  const order = await Order.findOne({ _id: orderId, user: user.id });
  if (!order) throw ApiError.notFound("Order not found");
  if (order.status !== "delivered") {
    throw ApiError.badRequest("Only delivered orders can be returned.");
  }

  const eligibility = order.returnableItems();
  const chosen = [];

  for (const index of itemIndexes) {
    const row = eligibility[index];
    if (!row) throw ApiError.badRequest("That item is not on this order.");
    if (!row.eligible) {
      throw ApiError.badRequest(`${row.title}: ${row.reason ?? "cannot be returned"}`);
    }
    chosen.push(row);
  }

  if (chosen.length === 0) throw ApiError.badRequest("Pick at least one item to return.");

  const refundAmount = chosen.reduce((sum, i) => sum + i.price * i.qty, 0);

  /* A cash-on-delivery order has no payment to reverse, so without an account
     to pay into the refund would have nowhere to go. */
  const prepaid = order.payment?.method !== "cod" && order.payment?.status === "paid";
  const mode = refundMode ?? (prepaid ? "source" : "bank");

  if (mode === "bank") {
    const b = bankDetails ?? {};
    if (!b.accountName || !b.accountNumber || !b.ifsc) {
      throw ApiError.badRequest(
        "Add the account name, number and IFSC so we can send the refund.",
      );
    }
  }
  if (mode === "upi" && !bankDetails?.upiId) {
    throw ApiError.badRequest("Add the UPI ID so we can send the refund.");
  }

  const request = await ReturnRequest.create({
    order: order._id,
    orderNo: order.orderNo,
    user: user.id,
    items: chosen.map((i) => ({
      itemIndex: i.index,
      product: i.product,
      title: i.title,
      image: i.image,
      size: i.size,
      color: i.color,
      qty: i.qty,
      price: i.price,
    })),
    reasonCode,
    reasonText: reasonText ?? "",
    resolution: resolution ?? "refund",
    refundAmount,
    refundMode: mode,
    bankDetails: mode === "source" ? undefined : bankDetails,
    pickup: { status: "not-booked" },
  });

  // Mark the lines so the storefront stops offering a second return.
  for (const i of chosen) {
    order.items[i.index].returnStatus = "requested";
    order.items[i.index].returnRequestId = request._id;
  }
  order.timeline.push({
    status: order.status,
    at: new Date(),
    note: `Return requested for ${chosen.length} item(s)`,
  });
  await order.save();

  return { request, refundAmount };
}

export async function listMyReturns(userId) {
  return ReturnRequest.find({ user: userId }).sort({ createdAt: -1 }).lean();
}

/* ─────────────────────────────── admin ────────────────────────────────── */

export async function listReturns(query, { page, limit, skip }) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.q) {
    filter.orderNo = new RegExp(String(query.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }

  const [items, total, pending] = await Promise.all([
    ReturnRequest.find(filter)
      .populate("user", "name email phone")
      .populate("order", "orderNo total address payment createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ReturnRequest.countDocuments(filter),
    ReturnRequest.countDocuments({ status: "pending" }),
  ]);

  return { items, total, page, limit, pending };
}

async function setLineStatus(request, status) {
  const order = await Order.findById(request.order);
  if (!order) return null;
  for (const i of request.items) {
    if (order.items[i.itemIndex]) order.items[i.itemIndex].returnStatus = status;
  }
  await order.save();
  return order;
}

export async function resolveReturn({ admin, id, approve, note }) {
  const request = await ReturnRequest.findById(id).populate("user");
  if (!request) throw ApiError.notFound("Return not found");
  if (request.status !== "pending") {
    throw ApiError.badRequest("This return has already been handled.");
  }

  request.handledBy = admin.id;
  request.handledAt = new Date();
  request.adminNote = note ?? "";
  request.status = approve ? "approved" : "rejected";
  await request.save();

  await setLineStatus(request, approve ? "approved" : "rejected");

  if (!approve) return { request };

  /* Approval is the trigger for booking, never the request itself — a
     rejected return must not have already sent a courier to the customer.
     A booking failure does not undo the approval; the admin retries from the
     same screen once the cause is fixed. */
  const order = await Order.findById(request.order);

  try {
    const booking = await shiprocketService.createReturnShipment({
      order,
      returnRequest: request,
    });

    request.pickup = {
      status: "booked",
      shiprocketOrderId: booking.shiprocketOrderId,
      shipmentId: booking.shipmentId,
      awb: booking.awb,
      courier: booking.courier,
      courierId: booking.courierId,
      rate: booking.rate,
      estimatedDays: booking.estimatedDays,
      bookedAt: new Date(),
      scheduledAt: new Date(),
    };
    await request.save();

    logger.success(
      `[returns] reverse pickup booked for ${request.orderNo} via ${booking.courier} at ₹${booking.rate}`,
    );

    mailer
      .sendReturnApprovedEmail({
        to: request.user.email,
        order,
        request,
        pickup: booking,
      })
      .catch((e) => logger.error("[returns] approval email failed:", e.message));

    return { request, booking };
  } catch (err) {
    request.pickup = { status: "failed", failureReason: err.message };
    await request.save();
    logger.error(`[returns] pickup booking failed for ${request.orderNo}: ${err.message}`);
    return { request, bookingError: err.message };
  }
}

/** Retry a pickup that failed to book, without re-approving. */
export async function retryPickup(id) {
  const request = await ReturnRequest.findById(id).populate("user");
  if (!request) throw ApiError.notFound("Return not found");
  if (request.status !== "approved") {
    throw ApiError.badRequest("Approve the return before booking a pickup.");
  }
  if (request.pickup?.status === "booked") {
    throw ApiError.badRequest("A pickup is already booked for this return.");
  }

  const order = await Order.findById(request.order);
  const booking = await shiprocketService.createReturnShipment({
    order,
    returnRequest: request,
  });

  request.pickup = {
    status: "booked",
    shiprocketOrderId: booking.shiprocketOrderId,
    shipmentId: booking.shipmentId,
    awb: booking.awb,
    courier: booking.courier,
    courierId: booking.courierId,
    rate: booking.rate,
    estimatedDays: booking.estimatedDays,
    bookedAt: new Date(),
  };
  await request.save();

  return { request, booking };
}

/**
 * Called once the parcel is physically back: restocks and refunds.
 *
 * Separate from approval on purpose — refunding before the goods arrive means
 * paying out for something that may never be sent.
 */
/**
 * Marks a return physically received, then triggers the refund.
 *
 * `amount` comes from the admin, not from a calculation — they decide whether
 * shipping or a restocking fee is withheld, and the customer is told why. It
 * is capped at the value of the returned lines so a typo cannot refund more
 * than the goods were worth.
 */
export async function completeReturn({ id, restock = true, amount, deductionNote, admin }) {
  const request = await ReturnRequest.findById(id).populate("user");
  if (!request) throw ApiError.notFound("Return not found");

  /* Checked before the status guard: once a refund exists the status is already
     "refunded", and reporting "approve it first" would hide the real reason. */
  if (["initiated", "processed"].includes(request.refund?.status)) {
    throw ApiError.badRequest(
      `A refund of ${request.refund.amount} was already ${request.refund.status} for this return.`,
    );
  }

  if (!["approved", "picked-up"].includes(request.status)) {
    throw ApiError.badRequest("Approve the return before completing it.");
  }

  const order = await Order.findById(request.order);
  if (!order) throw ApiError.notFound("Order not found");

  const payable = amount == null ? request.refundAmount : Number(amount);
  if (!Number.isFinite(payable) || payable <= 0) {
    throw ApiError.badRequest("Enter the refund amount to send back.");
  }
  if (payable > request.refundAmount) {
    throw ApiError.badRequest(
      `Refund cannot exceed the returned items' value of ${request.refundAmount}.`,
    );
  }
  const withheld = request.refundAmount - payable;
  if (withheld > 0 && !deductionNote?.trim()) {
    throw ApiError.badRequest(
      "Say why the amount is lower — the customer sees this on their refund email.",
    );
  }

  if (restock) {
    await Promise.all(
      request.items.map((i) =>
        Product.updateOne({ _id: i.product }, { $inc: { stock: i.qty }, inStock: true }),
      ),
    );
  }

  const prepaid = order.payment?.method !== "cod" && order.payment?.status === "paid";

  request.refund.amount = payable;
  request.refund.deductionNote = withheld > 0 ? deductionNote.trim() : "";
  request.refund.initiatedAt = new Date();
  if (admin) {
    request.refund.initiatedBy = admin._id;
    request.refund.initiatedByName = admin.name;
  }

  if (prepaid) {
    try {
      const result = await razorpayService.refundOrderPayment({
        order,
        amount: payable,
        reason: `Return ${request.orderNo}: ${request.reasonCode}`,
      });

      request.refund.refundId = result.refundId;
      request.refund.speed = result.speed;
      /* Razorpay returns "processed" only when the bank settled instantly;
         everything else stays initiated until the webhook says otherwise. */
      request.refund.status = result.status === "processed" ? "processed" : "initiated";
      if (request.refund.status === "processed") request.refund.processedAt = new Date();
      request.refundReference = result.refundId;
    } catch (err) {
      /* The goods are already restocked and back with us — losing that because
         the gateway hiccuped would be worse than a failed refund the admin can
         retry. So the failure is recorded, not thrown. */
      request.refund.status = "failed";
      request.refund.failedAt = new Date();
      request.refund.failureReason = err.message;
      request.status = "refunded";
      request.refundedAt = new Date();
      await request.save();
      await setLineStatus(request, "refunded");

      logger.error(`[returns] refund failed for ${request.orderNo}: ${err.message}`);
      return { request, refund: null, refundError: err.message };
    }
  } else {
    /* Cash on delivery has no payment to reverse — the transfer is made out of
       band, so it is recorded as initiated and the admin closes it manually. */
    request.refund.status = "initiated";
  }

  request.status = "refunded";
  request.refundedAt = new Date();
  await request.save();

  await setLineStatus(request, "refunded");

  // If every line came back, the order itself is a return.
  const allReturned = order.items.every((i) => i.returnStatus === "refunded");
  if (allReturned) {
    order.status = "returned";
    order.timeline.push({ status: "returned", at: new Date(), note: "All items returned" });
    await order.save();
  }

  mailer
    .sendRefundInitiatedEmail({
      to: request.user.email,
      order,
      request,
      amount: payable,
      withheld,
      deductionNote: request.refund.deductionNote,
      instant: request.refund.status === "processed",
    })
    .catch((e) => logger.error("[returns] refund email failed:", e.message));

  logger.success(
    `[returns] ${request.orderNo}: refund of ${payable} ${request.refund.status}` +
      (withheld > 0 ? ` (${withheld} withheld)` : ""),
  );

  return {
    request,
    refund: { amount: payable, reference: request.refund.refundId, status: request.refund.status },
  };
}

/**
 * Closes a cash-on-delivery refund the admin paid out of band.
 *
 * Only for COD: a prepaid refund's state comes from Razorpay, and letting an
 * admin hand-mark one processed would hide a bank rejection.
 */
export async function markRefundPaid({ id, reference, admin }) {
  const request = await ReturnRequest.findById(id).populate("user");
  if (!request) throw ApiError.notFound("Return not found");
  if (request.refund?.status !== "initiated") {
    throw ApiError.badRequest("Only an initiated refund can be marked paid.");
  }

  const order = await Order.findById(request.order);
  if (order?.payment?.method !== "cod") {
    throw ApiError.badRequest(
      "This refund is tracked by Razorpay — its status updates on its own.",
    );
  }

  request.refund.status = "processed";
  request.refund.processedAt = new Date();
  if (reference) request.refund.refundId = reference.trim();
  if (admin) request.refund.initiatedByName ||= admin.name;
  await request.save();

  mailer
    .sendRefundProcessedEmail({
      to: request.user.email,
      order,
      amount: request.refund.amount,
      reference: request.refund.refundId,
    })
    .catch((e) => logger.error("[returns] processed email failed:", e.message));

  return { request };
}

/** Re-trigger a refund whose first attempt failed at the gateway. */
export async function retryRefund({ id, amount, deductionNote, admin }) {
  const request = await ReturnRequest.findById(id).populate("user");
  if (!request) throw ApiError.notFound("Return not found");
  if (request.refund?.status !== "failed") {
    throw ApiError.badRequest("Only a failed refund can be retried.");
  }

  /* Reset to none so completeReturn's double-pay guard lets it through, and
     rewind the status so its state checks still hold. The previous failure is
     cleared too — leaving it would show a live refund next to a stale error. */
  const previous = { at: request.refund.failedAt, reason: request.refund.failureReason };
  request.refund.status = "none";
  request.refund.failedAt = undefined;
  request.refund.failureReason = undefined;
  request.status = "picked-up";
  await request.save();

  logger.info(
    `[returns] retrying refund for ${request.orderNo} after "${previous.reason}"`,
  );

  return completeReturn({
    id,
    restock: false,
    amount: amount ?? request.refund.amount,
    deductionNote: deductionNote ?? request.refund.deductionNote,
    admin,
  });
}

/**
 * Called from the Razorpay webhook once the bank confirms or rejects.
 *
 * This is the only place a refund becomes "processed" for a non-instant
 * refund — without it the panel would show money as sent that a bank may have
 * bounced days later.
 */
export async function applyRefundWebhook({ refundId, status, failureReason }) {
  const request = await ReturnRequest.findOne({ "refund.refundId": refundId }).populate("user");
  if (!request) return { matched: false };

  if (status === "processed") {
    request.refund.status = "processed";
    request.refund.processedAt = new Date();
  } else {
    request.refund.status = "failed";
    request.refund.failedAt = new Date();
    request.refund.failureReason = failureReason ?? "The bank rejected the refund";
  }
  await request.save();

  const order = await Order.findById(request.order);

  if (status === "processed") {
    mailer
      .sendRefundProcessedEmail({
        to: request.user.email,
        order,
        amount: request.refund.amount,
        reference: refundId,
      })
      .catch((e) => logger.error("[returns] processed email failed:", e.message));
  } else {
    logger.error(
      `[returns] refund ${refundId} for ${request.orderNo} failed at the bank: ` +
        `${request.refund.failureReason}`,
    );
  }

  return { matched: true, request };
}

export const returnService = {
  getReturnContext,
  requestReturn,
  retryPickup,
  retryRefund,
  markRefundPaid,
  applyRefundWebhook,
  listMyReturns,
  listReturns,
  resolveReturn,
  completeReturn,
  RETURN_REASONS,
};
