"use client";

import { useEffect } from "react";
import { create } from "zustand";

type SurfaceState = {
  /** Category key driving the backdrop, or null for the neutral theme. */
  key: string | null;
  setKey: (k: string | null) => void;
};

export const useSurfaceStore = create<SurfaceState>((set) => ({
  key: null,
  setKey: (key) => set((s) => (s.key === key ? s : { key })),
}));

/**
 * Declares which surface theme a route should show.
 *
 * Rendered by pages that know their category — including product pages, where
 * the category cannot be derived from the URL. Resets to the neutral theme on
 * unmount so navigating away never strands the previous colours.
 */
export function SurfaceTheme({ theme }: { theme: string | null }) {
  const setKey = useSurfaceStore((s) => s.setKey);

  useEffect(() => {
    setKey(theme);
    return () => setKey(null);
  }, [theme, setKey]);

  return null;
}
