"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  Check,
  Clock,
  BadgeIndianRupee,
  Copy,
  Landmark,
  Loader2,
  MapPin,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Truck,
  Wallet,
  X,
} from "lucide-react";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Textarea,
} from "@/components/admin/ui";
import { adminApi, ApiError } from "@/utils/service";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

type ReturnRow = {
  _id: string;
  orderNo: string;
  reasonCode: string;
  reasonText?: string;
  resolution: string;
  status: "pending" | "approved" | "rejected" | "picked-up" | "refunded" | "cancelled";
  refundAmount: number;
  refundReference?: string;
  refundedAt?: string;
  refund?: {
    status: "none" | "initiated" | "processed" | "failed";
    amount?: number;
    deductionNote?: string;
    refundId?: string;
    speed?: string;
    initiatedAt?: string;
    initiatedByName?: string;
    processedAt?: string;
    failedAt?: string;
    failureReason?: string;
  };
  refundMode?: "source" | "bank" | "upi";
  bankDetails?: {
    accountName?: string;
    accountNumber?: string;
    ifsc?: string;
    bankName?: string;
    upiId?: string;
  };
  pickup?: {
    status: "not-booked" | "booked" | "failed" | "picked-up" | "cancelled";
    awb?: string;
    courier?: string;
    rate?: number;
    estimatedDays?: number;
    labelUrl?: string;
    bookedAt?: string;
    failureReason?: string;
  };
  adminNote?: string;
  createdAt: string;
  items: {
    title: string;
    image?: string;
    size?: string;
    color?: string;
    qty: number;
    price: number;
  }[];
  user?: { name: string; email: string; phone?: string };
  order?: {
    _id: string;
    total: number;
    payment?: { method: string; status: string };
    address?: { fullName: string; line1: string; city: string; state: string; pincode: string; phone: string };
  };
};

const TABS = [
  { id: "pending", label: "Needs approval" },
  { id: "approved", label: "Awaiting pickup" },
  { id: "refunded", label: "Completed" },
  { id: "rejected", label: "Rejected" },
  { id: "", label: "All" },
];

const TONE = {
  pending: "sun",
  approved: "sky",
  "picked-up": "grape",
  refunded: "mint",
  rejected: "red",
  cancelled: "neutral",
} as const;

/**
 * Return queue.
 *
 * Two distinct steps, deliberately separate: approving books the reverse
 * pickup, completing restocks and refunds. Refunding on approval would mean
 * paying out for goods that may never actually be sent back.
 */
