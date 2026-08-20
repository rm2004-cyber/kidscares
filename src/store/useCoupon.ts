"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Coupon } from "@/lib/account/types";

type CouponState = {
  applied: Coupon | null;
  apply: (c: Coupon) => void;
  clear: () => void;
};

export const useCoupon = create<CouponState>()(
  persist(
    (set) => ({
      applied: null,
      apply: (c) => set({ applied: c }),
      clear: () => set({ applied: null }),
    }),
    { name: "kidscares-coupon" },
  ),
);

/**
 * Works out what a coupon is worth against the current cart.
 *
 * Returns a reason when it does not apply, so the UI can explain *why* a code
 * was rejected rather than silently doing nothing.
 */
export function couponDiscount(
  coupon: Coupon | null,
  subtotal: number,
  shipping: number,
): { discount: number; shippingWaived: boolean; reason?: string } {
  if (!coupon) return { discount: 0, shippingWaived: false };

  if (subtotal < coupon.minOrder) {
    return {
      discount: 0,
      shippingWaived: false,
      reason: `Add ₹${(coupon.minOrder - subtotal).toLocaleString("en-IN")} more to use this code`,
    };
  }

  if (new Date(coupon.expiresAt).getTime() < Date.now()) {
    return { discount: 0, shippingWaived: false, reason: "This code has expired" };
  }

  if (coupon.type === "shipping") {
    return { discount: 0, shippingWaived: shipping > 0 };
  }

  const raw =
    coupon.type === "percent" ? (subtotal * coupon.value) / 100 : coupon.value;
  const capped = coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;

  return { discount: Math.round(Math.min(capped, subtotal)), shippingWaived: false };
}
