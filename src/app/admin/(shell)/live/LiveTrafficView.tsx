"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Eye,
  Heart,
  Laptop,
  MapPin,
  Monitor,
  Search,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Tablet,
  Wallet,
} from "lucide-react";

import { Badge, Card, PageHeader, TableWrap, Td, Th } from "@/components/admin/ui";
import { useLiveFeed } from "@/lib/admin/useLiveFeed";
import type { LiveEvent } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

const EVENT_STYLE: Record<
  LiveEvent["type"],
  { icon: typeof Eye; tone: string; ring: string }
> = {
  pageview: { icon: Eye, tone: "text-ink-soft", ring: "bg-cream" },
  add_to_cart: { icon: ShoppingCart, tone: "text-brand-600", ring: "bg-brand-50" },
  wishlist: { icon: Heart, tone: "text-grape-600", ring: "bg-grape-100" },
  search: { icon: Search, tone: "text-sky-700", ring: "bg-sky-ks/10" },
  checkout: { icon: Wallet, tone: "text-amber-700", ring: "bg-sun-100" },
  order: { icon: ShoppingBag, tone: "text-mint-700", ring: "bg-mint-50" },
};

const DEVICE_ICON = { mobile: Smartphone, desktop: Monitor, tablet: Tablet };

export function LiveTrafficView() {
  const { connected, visitors, events, history } = useLiveFeed();

  /* Aggregations are derived, never stored — the visitor list is the single
     source of truth, exactly as it will be when it arrives over the socket. */
  const byPage = useMemo(() => {
    const map = new Map<string, { title: string; path: string; count: number }>();
    for (const v of visitors) {
      const hit = map.get(v.path);
      if (hit) hit.count++;
      else map.set(v.path, { title: v.title, path: v.path, count: 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [visitors]);

  const byCity = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of visitors) map.set(v.city, (map.get(v.city) ?? 0) + 1);
    return [...map.entries()]
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [visitors]);

  const byReferrer = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of visitors) map.set(v.referrer, (map.get(v.referrer) ?? 0) + 1);
    return [...map.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  }, [visitors]);

  const devices = useMemo(() => {
    const d = { mobile: 0, desktop: 0, tablet: 0 };
    for (const v of visitors) d[v.device]++;
    return d;
  }, [visitors]);

  const inCart = visitors.filter((v) => v.path === "/cart").length;
  const onProduct = visitors.filter((v) => v.path.startsWith("/product/")).length;
  const peak = Math.max(...history, 1);

  return (
    <>
      <PageHeader
        title="Live Traffic"
        subtitle="Who is on the site right now, and what they are doing."
        actions={
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1",
              connected
                ? "bg-mint-50 text-mint-700 ring-mint-200"
                : "bg-cream text-ink-muted ring-line",
            )}
          >
            <span className="relative flex size-2">
              {connected && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint-400 opacity-75" />
              )}
              <span
                className={cn(
                  "relative inline-flex size-2 rounded-full",
                  connected ? "bg-mint-500" : "bg-ink-muted",
                )}
              />
            </span>
            {connected ? "Connected" : "Connecting…"}
          </span>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BigStat
          label="Visitors online"
          value={visitors.length}
          accent="text-mint-600"
          sub="right now"
        />
        <BigStat
          label="Viewing a product"
          value={onProduct}
          accent="text-brand-600"
          sub={`${Math.round((onProduct / Math.max(visitors.length, 1)) * 100)}% of traffic`}
        />
        <BigStat
          label="In the bag"
          value={inCart}
          accent="text-sky-700"
          sub="on /cart"
        />
        <BigStat
          label="Peak (2 min)"
          value={peak}
          accent="text-grape-600"
          sub="concurrent visitors"
        />
      </div>

      <Card title="Concurrent visitors" description="Sampled every 5 seconds" className="mt-4">
        <div className="flex h-28 items-end gap-1">
          {history.map((h, i) => (
            <motion.div
              key={i}
              className="flex-1 rounded-t bg-mint-400/80"
              animate={{ height: `${(h / peak) * 100}%` }}
              transition={{ duration: 0.4 }}
              style={{ minHeight: 3 }}
            />
          ))}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <Card
          title="Live activity"
          description="Newest first"
          bodyClassName="p-0 sm:p-0"
        >
          <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">
            <AnimatePresence initial={false}>
              {events.map((e) => {
                const { icon: Icon, tone, ring } = EVENT_STYLE[e.type];
                return (
                  <motion.li
                    key={e.id}
                    layout
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22 }}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", ring)}>
                      <Icon className={cn("size-4", tone)} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-ink">{e.label}</p>
                      <p className="flex items-center gap-1 text-[11px] text-ink-muted">
                        <MapPin className="size-2.5" />
                        {e.city}
                        <span className="text-line">·</span>
                        <span className="truncate">{e.path}</span>
                      </p>
                    </div>
                    <TimeAgo at={e.at} />
                  </motion.li>
                );
              })}
            </AnimatePresence>
            {events.length === 0 && (
              <li className="px-4 py-12 text-center text-sm text-ink-muted">
                Waiting for activity…
              </li>
            )}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card title="Top pages" description="By visitors on page" bodyClassName="p-0 sm:p-0">
            <TableWrap>
              <table className="min-w-full">
                <thead className="border-b border-line bg-cream/60">
                  <tr>
                    <Th>Page</Th>
                    <Th className="text-right">Visitors</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {byPage.slice(0, 8).map((p) => (
                    <tr key={p.path}>
                      <Td>
                        <p className="truncate text-xs font-semibold">{p.title}</p>
                        <p className="truncate text-[11px] text-ink-muted">{p.path}</p>
                      </Td>
                      <Td className="text-right">
                        <span className="inline-flex items-center gap-2">
                          <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-line sm:block">
                            <span
                              className="block h-full rounded-full bg-mint-400"
                              style={{
                                width: `${(p.count / (byPage[0]?.count || 1)) * 100}%`,
                              }}
                            />
                          </span>
                          <b className="text-sm">{p.count}</b>
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Card>

          <Card title="Devices">
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(devices) as (keyof typeof devices)[]).map((k) => {
                const Icon = DEVICE_ICON[k];
                const pct = Math.round((devices[k] / Math.max(visitors.length, 1)) * 100);
                return (
                  <div key={k} className="rounded-xl bg-cream p-3 text-center">
                    <Icon className="mx-auto size-4 text-ink-soft" />
                    <p className="mt-1 font-display text-lg font-extrabold text-ink">{pct}%</p>
                    <p className="text-[10px] font-semibold capitalize text-ink-muted">{k}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Traffic sources">
            <ul className="space-y-2">
              {byReferrer.map((r) => (
                <li key={r.source} className="flex items-center gap-2 text-xs">
                  <span className="w-24 shrink-0 truncate font-semibold text-ink">
                    {r.source}
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                    <motion.span
                      className="block h-full rounded-full bg-brand-400"
                      animate={{
                        width: `${(r.count / Math.max(visitors.length, 1)) * 100}%`,
                      }}
                      transition={{ duration: 0.4 }}
                    />
                  </span>
                  <b className="w-6 text-right text-ink">{r.count}</b>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card
        title="Visitors by city"
        description="Top locations right now"
        className="mt-4"
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {byCity.map((c) => (
            <div
              key={c.city}
              className="flex items-center gap-2 rounded-xl border border-line px-3 py-2"
            >
              <Laptop className="size-4 shrink-0 text-ink-muted" />
              <span className="truncate text-xs font-semibold text-ink">{c.city}</span>
              <Badge tone="mint" className="ml-auto">
                {c.count}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function BigStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-xs font-semibold text-ink-muted">{label}</p>
      <motion.p
        key={value}
        initial={{ opacity: 0.55, y: -3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className={cn("font-display text-3xl font-extrabold tabular-nums", accent)}
      >
        {value}
      </motion.p>
      <p className="text-[11px] text-ink-muted">{sub}</p>
    </div>
  );
}

function TimeAgo({ at }: { at: number }) {
  const secs = Math.max(0, Math.floor((Date.now() - at) / 1000));
  return (
    <span className="shrink-0 text-[10px] font-semibold tabular-nums text-ink-muted">
      {secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m`}
    </span>
  );
}
