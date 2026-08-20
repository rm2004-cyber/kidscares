"use client";

import { useMemo, useState } from "react";
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
import { coupons as ALL_COUPONS } from "@/lib/account/mock";
import type { Coupon } from "@/lib/account/types";
import { cartTotals, useCart } from "@/store/useCart";
import { couponDiscount, useCoupon } from "@/store/useCoupon";
import { useHydrated } from "@/lib/useHydrated";
import { inr } from "@/lib/data";
import { cn } from "@/lib/utils";

const TYPE_ICON = { percent: BadgePercent, flat: Ticket, shipping: Truck };

function daysLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function CouponsView({ compact = false }: { compact?: boolean }) {
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const { subtotal, shipping } = cartTotals(lines);

  const applied = useCoupon((s) => s.applied);
  const apply = useCoupon((s) => s.apply);
  const clear = useCoupon((s) => s.clear);

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  /* Eligibility is derived from the live cart, so a code the shopper cannot
     use yet says exactly how much more they need rather than failing silently. */
  const rows = useMemo(
    () =>
      ALL_COUPONS.map((c) => {
        const res = couponDiscount(c, subtotal, shipping);
        return {
          coupon: c,
          ...res,
          eligible: !res.reason,
          expiring: daysLeft(c.expiresAt) <= 7,
        };
      }).sort((a, b) => Number(b.eligible) - Number(a.eligible)),
    [subtotal, shipping],
  );

  const applyCode = (c: Coupon) => {
    const res = couponDiscount(c, subtotal, shipping);
    if (res.reason) {
      setError(res.reason);
      return;
    }
    setError("");
    apply(c);
  };

  const applyTyped = (e: React.FormEvent) => {
    e.preventDefault();
    const found = ALL_COUPONS.find(
      (c) => c.code.toLowerCase() === code.trim().toLowerCase(),
    );
    if (!found) {
      setError("That code is not valid. Check the spelling and try again.");
      return;
    }
    applyCode(found);
    setCode("");
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
          <Button variant="outline" size="sm" onClick={clear}>
            Remove
          </Button>
        </div>
      )}

      <ul className="space-y-3">
        {rows.map(({ coupon: c, eligible, reason, discount, shippingWaived }) => {
          const Icon = TYPE_ICON[c.type];
          const isApplied = hydrated && applied?._id === c._id;
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
                    {c.isNew && (
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
                    <Button variant="outline" size="sm" onClick={clear}>
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
