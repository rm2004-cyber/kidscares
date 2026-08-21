import mongoose from "mongoose";

/**
 * Product review.
 *
 * Only written by someone who actually bought and received the item — the
 * order reference is required, which makes every review a verified purchase by
 * construction rather than by a flag someone could set.
 *
 * Nothing is public until an admin approves it, so the storefront never shows
 * unmoderated text, and the product's rating only ever aggregates approved
 * reviews.
 */
const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    productSlug: { type: String, index: true },
    productTitle: String,
    productImage: String,

    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    /** Denormalised so a moderation screen does not need to populate. */
    authorName: String,

    /** Proves the purchase; also stops a review before delivery. */
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    orderNo: String,

    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 120 },
    comment: { type: String, trim: true, maxlength: 2000 },

    /** Size/colour actually bought — useful context under the review. */
    variant: { size: String, color: String },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    adminNote: { type: String, trim: true, maxlength: 500 },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },
    moderatedAt: Date,

    helpfulCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

/* One review per customer per product. A second purchase of the same item
   should edit the existing review, not stack another one. */
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, status: 1, createdAt: -1 });
reviewSchema.index({ status: 1, createdAt: -1 });

export const Review = mongoose.model("Review", reviewSchema);
