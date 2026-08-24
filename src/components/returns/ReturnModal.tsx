"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Check, CreditCard, Info, Landmark, Loader2, PackageX, Smartphone, X } from "lucide-react";

import { Button, Field, Input, Textarea } from "@/components/ui/Form";
import { returnApi, ApiError } from "@/utils/service";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

type Item = {
  index: number;
  title: string;
  image?: string;
  size?: string;
  color?: string;
  qty: number;
  price: number;
  isReturnable: boolean;
  returnWindowDays: number;
  eligible: boolean;
  reason: string | null;
  closesAt: string;
};

type RefundMode = "source" | "bank" | "upi";

type Context = {
  orderNo: string;
  delivered: boolean;
  items: Item[];
  anyEligible: boolean;
  reasons: { code: string; label: string }[];
  payment: {
    method: string;
    prepaid: boolean;
    bankRequired: boolean;
    defaultMode: RefundMode;
  };
  pickupAddress: {
    fullName: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  } | null;
};

const emptyBank = {
  accountName: "",
  accountNumber: "",
  ifsc: "",
  bankName: "",
  upiId: "",
};

/**
 * Return request.
 *
 * Item-level, not order-level: a three-item order where only the shoes did
 * not fit should return the shoes and refund that amount, leaving the rest
 * alone. Items the API marks ineligible are shown greyed with the reason
 * rather than hidden — a customer looking for a missing item deserves to know
 * why it is not there.
 */
