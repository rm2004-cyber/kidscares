"use client";

import { useEffect, useState } from "react";
import { adminApi, adminAuthApi } from "@/utils/service";
import {
  subscribeAdmin,
  type LiveEvent,
  type LiveVisitor,
  type PresenceSnapshot,
} from "@/utils/socket";

export type LiveFeed = {
  connected: boolean;
  visitors: LiveVisitor[];
  events: LiveEvent[];
  byPath: PresenceSnapshot["byPath"];
  byCity: PresenceSnapshot["byCity"];
  byReferrer: PresenceSnapshot["byReferrer"];
  byDevice: PresenceSnapshot["byDevice"];
  history: number[];
};

const EMPTY: PresenceSnapshot = {
  online: 0,
  visitors: [],
  byPath: [],
  byCity: [],
  byReferrer: [],
  byDevice: { mobile: 0, desktop: 0, tablet: 0 },
  at: 0,
};

/**
 * Live traffic, straight off the socket.
 *
 * The dashboard renders an immediate REST snapshot so it is never blank, then
 * the socket takes over and pushes an update once a second. Aggregations are
 * computed server-side — a browser reducing a few thousand visitors on every
 * tick would drop frames.
 */
export function useLiveFeed(): LiveFeed {
  const [connected, setConnected] = useState(false);
  const [snapshot, setSnapshot] = useState<PresenceSnapshot>(EMPTY);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [history, setHistory] = useState<number[]>(() => Array(24).fill(0));

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

    // First paint from REST; the socket then keeps it current.
    adminApi
      .liveSnapshot()
      .then((s) => !cancelled && s && setSnapshot(s as PresenceSnapshot))
      .catch(() => {});

    adminApi
      .liveEvents(40)
      .then((list) => {
        if (cancelled) return;
        setEvents(
          ((list ?? []) as { _id: string; type: string; label: string; path: string; city: string; at: string }[])
            .map((e) => ({
              id: e._id,
              type: e.type as LiveEvent["type"],
              label: e.label,
              path: e.path,
              city: e.city,
              at: new Date(e.at).getTime(),
            })),
        );
      })
      .catch(() => {});

    adminApi
      .liveHistory(120)
      .then((rows) => {
        if (cancelled) return;
        const points = ((rows ?? []) as { online: number }[]).map((r) => r.online);
        if (points.length) setHistory(points.slice(-24));
      })
      .catch(() => {});

    /* The socket authenticates with a short-lived token minted by
       /auth/admin/me — the session cookie itself is httpOnly and cannot be
       read, and socket.io cannot rely on cookies cross-origin. */
    adminAuthApi
      .me()
      .then((data) => {
        if (cancelled || !data?.socketToken) return;
        unsubscribe = subscribeAdmin(data.socketToken, {
          onStatus: (ok) => !cancelled && setConnected(ok),
          onPresence: (snap) => {
            if (cancelled) return;
            setSnapshot(snap);
            setHistory((h) => [...h.slice(1), snap.online]);
          },
          onEvent: (e) => {
            if (cancelled) return;
            setEvents((prev) => [e, ...prev].slice(0, 60));
          },
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return {
    connected,
    visitors: snapshot.visitors,
    events,
    byPath: snapshot.byPath,
    byCity: snapshot.byCity,
    byReferrer: snapshot.byReferrer,
    byDevice: snapshot.byDevice,
    history,
  };
}
