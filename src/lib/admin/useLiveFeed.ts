"use client";

import { useEffect, useRef, useState } from "react";
import { LIVE_CITIES, LIVE_PATHS, REFERRERS } from "./mock";
import type { LiveEvent, LiveVisitor } from "./types";

/**
 * Simulated realtime feed.
 *
 * Everything below is a stand-in for the socket connection. The shapes it
 * produces (`LiveVisitor`, `LiveEvent`) are the shapes the server will emit,
 * and the hook's return value is the contract the UI consumes — so swapping in
 * socket.io is a change to this file alone:
 *
 *   const socket = io();
 *   socket.on("presence:update", setVisitors);
 *   socket.on("event", (e) => setEvents((prev) => [e, ...prev].slice(0, 60)));
 *
 * Nothing in `LiveTrafficView` needs to change.
 */

const EVENT_WEIGHTS: { type: LiveEvent["type"]; weight: number }[] = [
  { type: "pageview", weight: 60 },
  { type: "add_to_cart", weight: 14 },
  { type: "wishlist", weight: 10 },
  { type: "search", weight: 9 },
  { type: "checkout", weight: 5 },
  { type: "order", weight: 2 },
];

const SEARCH_TERMS = ["romper", "school shoes", "soft toy", "diapers", "frock", "lego", "sipper", "winter jacket"];

/** Deterministic PRNG so a mounted session is reproducible while developing. */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function weightedEvent(rng: () => number): LiveEvent["type"] {
  const total = EVENT_WEIGHTS.reduce((s, e) => s + e.weight, 0);
  let r = rng() * total;
  for (const e of EVENT_WEIGHTS) {
    r -= e.weight;
    if (r <= 0) return e.type;
  }
  return "pageview";
}

export type LiveFeed = {
  connected: boolean;
  visitors: LiveVisitor[];
  events: LiveEvent[];
  /** Rolling per-minute visitor counts for the activity chart. */
  history: number[];
};

export function useLiveFeed(): LiveFeed {
  const [connected, setConnected] = useState(false);
  const [visitors, setVisitors] = useState<LiveVisitor[]>([]);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [history, setHistory] = useState<number[]>(() => Array(24).fill(0));
  const seq = useRef(0);

  useEffect(() => {
    const rng = makeRng(20260819);
    const connectTimer = setTimeout(() => setConnected(true), 450);

    // Seed an initial population so the screen is not empty on first paint.
    const seed: LiveVisitor[] = Array.from({ length: 34 }, (_, i) => {
      const p = pick(rng, LIVE_PATHS);
      return {
        id: `v${i}`,
        path: p.path,
        title: p.title,
        device: rng() < 0.68 ? "mobile" : rng() < 0.9 ? "desktop" : "tablet",
        city: pick(rng, LIVE_CITIES),
        referrer: pick(rng, REFERRERS),
        enteredAt: Date.now() - Math.floor(rng() * 600_000),
      };
    });
    setVisitors(seed);
    setHistory(Array.from({ length: 24 }, () => 26 + Math.floor(rng() * 22)));

    /* Churn: some visitors leave, some arrive, some navigate. Mirrors what
       a real presence channel produces. */
    const churn = setInterval(() => {
      setVisitors((prev) => {
        let next = [...prev];

        const leaving = Math.floor(rng() * 3);
        for (let i = 0; i < leaving && next.length > 12; i++) {
          next.splice(Math.floor(rng() * next.length), 1);
        }

        const arriving = Math.floor(rng() * 4);
        for (let i = 0; i < arriving && next.length < 90; i++) {
          const p = pick(rng, LIVE_PATHS);
          next.push({
            id: `v${Date.now()}-${seq.current++}`,
            path: p.path,
            title: p.title,
            device: rng() < 0.68 ? "mobile" : rng() < 0.9 ? "desktop" : "tablet",
            city: pick(rng, LIVE_CITIES),
            referrer: pick(rng, REFERRERS),
            enteredAt: Date.now(),
          });
        }

        // A few existing visitors move to another page.
        next = next.map((v) => {
          if (rng() > 0.9) {
            const p = pick(rng, LIVE_PATHS);
            return { ...v, path: p.path, title: p.title };
          }
          return v;
        });

        return next;
      });
    }, 2600);

    const feed = setInterval(() => {
      const type = weightedEvent(rng);
      const p = pick(rng, LIVE_PATHS);
      const city = pick(rng, LIVE_CITIES);

      const label =
        type === "search"
          ? `Searched “${pick(rng, SEARCH_TERMS)}”`
          : type === "add_to_cart"
            ? `Added ${p.title} to bag`
            : type === "wishlist"
              ? `Saved ${p.title}`
              : type === "checkout"
                ? "Started checkout"
                : type === "order"
                  ? `Placed an order · ₹${(999 + Math.floor(rng() * 4000)).toLocaleString("en-IN")}`
                  : `Viewing ${p.title}`;

      setEvents((prev) =>
        [
          {
            id: `e${Date.now()}-${seq.current++}`,
            type,
            label,
            path: p.path,
            city,
            at: Date.now(),
          },
          ...prev,
        ].slice(0, 60),
      );
    }, 1400);

    const tick = setInterval(() => {
      setVisitors((v) => {
        setHistory((h) => [...h.slice(1), v.length]);
        return v;
      });
    }, 5000);

    return () => {
      clearTimeout(connectTimer);
      clearInterval(churn);
      clearInterval(feed);
      clearInterval(tick);
    };
  }, []);

  return { connected, visitors, events, history };
}
