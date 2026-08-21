import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created, paginated } from "../utils/response.js";
import { readPaging } from "../utils/pagination.js";
import { reviewService } from "../services/review.service.js";

/* ─────────────────────────── customer ─────────────────────────────────── */

export const reviewable = asyncHandler(async (req, res) =>
  ok(res, await reviewService.getReviewableItems(req.user.id)),
);

export const submit = asyncHandler(async (req, res) =>
  created(res, await reviewService.submitReview({ user: req.user, ...req.body })),
);

export const myReviews = asyncHandler(async (req, res) =>
  ok(res, await reviewService.listMyReviews(req.user.id)),
);

export const removeMine = asyncHandler(async (req, res) =>
  ok(res, await reviewService.deleteMyReview(req.user.id, req.params.id)),
);

/* ──────────────────────────── public ──────────────────────────────────── */

export const productReviews = asyncHandler(async (req, res) => {
  const paging = readPaging(req.query, { defaultLimit: 10 });
  const { items, total, summary } = await reviewService.listProductReviews(
    req.params.slug,
    { ...paging, sort: req.query.sort },
  );
  return res.json({
    success: true,
    data: items,
    meta: {
      ...paging,
      total,
      pages: Math.max(1, Math.ceil(total / paging.limit)),
      hasMore: paging.page * paging.limit < total,
      summary,
    },
  });
});

/* ─────────────────────────────── admin ────────────────────────────────── */

export const list = asyncHandler(async (req, res) => {
  const paging = readPaging(req.query, { defaultLimit: 20 });
  const { items, total, pending } = await reviewService.listReviews(req.query, paging);
  return res.json({
    success: true,
    data: items,
    meta: {
      ...paging,
      total,
      pending,
      pages: Math.max(1, Math.ceil(total / paging.limit)),
    },
  });
});

export const moderate = asyncHandler(async (req, res) =>
  ok(
    res,
    await reviewService.moderateReview({
      admin: req.admin,
      id: req.params.id,
      approve: req.body.approve === true,
      note: req.body.note,
    }),
  ),
);

export const remove = asyncHandler(async (req, res) =>
  ok(res, await reviewService.deleteReview(req.params.id)),
);
