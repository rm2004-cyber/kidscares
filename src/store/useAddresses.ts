"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Address } from "@/lib/account/types";
import { seedAddresses } from "@/lib/account/mock";

type AddressState = {
  addresses: Address[];
  add: (a: Omit<Address, "_id">) => string;
  update: (id: string, patch: Partial<Address>) => void;
  remove: (id: string) => void;
  setDefault: (id: string) => void;
};

/**
 * Address book.
 *
 * Persisted locally so adding or editing survives a reload — the screens are
 * genuinely usable before any backend exists. Swapping to the API later means
 * replacing the three mutators with fetch calls; the component contract holds.
 */
export const useAddresses = create<AddressState>()(
  persist(
    (set, get) => ({
      addresses: seedAddresses,

      add: (a) => {
        const _id = `ad${Date.now()}`;
        set((s) => {
          // First address is always the default, regardless of what was asked.
          const isFirst = s.addresses.length === 0;
          const isDefault = isFirst || a.isDefault;
          return {
            addresses: [
              ...(isDefault
                ? s.addresses.map((x) => ({ ...x, isDefault: false }))
                : s.addresses),
              { ...a, _id, isDefault },
            ],
          };
        });
        return _id;
      },

      update: (id, patch) =>
        set((s) => {
          const promoting = patch.isDefault === true;
          return {
            addresses: s.addresses.map((x) =>
              x._id === id
                ? { ...x, ...patch }
                : promoting
                  ? { ...x, isDefault: false }
                  : x,
            ),
          };
        }),

      remove: (id) =>
        set((s) => {
          const next = s.addresses.filter((x) => x._id !== id);
          // Never leave the book without a default.
          if (next.length && !next.some((x) => x.isDefault)) next[0].isDefault = true;
          return { addresses: next };
        }),

      setDefault: (id) =>
        set((s) => ({
          addresses: s.addresses.map((x) => ({ ...x, isDefault: x._id === id })),
        })),
    }),
    { name: "kidscares-addresses" },
  ),
);

export const defaultAddress = (list: Address[]) =>
  list.find((a) => a.isDefault) ?? list[0] ?? null;
