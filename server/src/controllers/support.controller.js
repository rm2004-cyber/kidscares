import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created, paginated } from "../utils/response.js";
import { readPaging } from "../utils/pagination.js";
import { supportService, CANCEL_REASONS } from "../services/support.service.js";
import { orderService } from "../services/order.service.js";
import { Order } from "../models/Order.js";

/* ─────────────────────────── chatbot ──────────────────────────────────── */

/** Orders the chatbot can offer actions on — recent and not yet closed. */
export const chatContext = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    user: req.user.id,
    status: { $nin: ["delivered", "cancelled", "returned"] },
  })
    .sort({ createdAt: -1 })
    .limit(5);

  return ok(res, {
    reasons: CANCEL_REASONS,
    orders: orders.map((o) => ({
      _id: o._id,
      orderNo: o.orderNo,
      status: o.status,
      total: o.total,
      itemCount: o.items.length,
      firstItem: o.items[0]?.title,
      image: o.items[0]?.image,
      placedAt: o.createdAt,
      cancellable: o.isCancellable(),
      line: o.statusLine(),
    })),
  });
});

export const cancellationContext = asyncHandler(async (req, res) =>
  ok(res, await supportService.getCancellationContext(req.user.id, req.params.orderId)),
);

export const requestCancellation = asyncHandler(async (req, res) =>
  created(
    res,
    await supportService.requestCancellation({
      user: req.user,
      orderId: req.params.orderId,
      reasonCode: req.body.reasonCode,
      reasonText: req.body.reasonText,
      transcript: req.body.transcript,
    }),
  ),
);

/** One-line status the storefront shows, Flipkart-style. */
export const orderStatusLine = asyncHandler(async (req, res) =>
  ok(res, await orderService.getOrderStatusLine(req.user.id, req.params.orderId)),
);

/* ─────────────────────────── admin ────────────────────────────────────── */

export const listCancellations = asyncHandler(async (req, res) => {
  const paging = readPaging(req.query, { defaultLimit: 20 });
  const { items, total } = await supportService.listCancellations(req.query, paging);
  return paginated(res, items, { ...paging, total });
});

export const resolveCancellation = asyncHandler(async (req, res) =>
  ok(
    res,
    await supportService.resolveCancellation({
      admin: req.admin,
      requestId: req.params.id,
      approve: req.body.approve === true,
      note: req.body.note,
    }),
  ),
);

export const retryRefund = asyncHandler(async (req, res) =>
  ok(res, await supportService.retryRefund({ orderId: req.body.orderId })),
);
