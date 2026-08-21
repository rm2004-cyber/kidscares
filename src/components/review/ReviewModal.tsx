"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Check, Clock, Loader2, X } from "lucide-react";

import { Button, Field, Input, Textarea } from "@/components/ui/Form";
import { StarInput } from "./StarInput";
import { reviewApi, ApiError } from "@/utils/service";

export type ReviewTarget = {
  productId: string;
  orderId: string;
  title: string;
  brand?: string;
  image?: string;
  size?: string;
  color?: string;
  existingReview?: { rating: number; status: string } | null;
};

/**
 * Review composer.
 *
 * Submitting always leaves the review in `pending` — including an edit of an
 * already-approved one, because the text changed and the previous approval no
 * longer covers it. The copy says so plainly rather than implying it is live.
 */
export function ReviewModal({
  target,
  onClose,
  onSubmitted,
}: {
  target: ReviewTarget | null;
  onClose: () => void;
  onSubmitted?: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Reset whenever a different product is opened.
  useEffect(() => {
    if (!target) return;
    setRating(target.existingReview?.rating ?? 0);
    setTitle("");
    setComment("");
    setError("");
    setDone(false);
  }, [target]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;

    if (rating < 1) {
      setError("Pick a star rating first.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await reviewApi.submit({
        productId: target.productId,
        orderId: target.orderId,
        rating,
        title: title.trim(),
        comment: comment.trim(),
      });
      setDone(true);
      onSubmitted?.();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not save your review.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {target && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-ink/45"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            role="dialog"
            aria-label="Write a review"
            className="fixed inset-x-3 bottom-3 z-[70] max-h-[88vh] overflow-hidden rounded-3xl bg-white sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2"
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="font-display text-base font-extrabold">
                {done ? "Thanks for the review" : "Rate this product"}
              </h2>
              <button onClick={onClose} aria-label="Close" className="p-1">
                <X className="size-5" />
              </button>
            </header>

            {done ? (
              <div className="px-6 py-10 text-center">
                <span className="mx-auto grid size-16 place-items-center rounded-full bg-mint-100">
                  <Check className="size-8 text-mint-600" strokeWidth={3} />
                </span>
                <p className="mt-4 font-display text-lg font-extrabold">
                  Review submitted
                </p>
                <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-ink-soft">
                  Our team reads every review before it goes live. Yours will
                  appear on the product page once it is approved — usually within
                  a day.
                </p>
                <Button className="mt-5" onClick={onClose}>
                  Done
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="max-h-[70vh] overflow-y-auto p-5">
                <div className="mb-5 flex items-center gap-3 rounded-2xl bg-cream p-3">
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-white">
                    {target.image && (
                      <Image
                        src={target.image}
                        alt=""
                        fill
                        unoptimized
                        sizes="64px"
                        className="object-cover"
                      />
                    )}
                  </span>
                  <div className="min-w-0">
                    {target.brand && (
                      <p className="text-[10px] font-extrabold uppercase tracking-wide text-brand-600">
                        {target.brand}
                      </p>
                    )}
                    <p className="line-clamp-2 text-sm font-bold text-ink">
                      {target.title}
                    </p>
                    {(target.size || target.color) && (
                      <p className="text-[11px] text-ink-muted">
                        {[target.size, target.color].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>

                {target.existingReview && (
                  <p className="mb-4 flex items-start gap-2 rounded-xl border-2 border-sun-200 bg-sun-100/60 px-3 py-2.5 text-xs font-semibold text-amber-700">
                    <Clock className="mt-px size-3.5 shrink-0" />
                    You already reviewed this ({target.existingReview.rating}★,{" "}
                    {target.existingReview.status}). Saving again replaces it and
                    sends it back for approval.
                  </p>
                )}

                {error && (
                  <p
                    role="alert"
                    className="mb-4 flex items-start gap-2 rounded-xl border-2 border-brand-200 bg-brand-50 px-3 py-2.5 text-xs font-semibold text-brand-700"
                  >
                    <AlertCircle className="mt-px size-3.5 shrink-0" />
                    {error}
                  </p>
                )}

                <div className="mb-5">
                  <p className="mb-2 text-xs font-bold text-ink">
                    Your rating <span className="text-brand-500">*</span>
                  </p>
                  <StarInput value={rating} onChange={setRating} size="lg" />
                </div>

                <Field label="Headline" hint={`${title.length}/120`} className="mb-4">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, 120))}
                    placeholder="Sum it up in a few words"
                  />
                </Field>

                <Field label="Your review" hint={`${comment.length}/2000`}>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value.slice(0, 2000))}
                    placeholder="What did your child think? How is the quality, sizing and fit?"
                    className="min-h-32"
                  />
                </Field>

                <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
                  Reviews are checked before publishing. Please do not include
                  personal details — your first name and last initial are shown.
                </p>

                <div className="mt-5 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={busy} className="flex-[1.6]">
                    {busy ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      "Submit review"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
