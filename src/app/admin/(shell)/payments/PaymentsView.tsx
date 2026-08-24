"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CreditCard,
  IndianRupee,
  Landmark,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Smartphone,
  TrendingUp,
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
  Select,
  TableWrap,
  Td,
  Th,
} from "@/components/admin/ui";
import { adminApi, ApiError } from "@/utils/service";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

type Payment = {
  _id: string;
  orderNo?: string;
  order?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  amount: number;
  status: string;
  method?: string;
  bank?: string;
  wallet?: string;
  vpa?: string;
  cardLast4?: string;
  cardNetwork?: string;
  email?: string;
  contact?: string;
  errorDescription?: string;
  refundedAmount?: number;
  refunds?: { refundId: string; amount: number; status: string; createdAt: string }[];
  createdAt: string;
  user?: { name: string; email: string; phone?: string };
};

type Summary = {
  collected: number;
  net: number;
  refundedAmount: number;
  failedAmount: number;
  successRate: number;
  counts: {
    captured: number;
    failed: number;
    refunded: number;
    pending: number;
    attempts: number;
  };
};

const STATUS_TONE: Record<string, Parameters<typeof Badge>[0]["tone"]> = {
  captured: "mint",
  authorized: "sky",
  created: "neutral",
  failed: "red",
  refunded: "grape",
  partially_refunded: "sun",
};

const METHOD_ICON: Record<string, typeof Wallet> = {
  upi: Smartphone,
  card: CreditCard,
  netbanking: Banknote,
  wallet: Wallet,
};

/**
 * Payments panel.
 *
 * Reads from our own Payment mirror rather than calling Razorpay per render —
 * the dashboard stays fast, works when Razorpay is slow, and does not burn
 * API quota on every page view.
 */
type Finance = {
  awaitingSettlement: number | null;
  estimateReliable: boolean;
  settledTotal: number;
  settlingNow: number;
  settlementCount: number;
  gatewayFees: number;
  capturedTotal: number;
  refundedTotal: number;
  refunds: {
    processed: number;
    pending: number;
    failed: number;
    processedAmount: number;
    pendingAmount: number;
  };
  lastSettlement: { amount: number; utr?: string; at: string } | null;
  recentSettlements: {
    id: string;
    amount: number;
    fees: number;
    tax: number;
    status: string;
    utr?: string;
    at: string;
  }[];
  live: boolean;
};

