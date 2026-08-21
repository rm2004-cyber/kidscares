"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  Check,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  PackageX,
  RefreshCw,
  RotateCcw,
  Truck,
  X,
} from "lucide-react";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Textarea,
} from "@/components/admin/ui";
import { adminApi, ApiError } from "@/utils/service";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

type Request = {
  _id: string;
  orderNo: string;
  reasonCode: string;
  reasonText?: string;
  orderStatusAtRequest: string;
  afterShipping: boolean;
  status: "pending" | "approved" | "rejected" | "auto-approved";
  refundRequired: boolean;
  refundAmount: number;
  adminNote?: string;
  createdAt: string;
  transcript?: { from: "bot" | "user"; text: string; at: string }[];
  user?: { name: string; email: string; phone?: string };
  order?: {
    _id: string;
    orderNo: string;
    total: number;
    status: string;
    createdAt: string;
    items: { title: string; qty: number; image?: string; size?: string; color?: string }[];
    address?: { fullName: string; line1: string; city: string; state: string; pincode: string; phone: string };
    payment?: { method: string; status: string };
    shipping_details?: { courier?: string; awb?: string };
  };
};

const STATUS_TONE = {
  pending: "sun",
  approved: "mint",
  "auto-approved": "mint",
  rejected: "red",
} as const;

