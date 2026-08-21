"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { wishlistApi } from "@/utils/service";
import type { Product } from "@/lib/types";

type WishlistState = {
  ids: string[];
  products: Product[];
  loaded: boolean;
  busy: boolean;
  load: () => Promise<void>;
  toggle: (productId: string) => Promise<void>;
  clear: () => Promise<void>;
};

/**
 * Wishlist, server-backed.
 *
 * Works for guests as well as signed-in shoppers — the API keys an anonymous
 * list to the guest cookie and merges it into the account on sign-in, so
 * saving something never requires an account first.
 */
export const useWishlist = create<WishlistState>((set, get) => {
  const adopt = (data: { productIds?: string[]; products?: Product[] }) =>
    set({
      ids: data?.productIds ?? [],
      products: data?.products ?? [],
      loaded: true,
      busy: false,
    });

  return {
    ids: [],
    products: [],
    loaded: false,
    busy: false,

    load: async () => {
      if (get().busy) return;
      set({ busy: true });
      try {
        adopt((await wishlistApi.get()) as never);
      } catch {
        set({ busy: false, loaded: true });
      }
    },

    toggle: async (productId) => {
      /* Optimistic: the heart must respond on the tap, not after a round
         trip. Reconciled with the server's list when the call returns. */
      const before = get().ids;
      const next = before.includes(productId)
        ? before.filter((id) => id !== productId)
        : [...before, productId];
      set({ ids: next });

      try {
        adopt((await wishlistApi.toggle(productId)) as never);
      } catch {
        set({ ids: before });
      }
    },

    clear: async () => {
      set({ busy: true });
      try {
        adopt((await wishlistApi.clear()) as never);
      } catch {
        set({ busy: false });
      }
    },
  };
});

export function useWishlistBootstrap() {
  const loaded = useWishlist((s) => s.loaded);
  const load = useWishlist((s) => s.load);

  // See useCartBootstrap: this must not run during render.
  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);
}
