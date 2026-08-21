"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { authApi } from "@/utils/service";

export type User = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  addresses?: unknown[];
};

type AuthState = {
  user: User | null;
  /** null = not checked yet, so the UI can show a spinner instead of guessing. */
  ready: boolean;
  setUser: (u: User | null) => void;
  refresh: () => Promise<User | null>;
  signOut: () => Promise<void>;
};

/**
 * Session state.
 *
 * The session itself lives in an httpOnly cookie the browser cannot read, so
 * this store holds only the resolved user for rendering. It is deliberately
 * NOT persisted: localStorage would let a signed-out visitor keep looking
 * signed in until the first failed request.
 */
export const useAuth = create<AuthState>((set) => ({
  user: null,
  ready: false,

  setUser: (user) => set({ user, ready: true }),

  refresh: async () => {
    try {
      const data = await authApi.me();
      const user = (data?.user ?? null) as User | null;
      set({ user, ready: true });
      return user;
    } catch {
      set({ user: null, ready: true });
      return null;
    }
  },

  signOut: async () => {
    try {
      await authApi.logout();
    } finally {
      set({ user: null, ready: true });
    }
  },
}));

/**
 * Resolves the session once per page load.
 *
 * Mounted high in the tree; every other component just reads the store, so a
 * page with ten auth-aware components still makes one /auth/me call.
 */
export function useSessionBootstrap() {
  const ready = useAuth((s) => s.ready);
  const refresh = useAuth((s) => s.refresh);

  useEffect(() => {
    if (!ready) void refresh();
  }, [ready, refresh]);
}

/** Builds a sign-in URL that returns the visitor to where they were headed. */
export function loginHref(next: string) {
  return `/login?next=${encodeURIComponent(next)}`;
}