export function ReturnModal({
  orderId,
  open,
  onClose,
  onDone,
}: {
  orderId: string;
  open: boolean;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [ctx, setCtx] = useState<Context | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [reasonCode, setReasonCode] = useState("");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<RefundMode>("source");
  const [bank, setBank] = useState(emptyBank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  /* Reset during render rather than in an effect: opening the modal a second
     time must not flash the previous request's selection before an effect
     clears it. */
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setCtx(null);
      setPicked([]);
      setReasonCode("");
      setNote("");
      setBank(emptyBank);
      setMode("source");
      setError("");
      setDone(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    returnApi
      .context(orderId)
      .then((d) => {
        const next = d as Context;
        setCtx(next);
        setMode(next.payment?.defaultMode ?? "source");
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load this order."),
      );
  }, [open, orderId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const refundTotal =
    ctx?.items
      .filter((i) => picked.includes(i.index))
      .reduce((sum, i) => sum + i.price * i.qty, 0) ?? 0;

  const submit = async () => {
    if (!picked.length) return setError("Pick at least one item to return.");
    if (!reasonCode) return setError("Choose a reason.");

    if (mode === "bank" && (!bank.accountName || !bank.accountNumber || !bank.ifsc)) {
      return setError("Add the account name, number and IFSC so we can send the refund.");
    }
    if (mode === "upi" && !bank.upiId) {
      return setError("Add the UPI ID so we can send the refund.");
    }

    setBusy(true);
    setError("");
    try {
      await returnApi.request(orderId, {
        itemIndexes: picked,
        reasonCode,
        reasonText: note.trim(),
        resolution: "refund",
        refundMode: mode,
        bankDetails: mode === "source" ? undefined : bank,
      });
      setDone(true);
      onDone?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not raise the return.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
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
            aria-label="Return items"
            className="fixed inset-x-3 bottom-3 z-[70] flex max-h-[88vh] flex-col overflow-hidden rounded-3xl bg-white sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2"
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="font-display text-base font-extrabold">
                {done ? "Return requested" : "Return items"}
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
                  We have your request
                </p>
                <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-ink-soft">
                  Our team will approve it and arrange a free pickup, usually within
                  24 hours. Your refund of{" "}
                  <b className="text-ink">{inr(refundTotal)}</b> is issued once the
                  items reach us.
                </p>
                <Button className="mt-5" onClick={onClose}>
                  Done
                </Button>
              </div>
            ) : !ctx ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-soft">
                <Loader2 className="size-4 animate-spin" />
                Loading…
              </div>
            ) : !ctx.anyEligible ? (
              <div className="px-6 py-12 text-center">
                <PackageX className="mx-auto size-10 text-ink-muted" />
                <p className="mt-3 font-display text-base font-bold">
                  Nothing here can be returned
                </p>
                <ul className="mx-auto mt-3 max-w-sm space-y-1.5 text-left">
                  {ctx.items.map((i) => (
                    <li key={i.index} className="text-xs text-ink-soft">
                      <b className="text-ink">{i.title}</b> — {i.reason}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-ink-muted">
                  If something arrived damaged, use the help chat and we will sort it out.
                </p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-5">
                  {error && (
                    <p
                      role="alert"
                      className="mb-4 flex items-start gap-2 rounded-xl border-2 border-brand-200 bg-brand-50 px-3 py-2.5 text-xs font-semibold text-brand-700"
                    >
                      <AlertCircle className="mt-px size-3.5 shrink-0" />
                      {error}
                    </p>
                  )}

                  <p className="mb-2 text-xs font-bold text-ink">
                    Which items are coming back?
                  </p>
                  <ul className="space-y-2">
                    {ctx.items.map((i) => {
                      const on = picked.includes(i.index);
                      return (
                        <li key={i.index}>
                          <button
                            type="button"
                            disabled={!i.eligible}
                            onClick={() =>
                              setPicked((prev) =>
                                prev.includes(i.index)
                                  ? prev.filter((x) => x !== i.index)
                                  : [...prev, i.index],
                              )
                            }
                            className={cn(
                              "flex w-full items-center gap-3 rounded-2xl border-2 p-2.5 text-left transition",
                              !i.eligible
                                ? "cursor-not-allowed border-line opacity-55"
                                : on
                                  ? "border-brand-400 bg-brand-50/50"
                                  : "border-line hover:border-brand-300",
                            )}
                          >
                            <span
                              className={cn(
                                "grid size-5 shrink-0 place-items-center rounded-md border-2",
                                on ? "border-brand-500 bg-brand-500" : "border-line",
                              )}
                            >
                              {on && <Check className="size-3 text-white" strokeWidth={3.5} />}
                            </span>

                            <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-cream">
                              {i.image && (
                                <Image src={i.image} alt="" fill unoptimized sizes="48px" className="object-cover" />
                              )}
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-bold text-ink">
                                {i.title}
                              </span>
                              <span className="block text-[11px] text-ink-muted">
                                {[i.size, i.color, `Qty ${i.qty}`].filter(Boolean).join(" · ")}
                              </span>
                              {i.reason && (
                                <span className="mt-0.5 block text-[11px] font-semibold text-brand-600">
                                  {i.reason}
                                </span>
                              )}
                            </span>

                            <span className="shrink-0 text-xs font-extrabold">
                              {inr(i.price * i.qty)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <p className="mb-2 mt-5 text-xs font-bold text-ink">
                    Why are you returning it? <span className="text-brand-500">*</span>
                  </p>
                  <div className="grid gap-1.5">
                    {ctx.reasons.map((r) => (
                      <button
                        key={r.code}
                        type="button"
                        onClick={() => setReasonCode(r.code)}
                        className={cn(
                          "rounded-xl border-2 px-3 py-2 text-left text-xs font-semibold transition",
                          reasonCode === r.code
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-line text-ink-soft hover:border-brand-300",
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>

                  <p className="mb-1 mt-5 text-xs font-bold text-ink">
                    Where the refund goes
                  </p>

                  {ctx.payment.prepaid ? (
                    <div className="flex items-start gap-2.5 rounded-2xl border-2 border-line px-3 py-2.5">
                      <CreditCard className="mt-0.5 size-4 shrink-0 text-brand-600" />
                      <span>
                        <span className="block text-xs font-bold text-ink">
                          Back to your original payment
                        </span>
                        <span className="block text-[11px] leading-relaxed text-ink-muted">
                          Straight to the card or UPI you paid with — usually 5–7
                          working days after we receive the items.
                        </span>
                      </span>
                    </div>
                  ) : (
                    <>
                      <p className="mb-2 text-[11px] text-ink-muted">
                        This was a cash on delivery order, so we need somewhere to
                        send the money.
                      </p>

                      <div className="grid gap-1.5">
                        <RefundChoice
                          icon={Landmark}
                          title="To a bank account"
                          sub="Account name, number and IFSC"
                          on={mode === "bank"}
                          onClick={() => setMode("bank")}
                        />
                        <RefundChoice
                          icon={Smartphone}
                          title="To a UPI ID"
                          sub="Fastest for smaller amounts"
                          on={mode === "upi"}
                          onClick={() => setMode("upi")}
                        />
                      </div>
                    </>
                  )}

                  {mode === "bank" && (
                    <div className="mt-3 grid gap-3 rounded-2xl border-2 border-line p-3">
                      <Field label="Account holder name">
                        <Input
                          value={bank.accountName}
                          onChange={(e) => setBank({ ...bank, accountName: e.target.value })}
                          placeholder="As printed on the passbook"
                          autoComplete="name"
                        />
                      </Field>
                      <Field label="Account number">
                        <Input
                          value={bank.accountNumber}
                          onChange={(e) =>
                            setBank({
                              ...bank,
                              accountNumber: e.target.value.replace(/\D/g, "").slice(0, 18),
                            })
                          }
                          inputMode="numeric"
                          placeholder="9 to 18 digits"
                        />
                      </Field>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="IFSC code">
                          <Input
                            value={bank.ifsc}
                            onChange={(e) =>
                              setBank({
                                ...bank,
                                ifsc: e.target.value.toUpperCase().slice(0, 11),
                              })
                            }
                            placeholder="HDFC0001234"
                            className="uppercase"
                          />
                        </Field>
                        <Field label="Bank name" hint="Optional">
                          <Input
                            value={bank.bankName}
                            onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
                            placeholder="HDFC Bank"
                          />
                        </Field>
                      </div>
                    </div>
                  )}

                  {mode === "upi" && (
                    <div className="mt-3 rounded-2xl border-2 border-line p-3">
                      <Field label="UPI ID">
                        <Input
                          value={bank.upiId}
                          onChange={(e) => setBank({ ...bank, upiId: e.target.value.trim() })}
                          placeholder="name@bank"
                          autoCapitalize="none"
                        />
                      </Field>
                    </div>
                  )}

                  {ctx.pickupAddress && (
                    <div className="mt-4 rounded-2xl bg-cream px-3 py-2.5">
                      <p className="text-[11px] font-bold text-ink">
                        We will collect from
                      </p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-ink-soft">
                        {ctx.pickupAddress.fullName},{" "}
                        {[ctx.pickupAddress.line1, ctx.pickupAddress.line2]
                          .filter(Boolean)
                          .join(", ")}
                        , {ctx.pickupAddress.city}, {ctx.pickupAddress.state} —{" "}
                        {ctx.pickupAddress.pincode}
                      </p>
                    </div>
                  )}

                  <Field label="Anything to add" hint="Optional" className="mt-4">
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value.slice(0, 500))}
                      placeholder="Tell us what went wrong so we can fix it."
                    />
                  </Field>

                  <p className="mt-4 flex items-start gap-2 rounded-xl bg-cream px-3 py-2.5 text-[11px] leading-relaxed text-ink-soft">
                    <Info className="mt-px size-3.5 shrink-0" />
                    Pickup is free. Keep the item with its tags and original packaging.
                    We check the items when they reach us and then start the refund —
                    you will get an email with the exact amount.
                  </p>
                </div>

                <footer className="border-t border-line p-4">
                  {picked.length > 0 && (
                    <p className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-ink-soft">
                        Value of {picked.length} item{picked.length > 1 ? "s" : ""}
                      </span>
                      <b className="font-display text-base">{inr(refundTotal)}</b>
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      onClick={submit}
                      disabled={busy || !picked.length || !reasonCode}
                      className="flex-[1.6]"
                    >
                      {busy ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Submitting…
                        </>
                      ) : (
                        "Request return"
                      )}
                    </Button>
                  </div>
                </footer>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** One refund-destination option. */
function RefundChoice({
  icon: Icon,
  title,
  sub,
  on,
  onClick,
}: {
  icon: typeof Landmark;
  title: string;
  sub: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition",
        on ? "border-brand-500 bg-brand-50" : "border-line hover:border-brand-300",
      )}
    >
      <Icon className={cn("size-4 shrink-0", on ? "text-brand-600" : "text-ink-muted")} />
      <span className="min-w-0 flex-1">
        <span className={cn("block text-xs font-bold", on ? "text-brand-700" : "text-ink")}>
          {title}
        </span>
        <span className="block text-[11px] text-ink-muted">{sub}</span>
      </span>
      <span
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded-full border-2",
          on ? "border-brand-500 bg-brand-500" : "border-line",
        )}
      >
        {on && <Check className="size-2.5 text-white" strokeWidth={4} />}
      </span>
    </button>
  );
}
