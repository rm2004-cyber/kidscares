"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Flame, Timer } from "lucide-react";
import type { Deal } from "@/lib/types";

/**
 * Countdown. Renders a stable placeholder until mounted — computing a
 * remaining time on the server would produce markup the client immediately
 * contradicts.
 */
function useCountdown(iso: string) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(iso).getTime();
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [iso]);

  if (left === null) return null;
  return {
    h: String(Math.floor(left / 3_600_000)).padStart(2, "0"),
    m: String(Math.floor((left % 3_600_000) / 60_000)).padStart(2, "0"),
    s: String(Math.floor((left % 60_000) / 1000)).padStart(2, "0"),
  };
}

export function DealCountdown({ endsAt }: { endsAt: string }) {
  const t = useCountdown(endsAt);
  const cells = t ? [t.h, t.m, t.s] : ["--", "--", "--"];

  return (
    <div className="flex items-center gap-1.5" aria-live="off">
      <Timer className="size-4 text-brand-600" />
      <span className="text-xs font-semibold text-ink-soft">Ends in</span>
      <span className="flex items-center gap-1">
        {cells.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="min-w-7 rounded-lg bg-ink px-1.5 py-1 text-center font-mono text-xs font-bold text-white tabular-nums">
              {c}
            </span>
            {i < 2 && <span className="text-xs font-bold text-ink-muted">:</span>}
          </span>
        ))}
      </span>
    </div>
  );
}

export function DealsSection({ deals }: { deals: Deal[] }) {
  return (
    <section className="overflow-hidden rounded-card border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-sun-100/60 p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">
            <Flame className="size-6 fill-brand-500 text-brand-500" /> Deals of the Day
          </h2>
          <p className="mt-0.5 text-sm text-ink-soft">
            Hand-picked offers, refreshed every morning.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DealCountdown endsAt={deals[0]?.endsAt ?? new Date().toISOString()} />
          <Link
            href="/deals"
            className="hidden rounded-full border border-brand-300 px-4 py-2 text-xs font-bold text-brand-600 transition hover:bg-brand-500 hover:text-white sm:block"
          >
            View all
          </Link>
        </div>
      </div>

      <ul className="rail -mx-1 flex gap-3 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {deals.map((d) => (
          <li key={d._id} className="w-32 shrink-0 sm:w-auto">
            <Link
              href={d.href}
              className={`group flex h-full flex-col items-center gap-2 rounded-2xl ${d.accent} p-3 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
            >
              <span className="relative size-20 overflow-hidden rounded-full bg-white/70 sm:size-24">
                <Image
                  src={d.image}
                  alt=""
                  fill
                  unoptimized
                  sizes="96px"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </span>
              <span className="text-xs font-bold leading-tight text-ink">
                {d.title}
              </span>
              <span className="mt-auto rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-brand-600 shadow-sm">
                {d.discountLabel}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
