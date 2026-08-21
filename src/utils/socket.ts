"use client";

import { io, type Socket } from "socket.io-client";
// Base URL comes from the REST layer so the two can never point at different
// hosts. Change NEXT_PUBLIC_API_URL once and both follow.
import { SOCKET_URL } from "./service";

/* ─────────────────────────────── types ────────────────────────────────── */

export type LiveVisitor = {
  id: string;
  path: string;
  title: string;
  device: "mobile" | "desktop" | "tablet";
  city: string;
  referrer: string;
  enteredAt: number;
};

export type LiveEventType =
  | "pageview"
  | "add_to_cart"
  | "wishlist"
  | "search"
  | "checkout"
  | "order";

export type LiveEvent = {
  id: string;
  type: LiveEventType;
  label: string;
  path: string;
  city: string;
  at: number;
};

export type PresenceSnapshot = {
  online: number;
  visitors: LiveVisitor[];
  byPath: { path: string; title: string; count: number }[];
  byCity: { city: string; count: number }[];
  byReferrer: { source: string; count: number }[];
  byDevice: { mobile: number; desktop: number; tablet: number };
  at: number;
};

/* ─────────────────────────── connection ───────────────────────────────── */

let socket: Socket | null = null;

/**
 * One shared connection per tab.
 *
 * Created lazily so nothing opens during SSR, and reused across components —
 * a socket per component would multiply the presence count by the number of
 * mounted listeners.
 */
export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  if (!socket) {
    socket = io(SOCKET_URL, {
      path: "/socket.io",
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

/* ───────────────────────── storefront presence ────────────────────────── */

function detectDevice(): LiveVisitor["device"] {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function referrerLabel(): string {
  if (typeof document === "undefined" || !document.referrer) return "Direct";
  try {
    const host = new URL(document.referrer).hostname.replace(/^www\./, "");
    return host === window.location.hostname ? "Direct" : host;
  } catch {
    return "Direct";
  }
}

/** Announces this visitor. Call once when the storefront shell mounts. */
export function joinPresence(path: string, title: string) {
  const s = getSocket();
  if (!s) return;

  const payload = {
    path,
    title,
    device: detectDevice(),
    referrer: referrerLabel(),
  };

  s.emit("presence:join", payload);
  // Re-announce after a reconnect, otherwise the visitor silently vanishes
  // from the admin dashboard until they navigate again.
  s.on("connect", () => s.emit("presence:join", payload));
}

/** Reports a route change. */
export function movePresence(path: string, title: string) {
  getSocket()?.emit("presence:move", {
    path,
    title,
    device: detectDevice(),
  });
}

/** Reports a shopper action so it shows in the admin live feed. */
export function trackEvent(event: {
  type: LiveEventType;
  label: string;
  path?: string;
}) {
  getSocket()?.emit("event", {
    ...event,
    path: event.path ?? (typeof window !== "undefined" ? window.location.pathname : "/"),
    device: detectDevice(),
  });
}

/* ───────────────────────────── admin feed ─────────────────────────────── */

/**
 * Subscribes the admin dashboard to presence snapshots and the live event
 * stream. Returns an unsubscribe function — call it on unmount so the handlers
 * do not stack up across navigations.
 */
export function subscribeAdmin(
  token: string,
  handlers: {
    onPresence?: (snapshot: PresenceSnapshot) => void;
    onEvent?: (event: LiveEvent) => void;
    onStatus?: (connected: boolean) => void;
  },
) {
  const s = getSocket();
  if (!s) return () => {};

  const authorise = () =>
    s.emit("admin:subscribe", { token }, (ack: { ok: boolean; error?: string }) => {
      handlers.onStatus?.(Boolean(ack?.ok));
    });

  if (s.connected) authorise();
  s.on("connect", authorise);
  s.on("disconnect", () => handlers.onStatus?.(false));

  const onPresence = (snap: PresenceSnapshot) => handlers.onPresence?.(snap);
  const onEvent = (e: LiveEvent) => handlers.onEvent?.(e);

  s.on("presence:update", onPresence);
  s.on("event", onEvent);

  return () => {
    s.off("connect", authorise);
    s.off("presence:update", onPresence);
    s.off("event", onEvent);
  };
}

export default {
  getSocket,
  disconnectSocket,
  joinPresence,
  movePresence,
  trackEvent,
  subscribeAdmin,
};
