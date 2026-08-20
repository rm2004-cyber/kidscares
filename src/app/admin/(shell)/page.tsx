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
import { AreaChart, BarChart, DonutChart, Sparkline } from "@/components/admin/Charts";
import { StatusPill } from "@/components/admin/StatusPill";
import {
  lowStock,
  orders,
  revenueSeries,
  topCategoriesStat,
  trafficSeries,
} from "@/lib/admin/mock";
import { inr, products } from "@/lib/data";

export const metadata = { title: "Dashboard" };

const STATS = [
  {
    label: "Revenue (7d)",
    value: inr(revenueSeries.reduce((s, d) => s + d.value, 0)),
    delta: 12.4,
    icon: IndianRupee,
    tone: "bg-brand-50 text-brand-600",
    spark: revenueSeries.map((d) => d.value),
  },
  {
    label: "Orders (7d)",
    value: "1,284",
    delta: 8.1,
    icon: ShoppingCart,
    tone: "bg-mint-50 text-mint-600",
    spark: [180, 165, 190, 172, 210, 236, 218],
  },
  {
    label: "Visitors (7d)",
    value: "48,920",
    delta: -3.2,
    icon: Users,
    tone: "bg-sky-ks/10 text-sky-700",
    spark: [7600, 7100, 7400, 6900, 6800, 6600, 6520],
  },
  {
    label: "Live Products",
    value: String(products.length),
    delta: 4.0,
    icon: Package,
    tone: "bg-grape-100 text-grape-600",
    spark: [26, 27, 28, 29, 30, 31, 32],
  },
];

export default function AdminDashboard() {
  const recent = orders.slice(0, 8);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="How the store is doing over the last seven days."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((s) => {
          const up = s.delta >= 0;
          return (
            <div
              key={s.label}
              className="rounded-2xl border border-line bg-white p-4"
            >
              <div className="flex items-start justify-between">
                <span className={`grid size-9 place-items-center rounded-xl ${s.tone}`}>
                  <s.icon className="size-4.5" />
                </span>
                <Sparkline
                  values={s.spark}
                  color={up ? "var(--color-mint-500)" : "var(--color-brand-500)"}
                />
              </div>
              <p className="mt-3 text-xs font-semibold text-ink-muted">{s.label}</p>
              <p className="font-display text-2xl font-extrabold text-ink">
                {s.value}
              </p>
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
                {Math.abs(s.delta)}% vs last week
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card
          title="Revenue"
          description="Daily gross merchandise value"
          className="xl:col-span-2"
        >
          <AreaChart data={revenueSeries} format="inr" color="var(--color-brand-500)" />
        </Card>

        <Card title="Orders by category" description="Share of last 7 days">
          <DonutChart data={topCategoriesStat} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Traffic by hour" description="Sessions today" className="xl:col-span-2">
          <BarChart data={trafficSeries} />
        </Card>

        <Card
          title="Out of stock"
          description={`${lowStock.length} products need restocking`}
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-line">
            {lowStock.map((p) => (
              <li key={p._id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-cream">
                  <Image src={p.images[0]} alt="" fill unoptimized sizes="40px" className="object-cover" />
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
      </div>

      <Card
        title="Recent orders"
        className="mt-4"
        bodyClassName="p-0 sm:p-0"
        actions={
          <Link
            href="/admin/orders"
            className="text-xs font-bold text-brand-600 hover:underline"
          >
            View all
          </Link>
        }
      >
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
                    <p className="font-semibold">{o.customer.name}</p>
                    <p className="text-[11px] text-ink-muted">{o.items.length} items</p>
                  </Td>
                  <Td className="hidden text-ink-soft sm:table-cell">{o.city}</Td>
                  <Td>
                    <StatusPill status={o.status} />
                  </Td>
                  <Td className="hidden md:table-cell">
                    <Badge tone={o.payment === "cod" ? "sun" : "mint"}>
                      {o.payment === "cod" ? "COD" : "Prepaid"}
                    </Badge>
                  </Td>
                  <Td className="text-right font-bold">{inr(o.total)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    </>
  );
}
