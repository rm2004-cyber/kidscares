import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    type: { type: String, enum: ["percent", "flat", "shipping"], required: true },
    value: { type: Number, default: 0, min: 0 },
    /** Ceiling for percent coupons; ignored for the other types. */
    maxDiscount: { type: Number, default: 0 },
    minOrder: { type: Number, default: 0 },

    /** Restricts the coupon to one aisle; blank means site-wide. */
    category: { type: String, default: "" },

    startsAt: Date,
    expiresAt: { type: Date, required: true, index: true },

    usageLimit: { type: Number, default: 0 },   // 0 = unlimited
    usedCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1 },

    /* Named `featured`, not `isNew`: Mongoose reserves `isNew` on documents. */
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

/**
 * Works out what this coupon is worth for a given cart.
 *
 * Returns a `reason` instead of throwing when it does not apply, so the UI can
 * explain why a code was rejected rather than failing silently.
 */
couponSchema.methods.evaluate = function evaluate({ subtotal, shipping = 0, now = new Date() }) {
  if (!this.isActive) return { discount: 0, shippingWaived: false, reason: "This code is no longer active" };
  if (this.startsAt && now < this.startsAt) return { discount: 0, shippingWaived: false, reason: "This code is not active yet" };
  if (now > this.expiresAt) return { discount: 0, shippingWaived: false, reason: "This code has expired" };
  if (this.usageLimit > 0 && this.usedCount >= this.usageLimit) {
    return { discount: 0, shippingWaived: false, reason: "This code has been fully redeemed" };
  }
  if (subtotal < this.minOrder) {
    return {
      discount: 0,
      shippingWaived: false,
      reason: `Add ₹${(this.minOrder - subtotal).toLocaleString("en-IN")} more to use this code`,
    };
  }

  if (this.type === "shipping") {
    return { discount: 0, shippingWaived: shipping > 0 };
  }

  const raw = this.type === "percent" ? (subtotal * this.value) / 100 : this.value;
  const capped = this.maxDiscount > 0 ? Math.min(raw, this.maxDiscount) : raw;
  return { discount: Math.round(Math.min(capped, subtotal)), shippingWaived: false };
};

export const Coupon = mongoose.model("Coupon", couponSchema);
