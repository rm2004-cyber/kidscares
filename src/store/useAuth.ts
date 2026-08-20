"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

type AuthState = {
  user: User | null;
  signIn: (u: User) => void;
  signOut: () => void;
};

/**
 * Session store.
 *
 * Client-only and persisted, which is correct for a preview build but NOT a
 * real auth boundary — anyone can edit localStorage. When the backend lands,
 * `user` gets hydrated from an httpOnly session cookie and the gate moves into
 * middleware; the component contract below stays the same.
 */
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      signIn: (user) => set({ user }),
      signOut: () => set({ user: null }),
    }),
    { name: "kidscares-session" },
  ),
);

/** Builds a sign-in URL that returns the visitor to where they were headed. */
export function loginHref(next: string) {
  return `/login?next=${encodeURIComponent(next)}`;
}
