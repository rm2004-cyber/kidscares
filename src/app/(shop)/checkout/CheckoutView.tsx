"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  Banknote,
  Briefcase,
  Check,
  CreditCard,
  Home,
  Loader2,
  Lock,
  MapPin,
  Plus,
  Smartphone,
  Tag,
  Ticket,
  Truck,
  Zap,
} from "lucide-react";

import { Button, Input, RadioCard, SectionCard } from "@/components/ui/Form";
import { AddressFormSheet, emptyAddress, type AddressDraft } from "../account/addresses/AddressForm";
import { cartTotals, useCart } from "@/store/useCart";
import { defaultAddress, useAddresses } from "@/store/useAddresses";
import { couponDiscount, useCoupon } from "@/store/useCoupon";
import { useHydrated } from "@/lib/useHydrated";
import { coupons as ALL_COUPONS } from "@/lib/account/mock";
import { inr } from "@/lib/data";
import { cn } from "@/lib/utils";

const STEPS = ["Address", "Delivery", "Payment"] as const;

const DELIVERY = [
  {
    id: "standard",
    icon: Truck,
    title: "Standard delivery",
    subtitle: "3–5 working days",
    price: 0,
  },
  {
    id: "express",
    icon: Zap,
    title: "Express delivery",
    subtitle: "Next working day in metro cities",
    price: 99,
  },
] as const;

const PAYMENTS = [
  { id: "upi", icon: Smartphone, title: "UPI", subtitle: "GPay, PhonePe, Paytm and more" },
  { id: "card", icon: CreditCard, title: "Credit / Debit card", subtitle: "Visa, Mastercard, RuPay" },
  { id: "cod", icon: Banknote, title: "Cash on delivery", subtitle: "Pay the courier when it arrives" },
] as const;

const LABEL_ICON = { Home, Work: Briefcase, Other: MapPin };

