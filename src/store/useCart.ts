"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine, Product } from "@/lib/types";

type CartState = {
  lines: CartLine[];
  /** Drawer visibility lives here so any "Add to bag" button can open it. */
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (product: Product, size: string, color: string, qty?: number) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
};

/** A cart line is unique per product + size + colour, not per product. */
export const lineKey = (l: Pick<CartLine, "productId" | "size" | "color">) =>
  `${l.productId}__${l.size}__${l.color}`;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),

      add: (product, size, color, qty = 1) =>
        set((state) => {
          const key = `${product._id}__${size}__${color}`;
          const existing = state.lines.find((l) => lineKey(l) === key);

          const lines = existing
            ? state.lines.map((l) =>
                lineKey(l) === key ? { ...l, qty: Math.min(l.qty + qty, 10) } : l,
              )
            : [
                ...state.lines,
                {
                  productId: product._id,
                  slug: product.slug,
                  title: product.title,
                  brand: product.brand,
                  image: product.images[0],
                  price: product.price,
                  mrp: product.mrp,
                  size,
                  color,
                  qty,
                },
              ];

          return { lines, isOpen: true };
        }),

      remove: (key) =>
        set((state) => ({ lines: state.lines.filter((l) => lineKey(l) !== key) })),

      setQty: (key, qty) =>
        set((state) => ({
          lines:
            qty <= 0
              ? state.lines.filter((l) => lineKey(l) !== key)
              : state.lines.map((l) =>
                  lineKey(l) === key ? { ...l, qty: Math.min(qty, 10) } : l,
                ),
        })),

      clear: () => set({ lines: [] }),
    }),
    { name: "kidscare-cart", partialize: (s) => ({ lines: s.lines }) },
  ),
);

export const cartTotals = (lines: CartLine[]) => {
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const mrpTotal = lines.reduce((sum, l) => sum + l.mrp * l.qty, 0);
  const count = lines.reduce((sum, l) => sum + l.qty, 0);
  const savings = mrpTotal - subtotal;
  // Free delivery over ₹999 — same rule the app used.
  const shipping = subtotal === 0 || subtotal >= 999 ? 0 : 49;
  return { subtotal, mrpTotal, count, savings, shipping, total: subtotal + shipping };
};
