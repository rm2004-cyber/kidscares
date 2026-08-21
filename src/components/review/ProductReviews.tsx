"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, MessageSquare, Star } from "lucide-react";

import { Button, Select } from "@/components/ui/Form";
import { reviewApi } from "@/utils/service";
import { cn } from "@/lib/utils";

type Review = {
  _id: string;
  rating: number;
  title?: string;
  comment?: string;
  authorName: string;
  variant?: { size?: string; color?: string };
  createdAt: string;
};

type Summary = {
  rating: number;
  reviewCount: number;
  breakdown: Record<string, number>;
};

const SORTS = [
  { value: "recent", label: "Most recent" },
  { value: "high", label: "Highest rated" },
  { value: "low", label: "Lowest rated" },
];

/** First name plus last initial — enough to feel human, not identifying. */
function displayName(full: string) {
  const [first, ...rest] = full.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

/**
 * Reviews on the product page.
 *
 * Fetched client-side so the list can paginate and re-sort without a full
 * navigation, and so a newly-approved review appears without waiting for the
 * page's ISR window. Only approved reviews are ever returned by the API.
 */
export function ProductReviews({ slug }: { slug: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (nextPage: number, replace: boolean) => {
      setLoading(true);
      try {
        const res = await reviewApi.forProduct(slug, { page: nextPage, limit: 5, sort });
        const items = (res?.data ?? []) as Review[];
        setReviews((prev) => (replace ? items : [...prev, ...items]));
        setTotal(res?.meta?.total ?? 0);
        setSummary((res?.meta?.summary ?? null) as Summary | null);
      } catch {
        if (replace) setReviews([]);
      } finally {
        setLoading(false);
      }
    },
    [slug, sort],
  );

  useEffect(() => {
    setPage(1);
    void load(1, true);
  }, [load]);

  const avg = summary?.rating ?? 0;
  const count = summary?.reviewCount ?? 0;
  const breakdown = summary?.breakdown ?? {};

  return (
    <section className="rounded-card border border-line bg-white p-6">
      <h2 className="font-display text-lg font-extrabold">Ratings &amp; Reviews</h2>

      {count === 0 && !loading ? (
        <div className="py-10 text-center">
          <MessageSquare className="mx-auto size-10 text-ink-muted" />
          <p className="mt-3 font-display text-base font-bold">No reviews yet</p>
          <p className="mt-1 text-sm text-ink-muted">
            Reviews appear here once a verified buyer has shared one.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-6">
            <div className="text-center">
              <p className="font-display text-4xl font-extrabold">{avg.toFixed(1)}</p>
              <span className="flex items-center justify-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={cn(
                      "size-4",
                      i <= Math.round(avg)
                        ? "fill-sun-400 text-sun-400"
                        : "fill-line text-line",
                    )}
                    strokeWidth={0}
                  />
                ))}
              </span>
              <p className="mt-1 text-xs text-ink-muted">
                {count.toLocaleString("en-IN")}{" "}
                {count === 1 ? "review" : "reviews"}
              </p>
            </div>

            {/* Distribution is computed from the same approved reviews as the
                average, so the bars and the number can never disagree. */}
            <div className="min-w-52 flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const n = breakdown[String(star)] ?? 0;
                const pct = count ? Math.round((n / count) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-ink-muted">{star}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                      <motion.div
                        className="h-full rounded-full bg-sun-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <span className="w-8 text-right text-ink-muted">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {count > 1 && (
            <div className="mt-5 flex justify-end">
              <Select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort reviews"
                className="!w-auto !py-2 text-xs"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <ul className="mt-4 divide-y divide-line border-t border-line">
            <AnimatePresence initial={false}>
              {reviews.map((r) => (
                <motion.li
                  key={r._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-0.5 rounded-md bg-mint-500 px-1.5 py-0.5 text-[11px] font-extrabold text-white">
                      {r.rating}
                      <Star className="size-2.5 fill-white" strokeWidth={0} />
                    </span>
                    {r.title && (
                      <p className="text-sm font-bold text-ink">{r.title}</p>
                    )}
                  </div>

                  {r.comment && (
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                      {r.comment}
                    </p>
                  )}

                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-muted">
                    <span className="font-semibold text-ink">
                      {displayName(r.authorName)}
                    </span>
                    <span className="flex items-center gap-1 text-mint-600">
                      <CheckCircle2 className="size-3" />
                      Verified purchase
                    </span>
                    {(r.variant?.size || r.variant?.color) && (
                      <span>
                        {[r.variant.size, r.variant.color].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    <span>
                      {new Date(r.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </p>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          {reviews.length < total && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full"
              disabled={loading}
              onClick={() => {
                const next = page + 1;
                setPage(next);
                void load(next, false);
              }}
            >
              {loading ? "Loading…" : `Show more (${total - reviews.length} left)`}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
