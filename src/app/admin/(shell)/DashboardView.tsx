"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  IndianRupee,
  Package,
  ShoppingCart,
  Users,
} from "lucide-react";

import { Badge, Card, PageHeader, TableWrap, Td, Th } from "@/components/admin/ui";
import { AreaChart, DonutChart } from "@/components/admin/Charts";
import { StatusPill } from "@/components/admin/StatusPill";
import { adminApi } from "@/utils/service";
import { inr } from "@/lib/format";
import type { Order } from "@/lib/admin/types";

type Stats = {
  revenue: { value: number; delta: number };
  orders: { value: number; delta: number };
  customers: { value: number };
  products: { value: number };
  online: number;
  revenueSeries: { label: string; value: number }[];
  topCategories: { label: string; value: number }[];
  lowStock: { _id: string; title: string; brand: string; images?: { url: string }[] }[];
};

const DONUT_COLORS = [
  "var(--color-brand-500)",
  "var(--color-sun-400)",
  "var(--color-mint-400)",
  "var(--color-sky-ks)",
  "var(--color-grape-500)",
];

export function DashboardView() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.stats().catch(() => null),
      adminApi.listOrders({ limit: 8 }).catch(() => null),
    ])
      .then(([s, o]) => {
        setStats(s as Stats | null);
        setRecent((o?.data ?? []) as Order[]);
      })
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      label: "Revenue (7d)",
      value: inr(stats?.revenue.value ?? 0),
      delta: stats?.revenue.delta ?? 0,
      icon: IndianRupee,
      tone: "bg-brand-50 text-brand-600",
    },
    {
      label: "Orders (7d)",
      value: String(stats?.orders.value ?? 0),
      delta: stats?.orders.delta ?? 0,
      icon: ShoppingCart,
      tone: "bg-mint-50 text-mint-600",
    },
    {
      label: "Customers",
      value: String(stats?.customers.value ?? 0),
      icon: Users,
      tone: "bg-sky-ks/10 text-sky-700",
    },
    {
      label: "Live products",
      value: String(stats?.products.value ?? 0),
      icon: Package,
      tone: "bg-grape-100 text-grape-600",
    },
  ];

  if (loading) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Loading…" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton mt-4 h-64 rounded-2xl" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`How the store is doing over the last seven days · ${stats?.online ?? 0} visitors online`}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const up = (c.delta ?? 0) >= 0;
          return (
            <div key={c.label} className="rounded-2xl border border-line bg-white p-4">
              <span className={`grid size-9 place-items-center rounded-xl ${c.tone}`}>
                <c.icon className="size-4.5" />
              </span>
              <p className="mt-3 text-xs font-semibold text-ink-muted">{c.label}</p>
              <p className="font-display text-2xl font-extrabold text-ink">{c.value}</p>
              {c.delta !== undefined && (
                <p
                  className={`mt-0.5 flex items-center gap-0.5 text-[11px] font-bold ${
                    up ? "text-mint-600" : "text-brand-600"
                  }`}
                >
                  {up ? (
                    <ArrowUpRight className="size-3" />
                  ) : (
                    <ArrowDownRight className="size-3" />
                  )}
                  {Math.abs(c.delta)}% vs last week
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Revenue" description="Daily, last 7 days" className="xl:col-span-2">
          {stats?.revenueSeries?.length ? (
            <AreaChart data={stats.revenueSeries} format="inr" color="var(--color-brand-500)" />
          ) : (
            <p className="py-12 text-center text-sm text-ink-muted">No orders yet.</p>
          )}
        </Card>

        <Card title="Units by brand" description="Last 7 days">
          {stats?.topCategories?.length ? (
            <DonutChart
              data={stats.topCategories.map((c, i) => ({
                label: c.label,
                value: c.value,
                color: DONUT_COLORS[i % DONUT_COLORS.length],
              }))}
            />
          ) : (
            <p className="py-12 text-center text-sm text-ink-muted">No sales yet.</p>
          )}
        </Card>
      </div>

      {(stats?.lowStock?.length ?? 0) > 0 && (
        <Card
          title="Out of stock"
          description={`${stats!.lowStock.length} products need restocking`}
          className="mt-4"
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-line">
            {stats!.lowStock.map((p) => (
              <li key={p._id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-cream">
                  {p.images?.[0]?.url && (
                    <Image src={p.images[0].url} alt="" fill unoptimized sizes="40px" className="object-cover" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink">{p.title}</p>
                  <p className="text-[11px] text-ink-muted">{p.brand}</p>
                </div>
                <Badge tone="red">0 left</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card
        title="Recent orders"
        className="mt-4"
        bodyClassName="p-0 sm:p-0"
        actions={
          <Link href="/admin/orders" className="text-xs font-bold text-brand-600 hover:underline">
            View all
          </Link>
        }
      >
        {recent.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-muted">No orders yet.</p>
        ) : (
          <>
            <ul className="divide-y divide-line sm:hidden">
              {recent.map((o) => (
                <li key={o._id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">{o.orderNo}</p>
                      <p className="truncate text-[11px] text-ink-muted">
                        {o.user?.name ?? "—"}
                        {o.address?.city ? ` · ${o.address.city}` : ""}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-extrabold text-ink">{inr(o.total)}</p>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <StatusPill status={o.status} />
                    <Badge tone={o.payment?.method === "cod" ? "sun" : "mint"}>
                      {o.payment?.method === "cod" ? "COD" : "Prepaid"}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden sm:block">
              <TableWrap>
                <table className="min-w-full">
                  <thead className="border-b border-line bg-cream/60">
                <tr>
                  <Th>Order</Th>
                  <Th>Customer</Th>
                  <Th className="hidden sm:table-cell">City</Th>
                  <Th>Status</Th>
                  <Th className="hidden md:table-cell">Payment</Th>
                  <Th className="text-right">Total</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recent.map((o) => (
                  <tr key={o._id} className="transition hover:bg-cream/50">
                    <Td className="font-bold">{o.orderNo}</Td>
                    <Td>
                      <p className="font-semibold">{o.user?.name ?? "—"}</p>
                      <p className="text-[11px] text-ink-muted">{o.items.length} items</p>
                    </Td>
                    <Td className="hidden text-ink-soft sm:table-cell">
                      {o.address?.city ?? "—"}
                    </Td>
                    <Td>
                      <StatusPill status={o.status} />
                    </Td>
                    <Td className="hidden md:table-cell">
                      <Badge tone={o.payment?.method === "cod" ? "sun" : "mint"}>
                        {o.payment?.method === "cod" ? "COD" : "Prepaid"}
                      </Badge>
                    </Td>
                    <Td className="text-right font-bold">{inr(o.total)}</Td>
                  </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
