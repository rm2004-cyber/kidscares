"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { cartApi } from "@/utils/service";
import type { Product } from "@/lib/types";

export type CartLine = {
  productId: string;
  slug: string;
  title: string;
  brand: string;
  image: string;
  size: string;
  color: string;
  qty: number;
  price: number;
  mrp: number;
  inStock: boolean;
  lineTotal: number;
};

export type CartTotals = {
  count: number;
  subtotal: number;
  mrpTotal: number;
  savings: number;
  discount: number;
  shipping: number;
  total: number;
  freeDeliveryThreshold: number;
};

const EMPTY_TOTALS: CartTotals = {
  count: 0,
  subtotal: 0,
  mrpTotal: 0,
  savings: 0,
  discount: 0,
  shipping: 0,
  total: 0,
  freeDeliveryThreshold: 999,
};

type CartState = {
  lines: CartLine[];
  totals: CartTotals;
  couponCode: string;
  couponReason?: string;
  loaded: boolean;
  busy: boolean;
  error: string;

  isOpen: boolean;
  open: () => void;
  close: () => void;

  load: () => Promise<void>;
  add: (product: Product, size?: string, color?: string, qty?: number) => Promise<void>;
  setQty: (line: Pick<CartLine, "productId" | "size" | "color">, qty: number) => Promise<void>;
  remove: (line: Pick<CartLine, "productId" | "size" | "color">) => Promise<void>;
  clear: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
};

/** Unique per product + size + colour, not per product. */
export const lineKey = (l: Pick<CartLine, "productId" | "size" | "color">) =>
  `${l.productId}__${l.size}__${l.color}`;

/**
 * Cart, server-backed.
 *
 * The API owns pricing and totals: line prices are re-derived from the live
 * product on every read, so a stale client can never charge an old price.
 * Guests get a cart keyed to an httpOnly cookie, which the API folds into the
 * account on sign-in — nothing added before signing in is lost.
 */
export const useCart = create<CartState>((set, get) => {
  /** Every mutation returns the whole cart; adopt it verbatim. */
  const adopt = (data: {
    lines?: CartLine[];
    totals?: CartTotals;
    couponCode?: string;
    couponReason?: string;
  }) =>
    set({
      lines: data?.lines ?? [],
      totals: data?.totals ?? EMPTY_TOTALS,
      couponCode: data?.couponCode ?? "",
      couponReason: data?.couponReason,
      loaded: true,
      busy: false,
      error: "",
    });

  const run = async (fn: () => Promise<unknown>, openAfter = false) => {
    set({ busy: true, error: "" });
    try {
      adopt((await fn()) as never);
      if (openAfter) set({ isOpen: true });
    } catch (err) {
      set({
        busy: false,
        error: err instanceof Error ? err.message : "Something went wrong",
      });
      throw err;
    }
  };

  return {
    lines: [],
    totals: EMPTY_TOTALS,
    couponCode: "",
    loaded: false,
    busy: false,
    error: "",

    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),

    load: async () => {
      if (get().busy) return;
      set({ busy: true });
      try {
        adopt((await cartApi.get()) as never);
      } catch {
        // A failed read must not blank a cart the visitor can still see.
        set({ busy: false, loaded: true });
      }
    },

    add: (product, size = "", color = "", qty = 1) =>
      run(
        () =>
          cartApi.addItem({
            productId: product._id,
            size: size || product.sizes?.[0] || "",
            color: color || product.colors?.[0]?.name || "",
            qty,
          }),
        true,
      ),

    setQty: (line, qty) => run(() => cartApi.updateItem({ ...line, qty })),
    remove: (line) => run(() => cartApi.removeItem(line)),
    clear: () => run(() => cartApi.clear()),
    applyCoupon: (code) => run(() => cartApi.applyCoupon(code)),
    removeCoupon: () => run(() => cartApi.removeCoupon()),
  };
});

/**
 * Loads the cart once per page load.
 *
 * Mounted high in the tree so a page with a header badge, a drawer and a cart
 * page still makes one request rather than three.
 */
export function useCartBootstrap() {
  const loaded = useCart((s) => s.loaded);
  const load = useCart((s) => s.load);

  /* In an effect, not during render. React may call a render function more
     than once (Strict Mode, concurrent re-renders) and discard the result —
     firing a request from there means duplicate calls and a state update
     during another component's render. */
  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);
}
