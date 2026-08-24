import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created, paginated } from "../utils/response.js";
import { readPaging } from "../utils/pagination.js";
import { returnService } from "../services/return.service.js";

/* ─────────────────────────── customer ─────────────────────────────────── */

/** Which lines of an order can still be returned, and why not if they cannot. */
export const context = asyncHandler(async (req, res) =>
  ok(res, await returnService.getReturnContext(req.user.id, req.params.orderId)),
);

export const request = asyncHandler(async (req, res) =>
  created(
    res,
    await returnService.requestReturn({
      user: req.user,
      orderId: req.params.orderId,
      itemIndexes: req.body.itemIndexes ?? [],
      reasonCode: req.body.reasonCode,
      reasonText: req.body.reasonText,
      resolution: req.body.resolution,
      refundMode: req.body.refundMode,
      bankDetails: req.body.bankDetails,
    }),
  ),
);

export const mine = asyncHandler(async (req, res) =>
  ok(res, await returnService.listMyReturns(req.user.id)),
);

/* ─────────────────────────────── admin ────────────────────────────────── */

export const list = asyncHandler(async (req, res) => {
  const paging = readPaging(req.query, { defaultLimit: 20 });
  const { items, total, pending } = await returnService.listReturns(req.query, paging);
  return res.json({
    success: true,
    data: items,
    meta: { ...paging, total, pending, pages: Math.max(1, Math.ceil(total / paging.limit)) },
  });
});

export const resolve = asyncHandler(async (req, res) =>
  ok(
    res,
    await returnService.resolveReturn({
      admin: req.admin,
      id: req.params.id,
      approve: req.body.approve === true,
      note: req.body.note,
    }),
  ),
);

/** Retry a pickup that failed to book, without re-approving the return. */
export const retryPickup = asyncHandler(async (req, res) =>
  ok(res, await returnService.retryPickup(req.params.id)),
);

/** Called once the parcel is physically back — restocks and refunds. */
export const complete = asyncHandler(async (req, res) =>
  ok(
    res,
    await returnService.completeReturn({
      id: req.params.id,
      restock: req.body.restock !== false,
      amount: req.body.amount,
      deductionNote: req.body.deductionNote,
      admin: req.admin,
    }),
  ),
);

/** Re-run a refund the gateway rejected. */
export const retryRefund = asyncHandler(async (req, res) =>
  ok(
    res,
    await returnService.retryRefund({
      id: req.params.id,
      amount: req.body.amount,
      deductionNote: req.body.deductionNote,
      admin: req.admin,
    }),
  ),
);

/** Closes a cash-on-delivery refund the admin transferred out of band. */
export const markRefundPaid = asyncHandler(async (req, res) =>
  ok(
    res,
    await returnService.markRefundPaid({
      id: req.params.id,
      reference: req.body.reference,
      admin: req.admin,
    }),
  ),
);