export function CheckoutView() {
  const router = useRouter();
  const hydrated = useHydrated();

  const lines = useCart((s) => s.lines);
  const clearCart = useCart((s) => s.clear);
  const { addresses, add } = useAddresses();
  const applied = useCoupon((s) => s.applied);
  const applyCoupon = useCoupon((s) => s.apply);
  const clearCoupon = useCoupon((s) => s.clear);

  const [step, setStep] = useState(0);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<string>("standard");
  const [payment, setPayment] = useState<string>("upi");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [placing, setPlacing] = useState(false);

  const totals = cartTotals(lines);
  const selectedAddress =
    addresses.find((a) => a._id === addressId) ?? defaultAddress(addresses);

  const deliveryFee =
    DELIVERY.find((d) => d.id === delivery)?.price ?? 0;
  const baseShipping = totals.shipping + deliveryFee;

  const couponResult = useMemo(
    () => couponDiscount(applied, totals.subtotal, baseShipping),
    [applied, totals.subtotal, baseShipping],
  );

  const shipping = couponResult.shippingWaived ? 0 : baseShipping;
  const grandTotal = Math.max(
    0,
    totals.subtotal + shipping - couponResult.discount,
  );

  const applyTyped = (e: React.FormEvent) => {
    e.preventDefault();
    const found = ALL_COUPONS.find(
      (c) => c.code.toLowerCase() === codeInput.trim().toLowerCase(),
    );
    if (!found) {
      setCodeError("That code is not valid.");
      return;
    }
    const res = couponDiscount(found, totals.subtotal, baseShipping);
    if (res.reason) {
      setCodeError(res.reason);
      return;
    }
    applyCoupon(found);
    setCodeInput("");
    setCodeError("");
  };

  const placeOrder = () => {
    setPlacing(true);
    // Payment integration lands with the backend phase.
    setTimeout(() => {
      clearCart();
      clearCoupon();
      router.push("/checkout/success");
    }, 1100);
  };

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="skeleton h-96 rounded-card" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
        <Ticket className="size-14 text-ink-muted" />
        <h1 className="mt-4 font-display text-2xl font-extrabold">
          Nothing to check out
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Your bag is empty. Add a few things first.
        </p>
        <Link href="/deals" className="mt-6">
          <Button>Browse today&apos;s deals</Button>
        </Link>
      </div>
    );
  }

  const canContinue = step === 0 ? !!selectedAddress : true;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Link
        href="/cart"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft transition hover:text-brand-600"
      >
        <ArrowLeft className="size-4" />
        Back to bag
      </Link>

      <h1 className="mb-5 font-display text-2xl font-extrabold sm:text-3xl">
        Checkout
      </h1>

      {/* Step rail — also a back control for completed steps. */}
      <ol className="mb-6 flex items-center gap-2">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <button
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className={cn(
                  "flex items-center gap-2 rounded-full px-1 py-1 text-xs font-bold transition",
                  i < step && "cursor-pointer hover:opacity-80",
                  i > step && "cursor-default",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full border-2 text-[11px]",
                    done && "border-mint-500 bg-mint-500 text-white",
                    active && "border-brand-500 bg-brand-500 text-white",
                    !done && !active && "border-line bg-white text-ink-muted",
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={3.5} /> : i + 1}
                </span>
                <span
                  className={cn(
                    "hidden sm:inline",
                    active ? "text-ink" : "text-ink-muted",
                  )}
                >
                  {label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <span
                  className={cn(
                    "h-0.5 flex-1 rounded-full",
                    i < step ? "bg-mint-400" : "bg-line",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && (
                <SectionCard
                  title="Delivery address"
                  actions={
                    <button
                      onClick={() => setSheetOpen(true)}
                      className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline"
                    >
                      <Plus className="size-3.5" />
                      Add new
                    </button>
                  }
                  bodyClassName="space-y-2"
                >
                  {addresses.length === 0 ? (
                    <div className="py-8 text-center">
                      <MapPin className="mx-auto size-10 text-ink-muted" />
                      <p className="mt-2 text-sm font-bold">No saved addresses</p>
                      <Button
                        size="sm"
                        className="mt-3"
                        onClick={() => setSheetOpen(true)}
                      >
                        Add an address
                      </Button>
                    </div>
                  ) : (
                    addresses.map((a) => {
                      const Icon = LABEL_ICON[a.label];
                      return (
                        <RadioCard
                          key={a._id}
                          selected={selectedAddress?._id === a._id}
                          onSelect={() => setAddressId(a._id)}
                          icon={Icon}
                          title={
                            <span className="flex items-center gap-2">
                              {a.fullName}
                              <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-extrabold text-ink-soft">
                                {a.label}
                              </span>
                            </span>
                          }
                          subtitle={
                            <>
                              {a.line1}
                              {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} —{" "}
                              {a.pincode}
                              <br />
                              {a.phone}
                            </>
                          }
                        />
                      );
                    })
                  )}
                </SectionCard>
              )}

              {step === 1 && (
                <SectionCard title="Delivery speed" bodyClassName="space-y-2">
                  {DELIVERY.map((d) => (
                    <RadioCard
                      key={d.id}
                      selected={delivery === d.id}
                      onSelect={() => setDelivery(d.id)}
                      icon={d.icon}
                      title={d.title}
                      subtitle={d.subtitle}
                      right={
                        <span className="shrink-0 text-sm font-extrabold text-ink">
                          {d.price === 0 ? "FREE" : `+${inr(d.price)}`}
                        </span>
                      }
                    />
                  ))}
                </SectionCard>
              )}

              {step === 2 && (
                <SectionCard title="Payment method" bodyClassName="space-y-2">
                  {PAYMENTS.map((p) => (
                    <RadioCard
                      key={p.id}
                      selected={payment === p.id}
                      onSelect={() => setPayment(p.id)}
                      icon={p.icon}
                      title={p.title}
                      subtitle={p.subtitle}
                    >
                      {p.id === "upi" && (
                        <Input placeholder="yourname@upi" aria-label="UPI ID" />
                      )}
                      {p.id === "card" && (
                        <div className="grid gap-2 sm:grid-cols-[1fr_90px_90px]">
                          <Input placeholder="Card number" inputMode="numeric" aria-label="Card number" />
                          <Input placeholder="MM/YY" aria-label="Expiry" />
                          <Input placeholder="CVV" inputMode="numeric" aria-label="CVV" />
                        </div>
                      )}
                      {p.id === "cod" && (
                        <p className="text-xs text-ink-soft">
                          Keep the exact amount ready. A ₹0 handling fee applies.
                        </p>
                      )}
                    </RadioCard>
                  ))}

                  <p className="flex items-center justify-center gap-1.5 pt-2 text-[11px] font-semibold text-ink-muted">
                    <Lock className="size-3" />
                    This is a preview build — no payment is taken.
                  </p>
                </SectionCard>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-4 flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                className="flex-1"
                disabled={!canContinue}
                onClick={() => setStep((s) => s + 1)}
              >
                Continue
              </Button>
            ) : (
              <Button className="flex-1" disabled={placing} onClick={placeOrder}>
                {placing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Placing order…
                  </>
                ) : (
                  <>
                    <Lock className="size-4" />
                    Place order · {inr(grandTotal)}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
          <SectionCard title={`Your bag (${totals.count})`} bodyClassName="p-0">
            <ul className="max-h-64 divide-y divide-line overflow-y-auto">
              {lines.map((l, i) => (
                <li key={i} className="flex gap-3 p-3">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-cream">
                    <Image src={l.image} alt="" fill unoptimized sizes="56px" className="object-cover" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-xs font-bold">{l.title}</p>
                    <p className="text-[11px] text-ink-muted">
                      {l.size} · {l.color} · Qty {l.qty}
                    </p>
                  </div>
                  <span className="text-xs font-extrabold">
                    {inr(l.price * l.qty)}
                  </span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Coupon">
            {applied && !couponResult.reason ? (
              <div className="flex items-center gap-2 rounded-2xl border-2 border-mint-300 bg-mint-50 p-3">
                <Tag className="size-4 shrink-0 text-mint-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold text-mint-700">
                    {applied.code}
                  </p>
                  <p className="text-[11px] text-mint-700/80">{applied.title}</p>
                </div>
                <button
                  onClick={clearCoupon}
                  className="text-[11px] font-bold text-ink-soft hover:text-brand-600"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={applyTyped} className="flex gap-2">
                <Input
                  value={codeInput}
                  onChange={(e) => {
                    setCodeInput(e.target.value.toUpperCase());
                    setCodeError("");
                  }}
                  placeholder="Coupon code"
                  aria-label="Coupon code"
                  className="uppercase"
                />
                <Button type="submit" disabled={!codeInput.trim()}>
                  Apply
                </Button>
              </form>
            )}
            {codeError && (
              <p className="mt-2 text-[11px] font-semibold text-brand-600">
                {codeError}
              </p>
            )}
            <Link
              href="/account/coupons"
              className="mt-2 inline-block text-[11px] font-bold text-brand-600 hover:underline"
            >
              See all available coupons
            </Link>
          </SectionCard>

          <SectionCard title="Price details">
            <dl className="space-y-2 text-sm">
              <Row label={`Subtotal (${totals.count} items)`} value={inr(totals.subtotal)} />
              {totals.savings > 0 && (
                <Row label="Product discount" value={`− ${inr(totals.savings)}`} accent />
              )}
              {couponResult.discount > 0 && (
                <Row
                  label={`Coupon (${applied?.code})`}
                  value={`− ${inr(couponResult.discount)}`}
                  accent
                />
              )}
              <Row
                label="Delivery"
                value={shipping === 0 ? "FREE" : inr(shipping)}
                accent={shipping === 0}
              />
              <div className="flex items-center justify-between border-t border-line pt-2 font-display text-lg font-extrabold">
                <dt>Total</dt>
                <dd>{inr(grandTotal)}</dd>
              </div>
            </dl>
          </SectionCard>
        </aside>
      </div>

      <AddressFormSheet
        open={sheetOpen}
        initial={emptyAddress}
        title="Add a delivery address"
        onClose={() => setSheetOpen(false)}
        onSave={(v: AddressDraft) => {
          const id = add(v);
          setAddressId(id);
          setSheetOpen(false);
        }}
      />
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
    <div className="flex items-center justify-between gap-2">
      <dt className="min-w-0 truncate text-ink-soft">{label}</dt>
      <dd className={accent ? "shrink-0 font-bold text-mint-600" : "shrink-0 font-semibold"}>
        {value}
      </dd>
    </div>
  );
}
