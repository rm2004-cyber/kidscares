"use client";

import { create } from "zustand";
import { accountApi } from "@/utils/service";
import type { Address } from "@/lib/account/types";

type AddressState = {
  addresses: Address[];
  loading: boolean;
  loaded: boolean;
  error: string;
  load: () => Promise<void>;
  add: (a: Omit<Address, "_id">) => Promise<Address | null>;
  update: (id: string, patch: Partial<Address>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setDefault: (id: string) => Promise<void>;
};

/**
 * Address book, server-backed.
 *
 * Every mutation returns the full list from the API, which is then adopted
 * wholesale — the server owns rules like "the first address is always the
 * default", so re-deriving them here would risk the two disagreeing.
 */
export const useAddresses = create<AddressState>((set, get) => ({
  addresses: [],
  loading: false,
  loaded: false,
  error: "",

  load: async () => {
    if (get().loading) return;
    set({ loading: true, error: "" });
    try {
      const list = (await accountApi.listAddresses()) as Address[];
      set({ addresses: list ?? [], loaded: true });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Could not load addresses" });
    } finally {
      set({ loading: false });
    }
  },

  add: async (a) => {
    const list = (await accountApi.addAddress(a)) as Address[];
    set({ addresses: list ?? [], loaded: true });
    // The new entry is the one the server did not have before.
    return list?.[list.length - 1] ?? null;
  },

  update: async (id, patch) => {
    const list = (await accountApi.updateAddress(id, patch)) as Address[];
    set({ addresses: list ?? [] });
  },

  remove: async (id) => {
    const list = (await accountApi.deleteAddress(id)) as Address[];
    set({ addresses: list ?? [] });
  },

  setDefault: async (id) => {
    const list = (await accountApi.setDefaultAddress(id)) as Address[];
    set({ addresses: list ?? [] });
  },
}));

export const defaultAddress = (list: Address[]) =>
  list.find((a) => a.isDefault) ?? list[0] ?? null;
