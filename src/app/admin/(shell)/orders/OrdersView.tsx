"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Download, ReceiptText, Search, X } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Select,
  TableWrap,
  Td,
  Th,
} from "@/components/admin/ui";
import { StatusPill } from "@/components/admin/StatusPill";
import type { Order, OrderStatus } from "@/lib/admin/types";
import { inr } from "@/lib/data";
import { cn } from "@/lib/utils";

const STATUSES: OrderStatus[] = [
  "pending", "confirmed", "packed", "shipped", "delivered", "cancelled", "returned",
];

export function OrdersView({ orders }: { orders: Order[] }) {
  const [rows, setRows] = useState(orders);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [payment, setPayment] = useState<string>("");
  const [open, setOpen] = useState<Order | null>(null);

  const filtered = useMemo(
    () =>
      rows.filter((o) => {
        if (status && o.status !== status) return false;
        if (payment && o.payment !== payment) return false;
        if (q) {
          const hay = `${o.orderNo} ${o.customer.name} ${o.customer.email} ${o.city}`.toLowerCase();
          if (!hay.includes(q.toLowerCase())) return false;
        }
        return true;
      }),
    [rows, q, status, payment],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const o of rows) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const setStatusFor = (id: string, next: OrderStatus) => {
    setRows((prev) => prev.map((o) => (o._id === id ? { ...o, status: next } : o)));
    setOpen((o) => (o && o._id === id ? { ...o, status: next } : o));
  };

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle={`${rows.length} orders`}
        actions={
          <Button variant="secondary" size="sm">
            <Download className="size-4" />
            Export CSV
          </Button>
        }
      />

      {/* Status chips double as filters and as an at-a-glance summary. */}
      <div className="rail mb-3 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setStatus("")}
          className={cn(
            "shrink-0 rounded-xl border px-3 py-2 text-xs font-bold transition",
            status === "" ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft",
          )}
        >
          All <span className="opacity-60">{rows.length}</span>
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(status === s ? "" : s)}
            className={cn(
              "shrink-0 rounded-xl border px-3 py-2 text-xs font-bold capitalize transition",
              status === s ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft",
            )}
          >
            {s} <span className="opacity-60">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      <Card bodyClassName="p-3 sm:p-3" className="mb-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex flex-1 items-center">
            <Search className="pointer-events-none absolute left-3 size-4 text-ink-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search order number, customer or city…"
              aria-label="Search orders"
              className="h-10 w-full rounded-xl border border-line bg-cream pl-9 pr-3 text-sm outline-none focus:border-brand-300 focus:bg-white"
            />
          </label>
          <Select
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
            aria-label="Filter by payment"
            className="!py-2 text-xs sm:w-44"
          >
            <option value="">Any payment</option>
            <option value="prepaid">Prepaid</option>
            <option value="cod">Cash on delivery</option>
          </Select>
        </div>
      </Card>

      <Card bodyClassName="p-0 sm:p-0">
        {filtered.length === 0 ? (
          <EmptyState icon={ReceiptText} title="No orders match" copy="Try a different filter." />
        ) : (
          <TableWrap>
            <table className="min-w-full">
              <thead className="border-b border-line bg-cream/60">
                <tr>
                  <Th>Order</Th>
                  <Th>Customer</Th>
                  <Th className="hidden lg:table-cell">Placed</Th>
                  <Th className="hidden sm:table-cell">Payment</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Total</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((o) => (
                  <tr
                    key={o._id}
                    onClick={() => setOpen(o)}
                    className="cursor-pointer transition hover:bg-cream/50"
                  >
                    <Td>
                      <p className="font-bold">{o.orderNo}</p>
                      <p className="text-[11px] text-ink-muted">{o.items.length} items</p>
                    </Td>
                    <Td>
                      <p className="font-semibold">{o.customer.name}</p>
                      <p className="text-[11px] text-ink-muted">{o.city}</p>
                    </Td>
                    <Td className="hidden text-xs text-ink-soft lg:table-cell">
                      {new Date(o.placedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Td>
                    <Td className="hidden sm:table-cell">
                      <Badge tone={o.payment === "cod" ? "sun" : "mint"}>
                        {o.payment === "cod" ? "COD" : "Prepaid"}
                      </Badge>
                    </Td>
                    <Td>
                      <StatusPill status={o.status} />
                    </Td>
                    <Td className="text-right font-bold">{inr(o.total)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(null)}
              className="fixed inset-0 z-50 bg-ink/40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white"
              role="dialog"
              aria-label={`Order ${open.orderNo}`}
            >
              <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <div>
                  <h2 className="font-display text-base font-extrabold">{open.orderNo}</h2>
                  <p className="text-[11px] text-ink-muted">
                    {new Date(open.placedAt).toLocaleString("en-IN")}
                  </p>
                </div>
                <button onClick={() => setOpen(null)} aria-label="Close" className="p-1">
                  <X className="size-5" />
                </button>
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <div className="rounded-xl border border-line p-3">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                    Customer
                  </p>
                  <p className="text-sm font-bold">{open.customer.name}</p>
                  <p className="text-xs text-ink-soft">{open.customer.email}</p>
                  <p className="text-xs text-ink-soft">{open.customer.phone}</p>
                  <p className="mt-1 text-xs text-ink-soft">{open.city}</p>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                    Items
                  </p>
                  <ul className="space-y-2">
                    {open.items.map((it, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-cream">
                          <Image src={it.image} alt="" fill unoptimized sizes="48px" className="object-cover" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold">{it.title}</p>
                          <p className="text-[11px] text-ink-muted">Qty {it.qty}</p>
                        </div>
                        <span className="text-xs font-bold">{inr(it.price * it.qty)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl bg-cream p-3">
                  <div className="flex items-center justify-between text-sm font-extrabold">
                    <span>Total</span>
                    <span>{inr(open.total)}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-ink-muted">
                    {open.payment === "cod" ? "Cash on delivery" : "Paid online"}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                    Update status
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatusFor(open._id, s)}
                        aria-pressed={open.status === s}
                        className={cn(
                          "rounded-lg border px-2.5 py-1.5 text-xs font-semibold capitalize transition",
                          open.status === s
                            ? "border-ink bg-ink text-white"
                            : "border-line bg-white text-ink-soft hover:border-brand-300",
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
