"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type WishlistState = {
  ids: string[];
  toggle: (id: string) => void;
  clear: () => void;
};

export const useWishlist = create<WishlistState>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (id) =>
        set((state) => ({
          ids: state.ids.includes(id)
            ? state.ids.filter((x) => x !== id)
            : [...state.ids, id],
        })),
      clear: () => set({ ids: [] }),
    }),
    { name: "kidscare-wishlist" },
  ),
);

/*
 * Persisted state lives in localStorage, which the server cannot see, so any
 * component showing counts or filled hearts must render the empty state on
 * first paint. That guard is `useHydrated` in @/lib/useHydrated.
 */