export function PaymentsView() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [finance, setFinance] = useState<Finance | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [series, setSeries] = useState<
    { label: string; collected: number; refunded: number; failed: number }[]
  >([]);
  const [rows, setRows] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<Payment | null>(null);
  const [refunding, setRefunding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [s, fin, sr, list] = await Promise.all([
        adminApi.paymentsSummary(),
        adminApi.finance(),
        adminApi.paymentsSeries(14),
        adminApi.listPayments({ q, status, method, page, limit: 20 }),
      ]);
      setSummary(s);
      setFinance(fin as Finance);
      setSeries(sr ?? []);
      setRows(list?.data ?? []);
      setTotal(list?.meta?.total ?? 0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load payments.");
    } finally {
      setLoading(false);
    }
  }, [q, status, method, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const peak = useMemo(
    () => Math.max(...series.map((s) => Math.max(s.collected, s.refunded)), 1),
    [series],
  );

  const pullSettlements = async () => {
    setSyncing(true);
    setError("");
    try {
      const res = (await adminApi.syncSettlements()) as { synced: number; error?: string };
      if (res?.error) setError(`Razorpay: ${res.error}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach Razorpay.");
    } finally {
      setSyncing(false);
    }
  };

  const refund = async (p: Payment) => {
    if (!p.order) return;
    setRefunding(true);
    try {
      await adminApi.refundPayment({
        orderId: p.order,
        amount: p.amount - (p.refundedAmount ?? 0),
        reason: "Refunded from payments panel",
      });
      setDetail(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Refund failed.");
    } finally {
      setRefunding(false);
    }
  };

  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Everything Razorpay has processed — no need to open their dashboard."
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Collected"
          value={inr(summary?.collected ?? 0)}
          sub={`${summary?.counts.captured ?? 0} successful payments`}
          icon={IndianRupee}
          tone="bg-mint-50 text-mint-600"
        />
        <Stat
          label="Net after refunds"
          value={inr(summary?.net ?? 0)}
          sub={`${inr(summary?.refundedAmount ?? 0)} refunded`}
          icon={RotateCcw}
          tone="bg-grape-100 text-grape-600"
        />
        <Stat
          label="Failed"
          value={String(summary?.counts.failed ?? 0)}
          sub={`${inr(summary?.failedAmount ?? 0)} did not go through`}
          icon={ArrowDownRight}
          tone="bg-red-50 text-red-600"
        />
        <Stat
          label="Success rate"
          value={`${summary?.successRate ?? 0}%`}
          sub={`of ${summary?.counts.attempts ?? 0} attempts`}
          icon={TrendingUp}
          tone="bg-sky-ks/10 text-sky-700"
        />
      </div>

      <FinanceSection
        finance={finance}
        syncing={syncing}
        onSync={pullSettlements}
      />

      <Card
        title="Collected vs refunded"
        description="Last 14 days"
        className="mt-4"
      >
        {series.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">No payments yet.</p>
        ) : (
          <>
            <div className="flex h-40 items-end gap-1.5">
              {series.map((d) => (
                <div key={d.label} className="group flex flex-1 flex-col justify-end gap-0.5">
                  <span className="mb-1 text-center text-[10px] font-bold text-ink opacity-0 transition-opacity group-hover:opacity-100">
                    {inr(d.collected)}
                  </span>
                  <div
                    className="w-full rounded-t bg-mint-400"
                    style={{ height: `${(d.collected / peak) * 100}%`, minHeight: d.collected ? 3 : 0 }}
                  />
                  {d.refunded > 0 && (
                    <div
                      className="w-full rounded-b bg-brand-400"
                      style={{ height: `${(d.refunded / peak) * 100}%`, minHeight: 3 }}
                    />
                  )}
                  <span className="text-center text-[9px] font-semibold text-ink-muted">
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-4 text-[11px] font-semibold text-ink-soft">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-mint-400" /> Collected
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-brand-400" /> Refunded
              </span>
            </div>
          </>
        )}
      </Card>

      <Card className="mt-4" bodyClassName="p-3 sm:p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex flex-1 items-center">
            <Search className="pointer-events-none absolute left-3 size-4 text-ink-muted" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Order number, payment id, email or phone…"
              aria-label="Search payments"
              className="h-10 w-full rounded-xl border border-line bg-cream pl-9 pr-3 text-sm outline-none focus:border-brand-300 focus:bg-white"
            />
          </label>
          <Select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            aria-label="Filter by status"
            className="!py-2 text-xs sm:w-44"
          >
            <option value="">Any status</option>
            <option value="captured">Captured</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="partially_refunded">Partially refunded</option>
            <option value="created">Pending</option>
          </Select>
          <Select
            value={method}
            onChange={(e) => { setMethod(e.target.value); setPage(1); }}
            aria-label="Filter by method"
            className="!py-2 text-xs sm:w-36"
          >
            <option value="">Any method</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="netbanking">Net banking</option>
            <option value="wallet">Wallet</option>
          </Select>
        </div>
      </Card>

      <Card className="mt-3" bodyClassName="p-0 sm:p-0">
        {loading && rows.length === 0 ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-12 rounded-xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No payments yet"
            copy="Once a customer pays online, every attempt shows up here."
          />
        ) : (
          <TableWrap>
            <table className="min-w-full">
              <thead className="border-b border-line bg-cream/60">
                <tr>
                  <Th>Payment</Th>
                  <Th>Customer</Th>
                  <Th className="hidden md:table-cell">Method</Th>
                  <Th>Status</Th>
                  <Th className="hidden lg:table-cell">When</Th>
                  <Th className="text-right">Amount</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((p) => {
                  const Icon = METHOD_ICON[p.method ?? ""] ?? Wallet;
                  return (
                    <tr
                      key={p._id}
                      onClick={() => setDetail(p)}
                      className="cursor-pointer transition hover:bg-cream/50"
                    >
                      <Td>
                        <p className="font-bold">{p.orderNo ?? "—"}</p>
                        <p className="font-mono text-[10px] text-ink-muted">
                          {p.razorpayPaymentId ?? p.razorpayOrderId ?? "—"}
                        </p>
                      </Td>
                      <Td>
                        <p className="text-xs font-semibold">{p.user?.name ?? "—"}</p>
                        <p className="text-[11px] text-ink-muted">{p.email ?? p.user?.email}</p>
                      </Td>
                      <Td className="hidden md:table-cell">
                        <span className="flex items-center gap-1.5 text-xs">
                          <Icon className="size-3.5 text-ink-muted" />
                          <span className="capitalize">{p.method ?? "—"}</span>
                          {p.cardLast4 && (
                            <span className="text-ink-muted">···{p.cardLast4}</span>
                          )}
                        </span>
                      </Td>
                      <Td>
                        <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>
                          {p.status.replace("_", " ")}
                        </Badge>
                      </Td>
                      <Td className="hidden text-xs text-ink-soft lg:table-cell">
                        {new Date(p.createdAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Td>
                      <Td className="text-right">
                        <p className="font-bold">{inr(p.amount)}</p>
                        {(p.refundedAmount ?? 0) > 0 && (
                          <p className="text-[11px] font-semibold text-brand-600">
                            −{inr(p.refundedAmount!)}
                          </p>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3">
            <p className="text-xs text-ink-muted">
              Page {page} of {pages} · {total} payments
            </p>
            <div className="flex gap-1">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail drawer */}
      <AnimatePresence>
        {detail && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetail(null)}
              className="fixed inset-0 z-50 bg-ink/40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              role="dialog"
              aria-label="Payment detail"
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white"
            >
              <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <div>
                  <h2 className="font-display text-base font-extrabold">
                    {detail.orderNo ?? "Payment"}
                  </h2>
                  <p className="font-mono text-[10px] text-ink-muted">
                    {detail.razorpayPaymentId ?? detail.razorpayOrderId}
                  </p>
                </div>
                <button onClick={() => setDetail(null)} aria-label="Close" className="p-1">
                  <X className="size-5" />
                </button>
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <div className="rounded-2xl bg-cream p-4 text-center">
                  <p className="font-display text-3xl font-extrabold">{inr(detail.amount)}</p>
                  <Badge tone={STATUS_TONE[detail.status] ?? "neutral"} className="mt-2">
                    {detail.status.replace("_", " ")}
                  </Badge>
                </div>

                {detail.errorDescription && (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-600">
                    {detail.errorDescription}
                  </p>
                )}

                <Section title="Customer">
                  <Row label="Name" value={detail.user?.name ?? "—"} />
                  <Row label="Email" value={detail.email ?? detail.user?.email ?? "—"} />
                  <Row label="Phone" value={detail.contact ?? detail.user?.phone ?? "—"} />
                </Section>

                <Section title="Method">
                  <Row label="Type" value={detail.method ?? "—"} />
                  {detail.vpa && <Row label="UPI ID" value={detail.vpa} />}
                  {detail.cardLast4 && (
                    <Row label="Card" value={`${detail.cardNetwork ?? ""} ···${detail.cardLast4}`} />
                  )}
                  {detail.bank && <Row label="Bank" value={detail.bank} />}
                  {detail.wallet && <Row label="Wallet" value={detail.wallet} />}
                </Section>

                {(detail.refunds?.length ?? 0) > 0 && (
                  <Section title="Refunds">
                    {detail.refunds!.map((r) => (
                      <Row
                        key={r.refundId}
                        label={new Date(r.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                        value={`${inr(r.amount)} · ${r.status}`}
                      />
                    ))}
                  </Section>
                )}
              </div>

              {["captured", "partially_refunded"].includes(detail.status) &&
                (detail.refundedAmount ?? 0) < detail.amount && (
                  <footer className="border-t border-line p-4">
                    <Button
                      variant="danger"
                      className="w-full"
                      disabled={refunding}
                      onClick={() => refund(detail)}
                    >
                      {refunding ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Refunding…
                        </>
                      ) : (
                        <>
                          <RotateCcw className="size-4" />
                          Refund {inr(detail.amount - (detail.refundedAmount ?? 0))}
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

/**
 * Money view — what is still with Razorpay, what has reached the bank, and
 * where every refund stands.
 *
 * The awaiting-settlement figure is arithmetic over our own mirror, not a
 * balance Razorpay returns: a payment-gateway account has no balance endpoint
 * (that belongs to RazorpayX). It is labelled as an estimate for exactly that
 * reason — nobody should reconcile the books against it without checking the
 * settlement rows below, which ARE Razorpay's own numbers.
 */
function FinanceSection({
  finance,
  syncing,
  onSync,
}: {
  finance: Finance | null;
  syncing: boolean;
  onSync: () => void;
}) {
  const f = finance;
  const r = f?.refunds;

  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-[1.15fr_1fr]">
      {/* ── settlements ── */}
      <Card
        title="Money movement"
        description="Between Razorpay and your bank account"
        bodyClassName="p-4"
        actions={
          <Button variant="secondary" size="sm" onClick={onSync} disabled={syncing}>
            <RefreshCw className={cn("size-4", syncing && "animate-spin")} />
            Sync
          </Button>
        }
      >
        {!f?.live && (
          <p className="mb-3 flex items-start gap-2 rounded-xl border border-sun-200 bg-sun-100/50 px-3 py-2 text-[11px] font-semibold text-amber-700">
            <AlertCircle className="mt-px size-3.5 shrink-0" />
            Razorpay keys are not set, so settlement rows cannot be pulled. The
            figures below come from payments recorded locally.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Money
            label="Yet to settle"
            value={f?.awaitingSettlement == null ? "—" : inr(f.awaitingSettlement)}
            note={f && !f.estimateReliable ? "Cannot be estimated" : "Estimate"}
            tone="text-brand-600"
          />
          <Money
            label="Settled to bank"
            value={inr(f?.settledTotal ?? 0)}
            note={`${f?.settlementCount ?? 0} payouts`}
            tone="text-mint-600"
          />
          <Money
            label="Razorpay fees"
            value={inr(f?.gatewayFees ?? 0)}
            note="Incl. GST"
            tone="text-ink"
          />
        </div>

        {f && !f.estimateReliable && (
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-sun-200 bg-sun-100/50 px-3 py-2 text-[11px] font-semibold text-amber-700">
            <AlertCircle className="mt-px size-3.5 shrink-0" />
            Razorpay has settled more than the payments recorded here, so what is
            yet to settle cannot be worked out. That is normal if the account
            traded before this site went live — the settlement rows below are
            still exact.
          </p>
        )}

        {f?.lastSettlement && (
          <p className="mt-3 rounded-xl bg-cream px-3 py-2 text-[11px] text-ink-soft">
            Last payout <b className="text-ink">{inr(f.lastSettlement.amount)}</b> on{" "}
            {new Date(f.lastSettlement.at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
            {f.lastSettlement.utr && (
              <>
                {" · UTR "}
                <span className="font-mono text-ink">{f.lastSettlement.utr}</span>
              </>
            )}
          </p>
        )}

        {f?.recentSettlements?.length ? (
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {f.recentSettlements.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-mint-50 text-mint-600">
                  <Landmark className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-ink">
                    {inr(s.amount)}
                  </span>
                  <span className="block truncate text-[10px] text-ink-muted">
                    {new Date(s.at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                    {s.utr && ` · ${s.utr}`}
                  </span>
                </span>
                <Badge tone={s.status === "processed" ? "mint" : "sun"}>{s.status}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 border-t border-line pt-3 text-[11px] text-ink-muted">
            No settlements pulled yet. Razorpay usually pays out on a T+2 cycle;
            press Sync once your first payout is done.
          </p>
        )}
      </Card>

      {/* ── refunds ── */}
      <Card
        title="Refunds"
        description="Where every refund currently stands"
        bodyClassName="p-4"
      >
        <div className="grid gap-2 sm:grid-cols-3">
          <RefundStat
            label="Success"
            count={r?.processed ?? 0}
            amount={r?.processedAmount ?? 0}
            tone="border-mint-200 bg-mint-50 text-mint-700"
          />
          <RefundStat
            label="Pending"
            count={r?.pending ?? 0}
            amount={r?.pendingAmount ?? 0}
            tone="border-sun-200 bg-sun-100/60 text-amber-700"
          />
          <RefundStat
            label="Failed"
            count={r?.failed ?? 0}
            tone="border-red-200 bg-red-50 text-red-600"
          />
        </div>

        <dl className="mt-4 space-y-1.5 border-t border-line pt-3">
          <Row label="Captured, all time" value={inr(f?.capturedTotal ?? 0)} />
          <Row label="Refunded, all time" value={inr(f?.refundedTotal ?? 0)} />
          <Row
            label="Kept after refunds"
            value={inr(Math.max(0, (f?.capturedTotal ?? 0) - (f?.refundedTotal ?? 0)))}
          />
        </dl>

        {(r?.failed ?? 0) > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600">
            <AlertCircle className="mt-px size-3.5 shrink-0" />
            {r?.failed} refund{(r?.failed ?? 0) > 1 ? "s" : ""} the bank rejected.
            Retry them from the Returns or Cancellations screen.
          </p>
        )}
      </Card>
    </div>
  );
}

function Money({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl bg-cream p-3">
      <p className="text-[11px] font-semibold text-ink-muted">{label}</p>
      <p className={cn("font-display text-xl font-extrabold", tone)}>{value}</p>
      <p className="text-[10px] text-ink-muted">{note}</p>
    </div>
  );
}

function RefundStat({
  label,
  count,
  amount,
  tone,
}: {
  label: string;
  count: number;
  amount?: number;
  tone: string;
}) {
  return (
    <div className={cn("rounded-xl border-2 p-2.5 text-center", tone)}>
      <p className="font-display text-xl font-extrabold">{count}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide">{label}</p>
      {amount != null && amount > 0 && (
        <p className="mt-0.5 text-[10px] opacity-80">{inr(amount)}</p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  icon: typeof Wallet;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <span className={cn("grid size-9 place-items-center rounded-xl", tone)}>
        <Icon className="size-4.5" />
      </span>
      <p className="mt-3 text-xs font-semibold text-ink-muted">{label}</p>
      <p className="font-display text-2xl font-extrabold text-ink">{value}</p>
      <p className="mt-0.5 text-[11px] text-ink-muted">{sub}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line p-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
        {title}
      </p>
      <dl className="space-y-1.5">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="truncate font-semibold text-ink">{value}</dd>
    </div>
  );
}
