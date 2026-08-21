"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Lock, Minus, PartyPopper, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { lineKey, useCart } from "@/store/useCart";
import { Glyph } from "@/components/ui/Glyph";
import { loginHref, useAuth } from "@/store/useAuth";
import { inr } from "@/lib/format";

export function CartDrawer() {
  const { lines, totals, isOpen, close, remove, setQty } = useCart();
  const { subtotal, savings, shipping, total, count, freeDeliveryThreshold } = totals;
  const user = useAuth((s) => s.user);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Threshold comes from admin Settings, not a constant in the bundle.
  const toFreeShipping = Math.max(0, freeDeliveryThreshold - subtotal);
  const progress = Math.min(100, (subtotal / Math.max(freeDeliveryThreshold, 1)) * 100);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[60] bg-ink/40"
          />
          <motion.aside
            role="dialog"
            aria-label="Shopping bag"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col bg-white"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-lg font-extrabold">
                Your Bag{" "}
                <span className="text-sm font-semibold text-ink-muted">({count})</span>
              </h2>
              <button onClick={close} aria-label="Close bag" className="p-1">
                <X className="size-5" />
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
                <span className="grid size-20 place-items-center rounded-full bg-cream">
                  <Glyph name="cart" className="size-10 text-brand-300" />
                </span>
                <p className="font-display text-lg font-bold">Your bag is empty</p>
                <p className="text-sm text-ink-muted">
                  Add a few favourites and they will show up here.
                </p>
                <Link
                  href="/deals"
                  onClick={close}
                  className="mt-2 rounded-full bg-brand-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600"
                >
                  Browse today&apos;s deals
                </Link>
              </div>
            ) : (
              <>
                <div className="border-b border-line bg-cream px-5 py-3">
                  {toFreeShipping > 0 ? (
                    <p className="text-xs font-medium text-ink-soft">
                      Add <b className="text-brand-600">{inr(toFreeShipping)}</b> more
                      for free delivery
                    </p>
                  ) : (
                    <p className="flex items-center gap-1.5 text-xs font-bold text-mint-600">
                      <PartyPopper className="size-3.5" />
                      You have unlocked free delivery
                    </p>
                  )}
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                    <motion.div
                      className="h-full rounded-full bg-mint-400"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>

                <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
                  <AnimatePresence initial={false}>
                    {lines.map((l) => {
                      const key = lineKey(l);
                      return (
                        <motion.li
                          key={key}
                          layout
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          className="flex gap-3 py-4"
                        >
                          <Link
                            href={`/product/${l.slug}`}
                            onClick={close}
                            className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-cream"
                          >
                            <Image
                              src={l.image}
                              alt={l.title}
                              fill
                              unoptimized
                              sizes="80px"
                              className="object-cover"
                            />
                          </Link>

                          <div className="flex min-w-0 flex-1 flex-col">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-brand-600">
                              {l.brand}
                            </p>
                            <Link
                              href={`/product/${l.slug}`}
                              onClick={close}
                              className="line-clamp-2 text-sm font-semibold"
                            >
                              {l.title}
                            </Link>
                            <p className="mt-0.5 text-xs text-ink-muted">
                              {l.size} · {l.color}
                            </p>

                            <div className="mt-auto flex items-center justify-between pt-2">
                              <div className="flex items-center rounded-full border border-line">
                                <button
                                  onClick={() => void setQty(l, l.qty - 1)}
                                  aria-label="Decrease quantity"
                                  className="grid size-7 place-items-center"
                                >
                                  <Minus className="size-3" />
                                </button>
                                <span className="w-6 text-center text-xs font-bold">
                                  {l.qty}
                                </span>
                                <button
                                  onClick={() => void setQty(l, l.qty + 1)}
                                  aria-label="Increase quantity"
                                  className="grid size-7 place-items-center"
                                >
                                  <Plus className="size-3" />
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold">
                                  {inr(l.price * l.qty)}
                                </span>
                                <button
                                  onClick={() => void remove(l)}
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

                <div className="space-y-2 border-t border-line px-5 py-4">
                  <Row label="Subtotal" value={inr(subtotal)} />
                  {savings > 0 && (
                    <Row label="You save" value={`− ${inr(savings)}`} accent />
                  )}
                  <Row
                    label="Delivery"
                    value={shipping === 0 ? "FREE" : inr(shipping)}
                    accent={shipping === 0}
                  />
                  <div className="flex items-center justify-between border-t border-line pt-2 text-base font-extrabold">
                    <span>Total</span>
                    <span>{inr(total)}</span>
                  </div>

                  <Link
                    href={user ? "/checkout" : loginHref("/checkout")}
                    onClick={close}
                    className="mt-2 flex items-center justify-center gap-2 rounded-full bg-brand-500 py-3.5 text-sm font-bold text-white transition hover:bg-brand-600 active:scale-[0.98]"
                  >
                    {user ? <ShoppingBag className="size-4" /> : <Lock className="size-4" />}
                    {user ? "Proceed to Checkout" : "Sign in to Checkout"}
                  </Link>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
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
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className={accent ? "font-bold text-mint-600" : "font-semibold"}>
        {value}
      </span>
    </div>
  );
}
