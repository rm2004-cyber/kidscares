"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  Check,
  Clock,
  ExternalLink,
  Loader2,
  MessageSquare,
  RefreshCw,
  Star,
  Trash2,
  X,
} from "lucide-react";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Select,
  Textarea,
} from "@/components/admin/ui";
import { adminApi, ApiError } from "@/utils/service";
import { cn } from "@/lib/utils";

type Review = {
  _id: string;
  productTitle: string;
  productSlug: string;
  productImage?: string;
  authorName: string;
  orderNo: string;
  rating: number;
  title?: string;
  comment?: string;
  variant?: { size?: string; color?: string };
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
  createdAt: string;
  user?: { name: string; email: string };
};

const TABS = [
  { id: "pending", label: "Needs review" },
  { id: "approved", label: "Published" },
  { id: "rejected", label: "Rejected" },
  { id: "", label: "All" },
];

const TONE = {
  pending: "sun",
  approved: "mint",
  rejected: "red",
} as const;

/**
 * Review moderation.
 *
 * Nothing a customer writes is public until it is approved here, and every
 * decision immediately recomputes the product's star average — so approving a
 * five-star review moves the rating on the storefront on the next load.
 */
export function ReviewsView() {
  const [tab, setTab] = useState("pending");
  const [rating, setRating] = useState("");
  const [rows, setRows] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [open, setOpen] = useState<Review | null>(null);
  const [note, setNote] = useState("");
  const [working, setWorking] = useState<"approve" | "reject" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.listReviews({
        status: tab || undefined,
        rating: rating || undefined,
        limit: 30,
      });
      setRows((res?.data ?? []) as Review[]);
      setTotal(res?.meta?.total ?? 0);
      setPending(res?.meta?.pending ?? 0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load reviews.");
    } finally {
      setLoading(false);
    }
  }, [tab, rating]);

  useEffect(() => {
    void load();
  }, [load]);

  const moderate = async (approve: boolean) => {
    if (!open) return;
    setWorking(approve ? "approve" : "reject");
    try {
      const res = await adminApi.moderateReview(open._id, { approve, note });
      setOpen(null);
      setNote("");
      await load();
      if (res?.summary) {
        setError("");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the review.");
    } finally {
      setWorking(null);
    }
  };

  const remove = async (id: string) => {
    try {
      await adminApi.deleteReview(id);
      setOpen(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete.");
    }
  };

  return (
    <>
      <PageHeader
        title="Reviews"
        subtitle={
          loading
            ? "Loading…"
            : `${total} reviews${pending ? ` · ${pending} waiting for approval` : ""}`
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

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="rail flex gap-2 overflow-x-auto">
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

        <Select
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          aria-label="Filter by rating"
          className="ml-auto !w-auto !py-2 text-xs"
        >
          <option value="">Any rating</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {r} stars
            </option>
          ))}
        </Select>
      </div>

      {loading && rows.length === 0 ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={tab === "pending" ? "Nothing to moderate" : "No reviews here"}
          copy="Reviews land here as soon as a verified buyer submits one."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r._id}>
              <Card bodyClassName="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-cream">
                    {r.productImage && (
                      <Image
                        src={r.productImage}
                        alt=""
                        fill
                        unoptimized
                        sizes="48px"
                        className="object-cover"
                      />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-0.5 rounded-md bg-mint-500 px-1.5 py-0.5 text-[11px] font-extrabold text-white">
                        {r.rating}
                        <Star className="size-2.5 fill-white" strokeWidth={0} />
                      </span>
                      <p className="truncate text-sm font-bold text-ink">
                        {r.title || "No headline"}
                      </p>
                      <Badge tone={TONE[r.status]}>{r.status}</Badge>
                    </div>

                    {r.comment && (
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-soft">
                        {r.comment}
                      </p>
                    )}

                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[11px] text-ink-muted">
                      <span className="font-semibold text-ink">{r.authorName}</span>
                      <span>on {r.productTitle}</span>
                      <span>· {r.orderNo}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(r.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </p>
                  </div>

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
              aria-label="Moderate review"
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white"
            >
              <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <h2 className="font-display text-base font-extrabold">Review</h2>
                <button onClick={() => setOpen(null)} aria-label="Close" className="p-1">
                  <X className="size-5" />
                </button>
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <div className="flex items-center gap-3 rounded-2xl bg-cream p-3">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-white">
                    {open.productImage && (
                      <Image
                        src={open.productImage}
                        alt=""
                        fill
                        unoptimized
                        sizes="56px"
                        className="object-cover"
                      />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-bold text-ink">
                      {open.productTitle}
                    </p>
                    <Link
                      href={`/product/${open.productSlug}`}
                      target="_blank"
                      className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:underline"
                    >
                      View on store
                      <ExternalLink className="size-3" />
                    </Link>
                  </div>
                </div>

                <div className="rounded-2xl border-2 border-line p-4">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={cn(
                          "size-5",
                          i <= open.rating
                            ? "fill-sun-400 text-sun-400"
                            : "fill-line text-line",
                        )}
                        strokeWidth={0}
                      />
                    ))}
                    <span className="ml-1 text-sm font-extrabold">{open.rating}.0</span>
                  </div>

                  {open.title && (
                    <p className="mt-2 font-display text-base font-extrabold text-ink">
                      {open.title}
                    </p>
                  )}
                  {open.comment && (
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                      {open.comment}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-line p-3">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                    Reviewer
                  </p>
                  <p className="text-sm font-bold text-ink">{open.authorName}</p>
                  <p className="text-xs text-ink-soft">{open.user?.email}</p>
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-mint-600">
                    <Check className="size-3" strokeWidth={3} />
                    Verified purchase · {open.orderNo}
                  </p>
                  {(open.variant?.size || open.variant?.color) && (
                    <p className="mt-1 text-[11px] text-ink-muted">
                      Bought: {[open.variant.size, open.variant.color].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>

                {open.status === "pending" ? (
                  <div>
                    <p className="mb-1.5 text-xs font-bold text-ink">
                      Internal note (optional)
                    </p>
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Why this was approved or rejected — visible to admins only."
                      maxLength={500}
                    />
                  </div>
                ) : (
                  open.adminNote && (
                    <div className="rounded-2xl border border-line p-3">
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                        Admin note
                      </p>
                      <p className="text-xs text-ink-soft">{open.adminNote}</p>
                    </div>
                  )
                )}

                <Button
                  variant="danger"
                  size="sm"
                  className="w-full"
                  onClick={() => void remove(open._id)}
                >
                  <Trash2 className="size-3.5" />
                  Delete permanently
                </Button>
              </div>

              {open.status === "pending" && (
                <footer className="flex gap-2 border-t border-line p-4">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    disabled={working !== null}
                    onClick={() => moderate(false)}
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
                    onClick={() => moderate(true)}
                  >
                    {working === "approve" ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Publishing…
                      </>
                    ) : (
                      <>
                        <Check className="size-4" />
                        Approve &amp; publish
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
