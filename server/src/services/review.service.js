import { Review } from "../models/Review.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";

/**
 * Reviews.
 *
 * Two rules do the heavy lifting:
 *
 *  1. A review must reference a DELIVERED order containing the product. That
 *     makes every review a verified purchase without trusting the client.
 *  2. A product's rating is recomputed from approved reviews only, so a
 *     pending or rejected one can never move the star average.
 */

/**
 * Recalculates a product's rating from its approved reviews.
 *
 * Runs after every moderation decision. Cheap — one aggregate over an indexed
 * field — and keeps the denormalised counters on Product honest.
 */
export async function recomputeProductRating(productId) {
  const [stats] = await Review.aggregate([
    { $match: { product: productId, status: "approved" } },
    {
      $group: {
        _id: null,
        avg: { $avg: "$rating" },
        count: { $sum: 1 },
        five: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
        four: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
        three: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
        two: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
        one: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
      },
    },
  ]);

  const rating = stats ? Math.round(stats.avg * 10) / 10 : 0;
  const reviewCount = stats?.count ?? 0;

  await Product.updateOne({ _id: productId }, { rating, reviewCount });

  return {
    rating,
    reviewCount,
    breakdown: {
      5: stats?.five ?? 0,
      4: stats?.four ?? 0,
      3: stats?.three ?? 0,
      2: stats?.two ?? 0,
      1: stats?.one ?? 0,
    },
  };
}

/* ─────────────────────────── customer ─────────────────────────────────── */

/**
 * Items the customer is allowed to review right now: everything in a delivered
 * order that they have not already reviewed.
 */
export async function getReviewableItems(userId) {
  const delivered = await Order.find({ user: userId, status: "delivered" })
    .sort({ createdAt: -1 })
    .lean();

  const existing = await Review.find({ user: userId }, { product: 1, status: 1, rating: 1 }).lean();
  const byProduct = new Map(existing.map((r) => [String(r.product), r]));

  const items = [];
  for (const order of delivered) {
    for (const item of order.items) {
      const key = String(item.product);
      if (!key || items.some((i) => i.productId === key)) continue;

      const review = byProduct.get(key);
      items.push({
        productId: key,
        slug: item.slug,
        title: item.title,
        brand: item.brand,
        image: item.image,
        size: item.size,
        color: item.color,
        orderId: String(order._id),
        orderNo: order.orderNo,
        deliveredAt: order.updatedAt,
        existingReview: review
          ? { rating: review.rating, status: review.status }
          : null,
      });
    }
  }

  return items;
}

export async function submitReview({ user, productId, orderId, rating, title, comment }) {
  /* The order must be the customer's own, delivered, and actually contain the
     product — all three checked in one query so none can be spoofed. */
  const order = await Order.findOne({
    _id: orderId,
    user: user.id,
    status: "delivered",
    "items.product": productId,
  });

  if (!order) {
    throw ApiError.badRequest(
      "You can only review a product from an order that has been delivered.",
    );
  }

  const item = order.items.find((i) => String(i.product) === String(productId));
  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound("Product not found");

  const payload = {
    product: product._id,
    productSlug: product.slug,
    productTitle: product.title,
    productImage: product.images?.[0]?.url,
    user: user.id,
    authorName: user.name,
    order: order._id,
    orderNo: order.orderNo,
    rating,
    title: title ?? "",
    comment: comment ?? "",
    variant: { size: item?.size, color: item?.color },
    // An edit re-enters moderation: the text changed, so the old approval
    // no longer applies to it.
    status: "pending",
    adminNote: "",
    moderatedBy: undefined,
    moderatedAt: undefined,
  };

  const review = await Review.findOneAndUpdate(
    { product: product._id, user: user.id },
    payload,
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  // An edited review leaves the public average until it is approved again.
  await recomputeProductRating(product._id);

  return review;
}

export async function listMyReviews(userId) {
  return Review.find({ user: userId }).sort({ createdAt: -1 }).lean();
}

export async function deleteMyReview(userId, id) {
  const review = await Review.findOneAndDelete({ _id: id, user: userId });
  if (!review) throw ApiError.notFound("Review not found");
  await recomputeProductRating(review.product);
  return { ok: true };
}

/* ──────────────────────────── public ──────────────────────────────────── */

/** Approved reviews for one product, plus the star breakdown. */
export async function listProductReviews(slug, { page, limit, skip, sort = "recent" }) {
  const product = await Product.findOne({ slug }, { _id: 1 }).lean();
  if (!product) throw ApiError.notFound("Product not found");

  const order =
    sort === "helpful"
      ? { helpfulCount: -1, createdAt: -1 }
      : sort === "high"
        ? { rating: -1, createdAt: -1 }
        : sort === "low"
          ? { rating: 1, createdAt: -1 }
          : { createdAt: -1 };

  const filter = { product: product._id, status: "approved" };

  const [items, total, summary] = await Promise.all([
    Review.find(filter, { adminNote: 0, moderatedBy: 0, order: 0 })
      .sort(order)
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
    recomputeProductRating(product._id),
  ]);

  return { items, total, page, limit, summary };
}

/* ─────────────────────────────── admin ────────────────────────────────── */

export async function listReviews(query, { page, limit, skip }) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.rating) filter.rating = Number(query.rating);
  if (query.q) {
    const rx = new RegExp(String(query.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ productTitle: rx }, { authorName: rx }, { comment: rx }, { orderNo: rx }];
  }

  const [items, total, pending] = await Promise.all([
    Review.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
    Review.countDocuments({ status: "pending" }),
  ]);

  return { items, total, page, limit, pending };
}

export async function moderateReview({ admin, id, approve, note }) {
  const review = await Review.findById(id);
  if (!review) throw ApiError.notFound("Review not found");

  review.status = approve ? "approved" : "rejected";
  review.adminNote = note ?? "";
  review.moderatedBy = admin.id;
  review.moderatedAt = new Date();
  await review.save();

  const summary = await recomputeProductRating(review.product);

  logger.info(
    `[reviews] ${review.status} "${review.productTitle}" → ${summary.rating} (${summary.reviewCount})`,
  );

  return { review, summary };
}

export async function deleteReview(id) {
  const review = await Review.findByIdAndDelete(id);
  if (!review) throw ApiError.notFound("Review not found");
  await recomputeProductRating(review.product);
  return { ok: true };
}

export const reviewService = {
  recomputeProductRating,
  getReviewableItems,
  submitReview,
  listMyReviews,
  deleteMyReview,
  listProductReviews,
  listReviews,
  moderateReview,
  deleteReview,
};
