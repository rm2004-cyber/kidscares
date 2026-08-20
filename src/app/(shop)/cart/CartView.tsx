"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Lock, Minus, Plus, Trash2 } from "lucide-react";
import { cartTotals, lineKey, useCart } from "@/store/useCart";
import { useHydrated } from "@/lib/useHydrated";
import { loginHref, useAuth } from "@/store/useAuth";
import { inr } from "@/lib/data";
import { Glyph } from "@/components/ui/Glyph";
import { ProductGridSkeleton } from "@/components/ui/Skeletons";

export function CartView() {
  const mounted = useHydrated();
  const { lines, remove, setQty } = useCart();
  const user = useAuth((s) => s.user);
  const { subtotal, savings, shipping, total, count } = cartTotals(lines);

  if (!mounted) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <ProductGridSkeleton count={3} />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
        <Glyph name="cart" className="size-20 text-brand-300" />
        <h1 className="mt-4 font-display text-2xl font-extrabold">
          Your bag is empty
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Once you add something, it will wait for you here.
        </p>
        <Link
          href="/deals"
          className="mt-6 rounded-full bg-brand-500 px-7 py-3 text-sm font-bold text-white transition hover:bg-brand-600"
        >
          Browse today&apos;s deals
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
        Your Bag <span className="text-base text-ink-muted">({count} items)</span>
      </h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <ul className="divide-y divide-line rounded-card border border-line bg-white">
          <AnimatePresence initial={false}>
            {lines.map((l) => {
              const key = lineKey(l);
              return (
                <motion.li
                  key={key}
                  layout
                  exit={{ opacity: 0, height: 0 }}
                  className="flex gap-4 p-4"
                >
                  <Link
                    href={`/product/${l.slug}`}
                    className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-cream sm:size-28"
                  >
                    <Image
                      src={l.image}
                      alt={l.title}
                      fill
                      unoptimized
                      sizes="112px"
                      className="object-cover"
                    />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-brand-600">
                      {l.brand}
                    </p>
                    <Link
                      href={`/product/${l.slug}`}
                      className="line-clamp-2 text-sm font-semibold sm:text-base"
                    >
                      {l.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Size {l.size} · {l.color}
                    </p>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                      <div className="flex items-center rounded-full border border-line">
                        <button
                          onClick={() => setQty(key, l.qty - 1)}
                          aria-label="Decrease quantity"
                          className="grid size-8 place-items-center"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm font-bold">
                          {l.qty}
                        </span>
                        <button
                          onClick={() => setQty(key, l.qty + 1)}
                          aria-label="Increase quantity"
                          className="grid size-8 place-items-center"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-display text-base font-extrabold">
                          {inr(l.price * l.qty)}
                        </span>
                        <button
                          onClick={() => remove(key)}
                          aria-label={`Remove ${l.title}`}
                          className="text-ink-muted transition hover:text-brand-500"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        <aside className="h-fit rounded-card border border-line bg-white p-5 lg:sticky lg:top-32">
          <h2 className="font-display text-lg font-extrabold">Order Summary</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <Row label={`Subtotal (${count} items)`} value={inr(subtotal)} />
            {savings > 0 && (
              <Row label="Discount" value={`− ${inr(savings)}`} accent />
            )}
            <Row
              label="Delivery"
              value={shipping === 0 ? "FREE" : inr(shipping)}
              accent={shipping === 0}
            />
            <div className="flex items-center justify-between border-t border-line pt-3 font-display text-lg font-extrabold">
              <dt>Total</dt>
              <dd>{inr(total)}</dd>
            </div>
          </dl>

          <Link
            href={user ? "/checkout" : loginHref("/checkout")}
            className="mt-5 flex items-center justify-center gap-2 rounded-full bg-brand-500 py-3.5 text-center text-sm font-bold text-white transition hover:bg-brand-600"
          >
            {!user && <Lock className="size-4" />}
            {user ? "Proceed to Checkout" : "Sign in to Checkout"}
          </Link>
          {!user && (
            <p className="mt-2 text-center text-xs text-ink-muted">
              Your bag is saved — you will come straight back here.
            </p>
          )}
          <p className="mt-3 text-center text-xs text-ink-muted">
            Secure payment · Easy 30-day returns
          </p>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={accent ? "font-bold text-mint-600" : "font-semibold"}>
        {value}
      </dd>
    </div>
  );
}
