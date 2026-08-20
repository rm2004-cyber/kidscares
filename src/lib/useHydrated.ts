"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * True once React has hydrated on the client, false during SSR.
 *
 * Replaces the useState + useEffect pair this used to be. That version cost a
 * state slot and a post-paint effect *per component* — with ~40 product cards
 * on a grid that was 40 effects firing on mount and a second render pass for
 * every one of them. useSyncExternalStore resolves it during the initial
 * render instead, so there is no extra pass and no per-card effect.
 */
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
