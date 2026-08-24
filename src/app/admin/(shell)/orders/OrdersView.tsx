"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Download, FileText, Printer, ReceiptText, Search, X } from "lucide-react";

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
import { adminApi, ApiError } from "@/utils/service";
import { ShippingPanel } from "@/components/admin/ShippingPanel";
import { OrderTimeline } from "@/components/admin/OrderTimeline";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

/* Cancelling is now the only manual status change left. Accepting, packing and
   booking have their own buttons in the shipping panel, and everything after
   pickup arrives from courier tracking — see ShippingPanel. */
/* Only the statuses an admin may set by hand — once a parcel is shipped the
   courier owns the status and the API rejects manual changes. */
const SETTABLE: OrderStatus[] = ["cancelled"];

const FILTERS: OrderStatus[] = [
  "placed", "confirmed", "packed", "shipped",
  "in-transit", "out-for-delivery", "delivered", "cancelled",
];

export function OrdersView() {
  const [rows, setRows] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [payment, setPayment] = useState<string>("");
  const [open, setOpen] = useState<Order | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.listOrders({
        q: q || undefined,
        status: status || undefined,
        payment: payment || undefined,
        limit: 50,
      });
      setRows((res?.data ?? []) as Order[]);
      setTotal(res?.meta?.total ?? 0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, [q, status, payment]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = rows;

  const counts: Record<string, number> = {};
  for (const o of rows) counts[o.status] = (counts[o.status] ?? 0) + 1;

  /**
   * Pulls the open order back from the API after a fulfilment action.
   *
   * The list row is not enough: accepting or packing writes timestamps, the
   * measured parcel and the AWB, and the panel has to render those rather
   * than an optimistic guess at them.
   */
  const reloadOpen = useCallback(async () => {
    if (!open) return;
    try {
      const res = await adminApi.listOrders({ q: open.orderNo, limit: 1 });
      const fresh = (res?.data ?? [])[0] as Order | undefined;
      if (fresh) setOpen(fresh);
      await load();
    } catch {
      /* The action itself succeeded; a stale panel is not worth an error. */
    }
  }, [open, load]);

  /** Cancelling is the only status an admin still sets by hand. */
  const setStatusFor = async (id: string, next: OrderStatus) => {
    setError("");
    try {
      await adminApi.updateOrderStatus(id, next);
      await load();
      setOpen((o) => (o && o._id === id ? { ...o, status: next } : o));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the status.");
    }
  };

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle={loading ? "Loading…" : `${total} orders`}
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
          All <span className="opacity-60">{total}</span>
        </button>
        {FILTERS.map((s) => (
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

      {error && (
        <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600">
          {error}
        </p>
      )}

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
                      <p className="font-semibold">{o.user?.name ?? "—"}</p>
                      <p className="text-[11px] text-ink-muted">{o.address?.city ?? "—"}</p>
                    </Td>
                    <Td className="hidden text-xs text-ink-soft lg:table-cell">
                      {new Date(o.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Td>
                    <Td className="hidden sm:table-cell">
                      <Badge tone={o.payment?.method === "cod" ? "sun" : "mint"}>
                        {o.payment?.method === "cod" ? "COD" : "Prepaid"}
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
                    {new Date(open.createdAt).toLocaleString("en-IN")}
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
                  <p className="text-sm font-bold">{open.user?.name ?? "—"}</p>
                  <p className="text-xs text-ink-soft">{open.user?.email}</p>
                  <p className="text-xs text-ink-soft">{open.user?.phone}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {[open.address?.city, open.address?.state, open.address?.pincode].filter(Boolean).join(", ")}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                    Items
                  </p>
                  <ul className="space-y-2">
                    {open.items.map((it, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-cream">
                          <Image src={it.image ?? ""} alt="" fill unoptimized sizes="48px" className="object-cover" />
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
                    {open.payment?.method === "cod" ? "Cash on delivery" : "Paid online"}
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <a
                    href={adminApi.invoiceUrl(open._id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-xs font-bold text-ink-soft transition hover:border-brand-300 hover:text-brand-600"
                  >
                    <FileText className="size-4" />
                    Invoice (PDF)
                  </a>

                  {/* Opens in its own tab and prints itself — the slip has no
                      admin chrome, so it must not render inside the shell. */}
                  <a
                    href={`/admin/receipt/${open._id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-xs font-bold text-ink-soft transition hover:border-brand-300 hover:text-brand-600"
                  >
                    <Printer className="size-4" />
                    Packing slip
                  </a>
                </div>

                <ShippingPanel order={open} onChanged={reloadOpen} />

                <OrderTimeline orderId={open._id} status={open.status} />

                {!["cancelled", "delivered", "returned"].includes(open.status) &&
                  SETTABLE.map((s) => (
                    <button
                      key={s}
                      onClick={() => void setStatusFor(open._id, s)}
                      className="w-full rounded-xl border border-red-200 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-50"
                    >
                      Cancel this order
                    </button>
                  ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