export function ReturnsView() {
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [open, setOpen] = useState<ReturnRow | null>(null);
  const [note, setNote] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  /* Refund amount is typed, not computed — the admin decides what is withheld. */
  const [amount, setAmount] = useState("");
  const [deduction, setDeduction] = useState("");

  const openRow = (r: ReturnRow) => {
    setOpen(r);
    setNote(r.adminNote ?? "");
    setAmount(String(r.refund?.amount || r.refundAmount));
    setDeduction(r.refund?.deductionNote ?? "");
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.listReturns({ status: tab || undefined, limit: 30 });
      setRows((res?.data ?? []) as ReturnRow[]);
      setTotal(res?.meta?.total ?? 0);
      setPending(res?.meta?.pending ?? 0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load returns.");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>, key: string) => {
    setWorking(key);
    setError("");
    try {
      await fn();
      setOpen(null);
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update this return.");
    } finally {
      setWorking(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Returns"
        subtitle={
          loading ? "Loading…" : `${total} returns${pending ? ` · ${pending} need approval` : ""}`
        }
        actions={
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {error && (
        <p className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600">
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
            {t.id === "pending" && pending > 0 && tab !== "pending" && (
              <span className="ml-1.5 rounded-full bg-brand-500 px-1.5 text-[10px] text-white">
                {pending}
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
          icon={PackageCheck}
          title="Nothing to handle"
          copy="Returns raised from an order page land here for approval."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r._id}>
              <Card bodyClassName="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sun-100 text-amber-700">
                    <RotateCcw className="size-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-extrabold text-ink">{r.orderNo}</p>
                      <Badge tone={TONE[r.status]}>{r.status.replace("-", " ")}</Badge>
                      <Badge tone="grape">{r.items.length} item{r.items.length > 1 ? "s" : ""}</Badge>
                    </div>

                    <p className="mt-1 text-xs text-ink-soft">
                      <b className="text-ink">{r.user?.name}</b> · {r.user?.email}
                    </p>

                    <p className="mt-2 rounded-xl bg-cream px-3 py-2 text-xs text-ink">
                      <span className="font-bold capitalize">
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
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <p className="text-right font-display text-base font-extrabold">
                      {inr(r.refundAmount)}
                    </p>
                    <Button
                      size="sm"
                      variant={r.status === "pending" ? "primary" : "secondary"}
                      onClick={() => openRow(r)}
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
              aria-label="Return request"
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white"
            >
              <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <div>
                  <h2 className="font-display text-base font-extrabold">{open.orderNo}</h2>
                  <p className="text-[11px] capitalize text-ink-muted">
                    {open.status.replace("-", " ")} ·{" "}
                    {new Date(open.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <button onClick={() => setOpen(null)} aria-label="Close" className="p-1">
                  <X className="size-5" />
                </button>
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <div className="rounded-2xl border-2 border-sun-200 bg-sun-100/50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">
                    Reason
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

                <Block title={`Items coming back (${open.items.length})`}>
                  <ul className="space-y-2">
                    {open.items.map((it, i) => (
                      <li key={i} className="flex items-center gap-2.5">
                        <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-cream">
                          {it.image && (
                            <Image src={it.image} alt="" fill unoptimized sizes="44px" className="object-cover" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-ink">
                            {it.title}
                          </span>
                          <span className="block text-[11px] text-ink-muted">
                            {[it.size, it.color, `Qty ${it.qty}`].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span className="text-xs font-bold">{inr(it.price * it.qty)}</span>
                      </li>
                    ))}
                  </ul>
                </Block>

                <Block title="Customer">
                  <p className="text-sm font-bold text-ink">{open.user?.name}</p>
                  <p className="text-xs text-ink-soft">{open.user?.email}</p>
                  {open.user?.phone && (
                    <p className="text-xs text-ink-soft">{open.user.phone}</p>
                  )}
                </Block>

                {open.order?.address && (
                  <Block title="Pickup address">
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

                {open.pickup && open.pickup.status !== "not-booked" && (
                  <div
                    className={cn(
                      "rounded-2xl border-2 p-3",
                      open.pickup.status === "failed"
                        ? "border-red-200 bg-red-50"
                        : "border-sky-200 bg-sky-50",
                    )}
                  >
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                      <Truck className="size-3.5" />
                      Reverse pickup
                    </p>

                    {open.pickup.status === "failed" ? (
                      <>
                        <p className="mt-1 text-xs font-semibold text-red-600">
                          Booking failed — {open.pickup.failureReason}
                        </p>
                        <p className="mt-1 text-[11px] text-ink-muted">
                          The return stays approved. Fix the cause and book again.
                        </p>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="mt-2"
                          disabled={working !== null}
                          onClick={() =>
                            act(() => adminApi.retryReturnPickup(open._id), "retry")
                          }
                        >
                          {working === "retry" ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <RefreshCw className="size-4" />
                          )}
                          Book pickup again
                        </Button>
                      </>
                    ) : (
                      <div className="mt-1.5 space-y-1 text-xs text-ink-soft">
                        <p>
                          <b className="text-ink">{open.pickup.courier}</b>
                          {open.pickup.rate != null && (
                            <span className="ml-1.5 rounded-md bg-white px-1.5 py-0.5 text-[11px] font-bold text-ink">
                              {inr(open.pickup.rate)} · cheapest available
                            </span>
                          )}
                        </p>
                        {open.pickup.awb && <p>AWB {open.pickup.awb}</p>}
                        {open.pickup.estimatedDays != null && (
                          <p>Expected pickup in {open.pickup.estimatedDays} day(s)</p>
                        )}
                        {open.pickup.labelUrl && (
                          <a
                            href={open.pickup.labelUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block font-bold text-brand-600 underline"
                          >
                            Download label
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {open.refundMode && open.refundMode !== "source" && open.bankDetails && (
                  <Block
                    title={
                      open.refundMode === "upi"
                        ? "Pay refund to this UPI ID"
                        : "Pay refund to this account"
                    }
                  >
                    <div className="space-y-1 text-xs text-ink-soft">
                      {open.refundMode === "upi" ? (
                        <CopyRow label="UPI ID" value={open.bankDetails.upiId ?? ""} />
                      ) : (
                        <>
                          <CopyRow
                            label="Name"
                            value={open.bankDetails.accountName ?? ""}
                          />
                          <CopyRow
                            label="Account"
                            value={open.bankDetails.accountNumber ?? ""}
                          />
                          <CopyRow label="IFSC" value={open.bankDetails.ifsc ?? ""} />
                          {open.bankDetails.bankName && (
                            <CopyRow label="Bank" value={open.bankDetails.bankName} />
                          )}
                        </>
                      )}
                    </div>
                    <p className="mt-2 flex items-start gap-1.5 text-[11px] text-ink-muted">
                      <Landmark className="mt-px size-3 shrink-0" />
                      This payout is manual — completing the return marks it refunded
                      but does not move the money.
                    </p>
                  </Block>
                )}

                <RefundPanel
                  row={open}
                  amount={amount}
                  onAmount={setAmount}
                  deduction={deduction}
                  onDeduction={setDeduction}
                  working={working}
                  onMarkPaid={(reference) =>
                    act(() => adminApi.markReturnRefundPaid(open._id, reference), "markpaid")
                  }
                  onRetry={() =>
                    act(
                      () =>
                        adminApi.retryReturnRefund(open._id, {
                          amount: Number(amount),
                          deductionNote: deduction.trim() || undefined,
                        }),
                      "retryrefund",
                    )
                  }
                />

                {open.status === "pending" && (
                  <div>
                    <p className="mb-1.5 text-xs font-bold text-ink">Note</p>
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Approved, pickup booked for tomorrow."
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

              <footer className="border-t border-line p-4">
                {open.status === "pending" ? (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      disabled={working !== null}
                      onClick={() =>
                        act(
                          () => adminApi.resolveReturn(open._id, { approve: false, note }),
                          "reject",
                        )
                      }
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
                      onClick={() =>
                        act(
                          () => adminApi.resolveReturn(open._id, { approve: true, note }),
                          "approve",
                        )
                      }
                    >
                      {working === "approve" ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Approving…
                        </>
                      ) : (
                        <>
                          <Check className="size-4" />
                          Approve &amp; book cheapest pickup
                        </>
                      )}
                    </Button>
                  </div>
                ) : ["approved", "picked-up"].includes(open.status) &&
                  (open.refund?.status ?? "none") === "none" ? (
                  <>
                    <p className="mb-2 text-center text-[11px] text-ink-muted">
                      Only do this once the parcel is physically back and checked —
                      it restocks the items and sends the money.
                    </p>
                    <Button
                      className="w-full"
                      disabled={working !== null || !Number(amount)}
                      onClick={() =>
                        act(
                          () =>
                            adminApi.completeReturn(open._id, {
                              restock: true,
                              amount: Number(amount),
                              deductionNote: deduction.trim() || undefined,
                            }),
                          "complete",
                        )
                      }
                    >
                      {working === "complete" ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Sending refund…
                        </>
                      ) : (
                        <>
                          <PackageCheck className="size-4" />
                          Received — restock &amp; refund {inr(Number(amount) || 0)}
                        </>
                      )}
                    </Button>
                  </>
                ) : null}
              </footer>
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

const REFUND_TONE = {
  none: "neutral",
  initiated: "sun",
  processed: "mint",
  failed: "red",
} as const;

const stamp = (d?: string) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

/**
 * Refund panel.
 *
 * Before the refund exists this is an editable amount; after it exists it is a
 * read-only audit trail. The two timestamps are the point of it — Razorpay
 * refunds are asynchronous, so "initiated" and "processed" can be days apart
 * and a bank can still reject one in between. Showing only a single "refunded"
 * flag is how a bounced refund goes unnoticed.
 */
function RefundPanel({
  row,
  amount,
  onAmount,
  deduction,
  onDeduction,
  working,
  onMarkPaid,
  onRetry,
}: {
  row: ReturnRow;
  amount: string;
  onAmount: (v: string) => void;
  deduction: string;
  onDeduction: (v: string) => void;
  working: string | null;
  onMarkPaid: (reference: string) => void;
  onRetry: () => void;
}) {
  const [reference, setReference] = useState("");
  const state = row.refund?.status ?? "none";
  const cod = row.order?.payment?.method === "cod";
  const editable = state === "none" && ["approved", "picked-up"].includes(row.status);
  const typed = Number(amount) || 0;
  const withheld = row.refundAmount - typed;

  return (
    <div className="rounded-2xl border-2 border-line p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
          <Wallet className="size-3.5" />
          Refund
        </p>
        <Badge tone={REFUND_TONE[state]}>
          {state === "none" ? "not started" : state}
        </Badge>
      </div>

      {editable ? (
        <>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-ink-soft">Returned items are worth</span>
            <b className="text-ink">{inr(row.refundAmount)}</b>
          </div>

          <label className="mb-1 block text-[11px] font-bold text-ink">
            Refund this much
          </label>
          <div className="flex items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cream text-ink-muted">
              <BadgeIndianRupee className="size-4" />
            </span>
            <Input
              value={amount}
              onChange={(e) => onAmount(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              aria-label="Refund amount"
              className="flex-1"
            />
            {typed !== row.refundAmount && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onAmount(String(row.refundAmount))}
              >
                Full
              </Button>
            )}
          </div>

          {typed > row.refundAmount ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-red-600">
              <AlertCircle className="size-3" />
              Cannot refund more than the items are worth.
            </p>
          ) : withheld > 0 ? (
            <div className="mt-2">
              <p className="mb-1 flex items-center justify-between text-[11px]">
                <span className="text-ink-soft">Withholding</span>
                <b className="text-ink">{inr(withheld)}</b>
              </p>
              <Textarea
                value={deduction}
                onChange={(e) => onDeduction(e.target.value.slice(0, 300))}
                placeholder="e.g. Forward and reverse shipping of ₹98 withheld."
                rows={2}
              />
              <p className="mt-1 text-[11px] text-ink-muted">
                Required — the customer sees this line in their refund email.
              </p>
            </div>
          ) : null}

          <p className="mt-2 text-[11px] text-ink-muted">
            {cod
              ? "Cash on delivery — transfer it yourself, then mark it paid here."
              : "Goes back to the original payment method through Razorpay."}
          </p>
        </>
      ) : (
        <>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-ink-soft">Refunded</span>
            <b className="font-display text-lg">{inr(row.refund?.amount ?? 0)}</b>
          </div>
          {row.refundAmount > (row.refund?.amount ?? 0) && (
            <p className="mt-0.5 text-[11px] text-ink-muted">
              of {inr(row.refundAmount)} · {inr(row.refundAmount - (row.refund?.amount ?? 0))}{" "}
              withheld
            </p>
          )}
          {row.refund?.deductionNote && (
            <p className="mt-1.5 rounded-xl bg-cream px-2.5 py-2 text-[11px] leading-relaxed text-ink-soft">
              {row.refund.deductionNote}
            </p>
          )}

          <ol className="mt-3 space-y-2">
            <Step
              done
              label="Triggered"
              detail={[
                stamp(row.refund?.initiatedAt),
                row.refund?.initiatedByName && `by ${row.refund.initiatedByName}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
            <Step
              done={state === "processed"}
              failed={state === "failed"}
              label={
                state === "failed"
                  ? "Failed at the bank"
                  : state === "processed"
                    ? "Money reached the customer"
                    : "Waiting on the bank"
              }
              detail={
                state === "failed"
                  ? [stamp(row.refund?.failedAt), row.refund?.failureReason]
                      .filter(Boolean)
                      .join(" · ")
                  : state === "processed"
                    ? stamp(row.refund?.processedAt)
                    : cod
                      ? "Mark it paid once you have transferred it"
                      : "Razorpay confirms this by webhook, usually 5–7 working days"
              }
            />
          </ol>

          {row.refund?.refundId && (
            <div className="mt-2.5 border-t border-line pt-2.5">
              <CopyRow label="Refund ID" value={row.refund.refundId} />
              {row.refund.speed && (
                <p className="mt-1 text-[11px] text-ink-muted">
                  Speed {row.refund.speed}
                </p>
              )}
            </div>
          )}

          {state === "initiated" && cod && (
            <div className="mt-3 border-t border-line pt-3">
              <label className="mb-1 block text-[11px] font-bold text-ink">
                Bank reference (UTR)
              </label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Optional, but worth keeping"
              />
              <Button
                size="sm"
                className="mt-2 w-full"
                disabled={working !== null}
                onClick={() => onMarkPaid(reference)}
              >
                {working === "markpaid" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Mark as paid
              </Button>
            </div>
          )}

          {state === "failed" && (
            <div className="mt-3 border-t border-line pt-3">
              <p className="mb-2 text-[11px] text-ink-soft">
                The items are already restocked. Retrying only re-sends the money.
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                disabled={working !== null}
                onClick={onRetry}
              >
                {working === "retryrefund" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Try the refund again
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** One node of the refund timeline. */
function Step({
  done,
  failed,
  label,
  detail,
}: {
  done?: boolean;
  failed?: boolean;
  label: string;
  detail?: string;
}) {
  return (
    <li className="flex gap-2.5">
      <span
        className={cn(
          "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
          failed
            ? "bg-red-500"
            : done
              ? "bg-mint-500"
              : "border-2 border-dashed border-line bg-white",
        )}
      >
        {failed ? (
          <X className="size-2.5 text-white" strokeWidth={4} />
        ) : done ? (
          <Check className="size-2.5 text-white" strokeWidth={4} />
        ) : null}
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block text-xs font-bold",
            failed ? "text-red-600" : done ? "text-ink" : "text-ink-muted",
          )}
        >
          {label}
        </span>
        {detail && <span className="block text-[11px] text-ink-muted">{detail}</span>}
      </span>
    </li>
  );
}

/** A label/value pair with a copy button — admins retype account numbers otherwise. */
function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <p className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] text-ink-muted">{label}</span>
      <b className="min-w-0 flex-1 truncate font-mono text-ink">{value}</b>
      <button
        type="button"
        aria-label={`Copy ${label}`}
        onClick={() => {
          void navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="shrink-0 rounded-md p-1 text-ink-muted hover:bg-cream hover:text-ink"
      >
        {copied ? <Check className="size-3.5 text-mint-600" /> : <Copy className="size-3.5" />}
      </button>
    </p>
  );
}
