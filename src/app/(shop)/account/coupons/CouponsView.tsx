"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  BadgePercent,
  Check,
  Copy,
  Ticket,
  Truck,
} from "lucide-react";
import { Button, Input } from "@/components/ui/Form";
import { contentApi, ApiError } from "@/utils/service";
import type { Coupon } from "@/lib/account/types";
import { useCart } from "@/store/useCart";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

const TYPE_ICON = { percent: BadgePercent, flat: Ticket, shipping: Truck };

function daysLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function CouponsView({ compact = false }: { compact?: boolean }) {
  /* The cart is the source of truth for what a coupon is worth — the API
     evaluates it against live prices, so nothing is computed here. */
  const { totals, couponCode, applyCoupon, removeCoupon, load, loaded } = useCart();
  const { subtotal, shipping } = totals;

  const [all, setAll] = useState<Coupon[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const hydrated = loaded;

  useEffect(() => {
    if (!loaded) void load();
    contentApi
      .getCoupons()
      .then((list) => setAll((list ?? []) as Coupon[]))
      .catch(() => setAll([]))
      .finally(() => setLoadingList(false));
  }, [loaded, load]);

  const applied = all.find((c) => c.code === couponCode) ?? null;

  /* Eligibility is derived from the live cart, so a code the shopper cannot
     use yet says exactly how much more they need rather than failing silently. */
  /* Eligibility is mirrored client-side purely to explain WHY a code cannot
     be used yet. The API re-checks it on apply, so this is a hint, not a gate. */
  const rows = useMemo(
    () =>
      all
        .map((c) => {
          const expired = new Date(c.expiresAt).getTime() < Date.now();
          const short = subtotal < c.minOrder;
          const reason = expired
            ? "This code has expired"
            : short
              ? `Add ${inr(c.minOrder - subtotal)} more to use this code`
              : undefined;

          const raw = c.type === "percent" ? (subtotal * c.value) / 100 : c.value;
          const discount =
            reason || c.type === "shipping"
              ? 0
              : Math.round(Math.min((c.maxDiscount ?? 0) > 0 ? Math.min(raw, c.maxDiscount!) : raw, subtotal));

          return {
            coupon: c,
            reason,
            discount,
            shippingWaived: !reason && c.type === "shipping" && shipping > 0,
            eligible: !reason,
          };
        })
        .sort((a, b) => Number(b.eligible) - Number(a.eligible)),
    [all, subtotal, shipping],
  );

  const applyCode = async (c: Coupon) => {
    setError("");
    try {
      await applyCoupon(c.code);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not apply that code.");
    }
  };

  const applyTyped = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await applyCoupon(code.trim());
      setCode("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That code is not valid.");
    }
  };

  const copy = async (c: string) => {
    try {
      await navigator.clipboard.writeText(c);
      setCopied(c);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      // Clipboard can be blocked by permissions; the code is visible anyway.
    }
  };

  return (
    <>
      {!compact && (
        <div className="mb-5">
          <h1 className="font-display text-2xl font-extrabold">Coupons & Offers</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            Codes available on your account right now.
          </p>
        </div>
      )}

      <form onSubmit={applyTyped} className="mb-4 flex gap-2">
        <Input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError("");
          }}
          placeholder="Enter a coupon code"
          aria-label="Coupon code"
          className="uppercase"
        />
        <Button type="submit" disabled={!code.trim()}>
          Apply
        </Button>
      </form>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-2xl border-2 border-brand-200 bg-brand-50 px-4 py-2.5 text-xs font-semibold text-brand-700"
          >
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {hydrated && applied && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card border-2 border-mint-300 bg-mint-50 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mint-500 text-white">
            <Check className="size-5" strokeWidth={3} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-mint-700">
              {applied.code} applied
            </p>
            <p className="text-xs text-mint-700/80">{applied.title}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void removeCoupon()}>
            Remove
          </Button>
        </div>
      )}

      {loadingList ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-28 rounded-card" />
          ))}
        </div>
      ) : (
      <ul className="space-y-3">
        {rows.map(({ coupon: c, eligible, reason, discount, shippingWaived }) => {
          const Icon = TYPE_ICON[c.type];
          const isApplied = couponCode === c.code;
          const left = daysLeft(c.expiresAt);

          return (
            <li
              key={c._id}
              className={cn(
                "relative overflow-hidden rounded-card border-2 bg-white transition",
                isApplied
                  ? "border-mint-400"
                  : eligible
                    ? "border-line hover:border-brand-300"
                    : "border-line opacity-70",
              )}
            >
              {/* Perforated left edge — reads as a physical voucher. */}
              <span className="absolute inset-y-0 left-[86px] hidden w-px border-l-2 border-dashed border-line sm:block" />

              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex shrink-0 items-center gap-3 sm:w-[74px] sm:flex-col sm:gap-1">
                  <span
                    className={cn(
                      "grid size-11 place-items-center rounded-2xl",
                      eligible ? "bg-brand-50 text-brand-600" : "bg-cream text-ink-muted",
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="text-[11px] font-extrabold text-ink sm:text-center">
                    {c.type === "percent"
                      ? `${c.value}% OFF`
                      : c.type === "flat"
                        ? `${inr(c.value)} OFF`
                        : "FREE SHIP"}
                  </span>
                </div>

                <div className="min-w-0 flex-1 sm:pl-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copy(c.code)}
                      className="flex items-center gap-1.5 rounded-lg border-2 border-dashed border-line px-2 py-1 font-mono text-xs font-extrabold tracking-wider text-ink transition hover:border-brand-300"
                    >
                      {c.code}
                      {copied === c.code ? (
                        <Check className="size-3 text-mint-600" strokeWidth={3} />
                      ) : (
                        <Copy className="size-3 text-ink-muted" />
                      )}
                    </button>
                    {c.featured && (
                      <span className="rounded-full bg-sky-ks/15 px-2 py-0.5 text-[10px] font-extrabold text-sky-ks">
                        NEW
                      </span>
                    )}
                    {left <= 7 && (
                      <span className="rounded-full bg-sun-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-700">
                        {left === 0 ? "Expires today" : `${left} days left`}
                      </span>
                    )}
                  </div>

                  <p className="mt-1.5 text-sm font-bold text-ink">{c.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                    {c.description}
                  </p>

                  {eligible && (discount > 0 || shippingWaived) && (
                    <p className="mt-1 text-xs font-extrabold text-mint-600">
                      Saves {shippingWaived ? inr(shipping) : inr(discount)} on this bag
                    </p>
                  )}
                  {reason && (
                    <p className="mt-1 text-xs font-semibold text-ink-muted">{reason}</p>
                  )}
                </div>

                <div className="shrink-0">
                  {isApplied ? (
                    <Button variant="outline" size="sm" onClick={() => void removeCoupon()}>
                      Remove
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={!eligible}
                      onClick={() => applyCode(c)}
                    >
                      Apply
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      )}

      {!compact && (
        <p className="mt-6 text-center text-xs text-ink-muted">
          Only one coupon can be used per order.{" "}
          <Link href="/terms" className="font-bold text-brand-600 hover:underline">
            See terms
          </Link>
        </p>
      )}
    </>
  );
}