const TABS = [
  { id: "pending", label: "Needs review" },
  { id: "", label: "All" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

/**
 * Cancellation review queue.
 *
 * Only post-shipping requests land here — anything cancelled before the parcel
 * moved was already handled automatically. Approving one recalls the shipment
 * from the courier, restocks, and triggers the refund, so the note field is
 * worth filling in: it is what the customer's email quotes back.
 */
export function CancellationsView() {
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState<Request[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [open, setOpen] = useState<Request | null>(null);
  const [note, setNote] = useState("");
  const [working, setWorking] = useState<"approve" | "reject" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.listCancellations({ status: tab, limit: 30 });
      setRows(res?.data ?? []);
      setTotal(res?.meta?.total ?? 0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load requests.");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const resolve = async (approve: boolean) => {
    if (!open) return;
    setWorking(approve ? "approve" : "reject");
    try {
      await adminApi.resolveCancellation(open._id, { approve, note });
      setOpen(null);
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the request.");
    } finally {
      setWorking(null);
    }
  };

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <>
      <PageHeader
        title="Cancellation requests"
        subtitle="Requests raised from the storefront help chat after a parcel shipped."
        actions={
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {error && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600">
          <AlertCircle className="size-4" />
          {error}
        </p>
      )}

      <div className="rail mb-3 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-xl border px-3.5 py-2 text-xs font-bold transition",
              tab === t.id
                ? "border-ink bg-ink text-white"
                : "border-line bg-white text-ink-soft hover:border-brand-300",
            )}
          >
            {t.label}
            {t.id === "pending" && pendingCount > 0 && tab !== "pending" && (
              <span className="ml-1.5 rounded-full bg-brand-500 px-1.5 text-[10px] text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && rows.length === 0 ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Check}
          title="Nothing to review"
          copy="Cancellations raised before a parcel ships are handled automatically — only post-shipping recalls land here."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r._id}>
              <Card bodyClassName="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-xl",
                      r.afterShipping ? "bg-sun-100 text-amber-700" : "bg-cream text-ink-soft",
                    )}
                  >
                    {r.afterShipping ? <Truck className="size-5" /> : <PackageX className="size-5" />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-extrabold text-ink">{r.orderNo}</p>
                      <Badge tone={STATUS_TONE[r.status]}>{r.status.replace("-", " ")}</Badge>
                      {r.afterShipping && <Badge tone="sun">After shipping</Badge>}
                      {r.refundRequired && (
                        <Badge tone="grape">Refund {inr(r.refundAmount)}</Badge>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-ink-soft">
                      <b className="text-ink">{r.user?.name}</b> · {r.user?.email}
                      {r.user?.phone && ` · ${r.user.phone}`}
                    </p>

                    <p className="mt-2 rounded-xl bg-cream px-3 py-2 text-xs text-ink">
                      <span className="font-bold">
                        {r.reasonCode.replace(/-/g, " ")}
                      </span>
                      {r.reasonText && ` — ${r.reasonText}`}
                    </p>

                    <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ink-muted">
                      <Clock className="size-3" />
                      {new Date(r.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" · was "}
                      {r.orderStatusAtRequest}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <p className="text-right font-display text-base font-extrabold">
                      {inr(r.order?.total ?? 0)}
                    </p>
                    <Button
                      size="sm"
                      variant={r.status === "pending" ? "primary" : "secondary"}
                      onClick={() => {
                        setOpen(r);
                        setNote(r.adminNote ?? "");
                      }}
                    >
                      {r.status === "pending" ? "Review" : "Details"}
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-ink-muted">{total} requests</p>

      {/* Review drawer */}
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
              role="dialog"
              aria-label="Cancellation request"
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white"
            >
              <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <div>
                  <h2 className="font-display text-base font-extrabold">{open.orderNo}</h2>
                  <p className="text-[11px] text-ink-muted">
                    Raised{" "}
                    {new Date(open.createdAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <button onClick={() => setOpen(null)} aria-label="Close" className="p-1">
                  <X className="size-5" />
                </button>
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <div className="rounded-2xl border-2 border-brand-200 bg-brand-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700">
                    Reason given
                  </p>
                  <p className="mt-1 text-sm font-bold capitalize text-ink">
                    {open.reasonCode.replace(/-/g, " ")}
                  </p>
                  {open.reasonText && (
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                      “{open.reasonText}”
                    </p>
                  )}
                </div>

                <Block title="Customer">
                  <p className="text-sm font-bold text-ink">{open.user?.name}</p>
                  <p className="text-xs text-ink-soft">{open.user?.email}</p>
                  {open.user?.phone && (
                    <p className="text-xs text-ink-soft">{open.user.phone}</p>
                  )}
                </Block>

                {open.order?.address && (
                  <Block title="Delivery address">
                    <p className="flex gap-2 text-xs leading-relaxed text-ink-soft">
                      <MapPin className="mt-0.5 size-3.5 shrink-0" />
                      <span>
                        <b className="text-ink">{open.order.address.fullName}</b>
                        <br />
                        {open.order.address.line1}
                        <br />
                        {open.order.address.city}, {open.order.address.state} —{" "}
                        {open.order.address.pincode}
                        <br />
                        {open.order.address.phone}
                      </span>
                    </p>
                  </Block>
                )}

                {open.order?.shipping_details?.awb && (
                  <Block title="Shipment">
                    <p className="text-xs text-ink-soft">
                      {open.order.shipping_details.courier} ·{" "}
                      <b className="text-ink">{open.order.shipping_details.awb}</b>
                    </p>
                    <p className="mt-1 text-[11px] text-ink-muted">
                      Approving will attempt to cancel this shipment with the courier.
                    </p>
                  </Block>
                )}

                <Block title={`Items (${open.order?.items.length ?? 0})`}>
                  <ul className="space-y-2">
                    {open.order?.items.map((it, i) => (
                      <li key={i} className="flex items-center gap-2.5">
                        {it.image && (
                          <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-cream">
                            <Image src={it.image} alt="" fill unoptimized sizes="40px" className="object-cover" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-ink">
                            {it.title}
                          </span>
                          <span className="block text-[11px] text-ink-muted">
                            Qty {it.qty}
                            {it.size && ` · ${it.size}`}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </Block>

                <div className="rounded-2xl bg-cream p-3">
                  <div className="flex items-center justify-between text-sm font-extrabold">
                    <span>Order total</span>
                    <span>{inr(open.order?.total ?? 0)}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-ink-muted">
                    {open.refundRequired
                      ? `Paid online — approving refunds ${inr(open.refundAmount)} to the original method.`
                      : "Cash on delivery — nothing to refund."}
                  </p>
                </div>

                {(open.transcript?.length ?? 0) > 0 && (
                  <Block title="Chat transcript">
                    <ul className="space-y-1.5">
                      {open.transcript!.map((m, i) => (
                        <li
                          key={i}
                          className={cn(
                            "flex",
                            m.from === "user" ? "justify-end" : "justify-start",
                          )}
                        >
                          <span
                            className={cn(
                              "max-w-[85%] rounded-xl px-2.5 py-1.5 text-[11px] leading-relaxed",
                              m.from === "user"
                                ? "bg-brand-500 text-white"
                                : "border border-line bg-white text-ink-soft",
                            )}
                          >
                            {m.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Block>
                )}

                {open.status === "pending" && (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-ink">
                      <MessageSquare className="size-3.5" />
                      Note to the customer
                    </p>
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Recalled from the courier, refund initiated."
                      maxLength={500}
                    />
                  </div>
                )}

                {open.adminNote && open.status !== "pending" && (
                  <Block title="Admin note">
                    <p className="text-xs text-ink-soft">{open.adminNote}</p>
                  </Block>
                )}
              </div>

              {open.status === "pending" && (
                <footer className="flex gap-2 border-t border-line p-4">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    disabled={working !== null}
                    onClick={() => resolve(false)}
                  >
                    {working === "reject" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <X className="size-4" />
                    )}
                    Reject
                  </Button>
                  <Button
                    className="flex-[1.6]"
                    disabled={working !== null}
                    onClick={() => resolve(true)}
                  >
                    {working === "approve" ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Cancelling…
                      </>
                    ) : (
                      <>
                        <RotateCcw className="size-4" />
                        Approve &amp; refund
                      </>
                    )}
                  </Button>
                </footer>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line p-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
        {title}
      </p>
      {children}
    </div>
  );
}
