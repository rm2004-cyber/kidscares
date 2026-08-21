"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  Headphones,
  Loader2,
  MessageCircle,
  PackageSearch,
  RotateCcw,
  Send,
  Truck,
  X,
} from "lucide-react";

import { supportApi, ApiError } from "@/utils/service";
import { useAuth, loginHref } from "@/store/useAuth";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Support chatbot.
 *
 * Scripted, not generative — every branch is a known state, so it can be
 * trusted to take a real action (cancelling an order, triggering a refund)
 * without a model deciding anything. It reads the same cancellation rules the
 * API enforces, so it never offers an option the server would reject.
 */

type Msg = {
  id: string;
  from: "bot" | "user";
  text: string;
  at: number;
};

type OrderLite = {
  _id: string;
  orderNo: string;
  status: string;
  total: number;
  itemCount: number;
  firstItem?: string;
  image?: string;
  placedAt: string;
  cancellable: boolean;
  line: { label: string; detail: string };
};

type Reason = { code: string; label: string };

type Step =
  | "greeting"
  | "orders"
  | "order-actions"
  | "cancel-reasons"
  | "cancel-note"
  | "working"
  | "done"
  | "track";

let seq = 0;
const nextId = () => `m${Date.now()}-${seq++}`;

export function ChatWidget() {
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("greeting");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [selected, setSelected] = useState<OrderLite | null>(null);
  const [reasonCode, setReasonCode] = useState<string>("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  const say = (from: Msg["from"], text: string) =>
    setMessages((prev) => [...prev, { id: nextId(), from, text, at: Date.now() }]);

  /* Keep the newest message in view as the conversation grows. */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, step]);

  useEffect(() => {
    document.body.style.overflow = open && window.innerWidth < 640 ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const greet = () => {
    setMessages([
      {
        id: nextId(),
        from: "bot",
        text: user
          ? `Hi ${user.name.split(" ")[0]}! I can help with your orders — tracking, cancelling or anything else.`
          : "Hi there! I can help with orders, delivery and returns.",
        at: Date.now(),
      },
      {
        id: nextId(),
        from: "bot",
        text: "What would you like to do?",
        at: Date.now(),
      },
    ]);
    setStep("greeting");
    setSelected(null);
    setReasonCode("");
    setNote("");
    setError("");
  };

  useEffect(() => {
    if (open && messages.length === 0) greet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await supportApi.chatContext();
      setOrders(data.orders ?? []);
      setReasons(data.reasons ?? []);
      setStep("orders");
      say(
        "bot",
        data.orders?.length
          ? "Here are your open orders. Which one is this about?"
          : "You do not have any open orders right now.",
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your orders.");
    } finally {
      setLoading(false);
    }
  };

  const chooseOrder = (order: OrderLite, intent: "track" | "cancel" | "menu") => {
    setSelected(order);
    say("user", `Order ${order.orderNo}`);

    if (intent === "track") {
      say("bot", `${order.line.label} — ${order.line.detail}`);
      setStep("track");
      return;
    }
    if (intent === "cancel") {
      startCancel(order);
      return;
    }
    setStep("order-actions");
  };

  const startCancel = (order: OrderLite) => {
    setSelected(order);
    if (!order.cancellable) {
      /* Mirrors the API rule exactly: once the courier has it, cancelling
         means a recall, which a human has to arrange. */
      say(
        "bot",
        "This parcel has already left our warehouse, so I cannot cancel it instantly. " +
          "I can still raise a recall request and our team will confirm within 24 hours. Shall I?",
      );
    } else {
      say("bot", "No problem. Could you tell me why you want to cancel?");
    }
    setStep("cancel-reasons");
  };

  const submitCancellation = async () => {
    if (!selected || !reasonCode) return;

    setStep("working");
    setLoading(true);
    setError("");

    const label = reasons.find((r) => r.code === reasonCode)?.label ?? reasonCode;
    say("user", note.trim() ? `${label} — ${note.trim()}` : label);

    try {
      const result = await supportApi.requestCancellation(selected._id, {
        reasonCode,
        reasonText: note.trim() || label,
        // The full exchange is stored with the request so the admin sees
        // exactly what the customer was told.
        transcript: messages.map((m) => ({ from: m.from, text: m.text })),
      });

      say("bot", result.message);
      if (result.outcome === "cancelled") {
        say("bot", "You will get a confirmation email shortly.");
      }
      setStep("done");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Something went wrong.";
      say("bot", msg);
      setError(msg);
      setStep("done");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMessages([]);
    greet();
  };

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close help chat" : "Open help chat"}
        aria-expanded={open}
        className={cn(
          "fixed right-4 z-[55] grid size-14 place-items-center rounded-full bg-ink text-white shadow-[0_12px_32px_-8px_rgba(23,32,46,0.5)] transition-transform hover:scale-105 active:scale-95",
          // Sits above the mobile tab bar rather than under it.
          "bottom-[104px] lg:bottom-6",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="size-6" />
            </motion.span>
          ) : (
            <motion.span key="c" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle className="size-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: "spring", damping: 30, stiffness: 340 }}
            role="dialog"
            aria-label="Help chat"
            className="fixed inset-x-3 bottom-[172px] z-[55] flex max-h-[70vh] flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-[0_28px_64px_-24px_rgba(23,32,46,0.45)] sm:inset-x-auto sm:right-4 sm:w-[380px] lg:bottom-24"
          >
            {/* Header */}
            <header className="flex items-center gap-3 bg-ink px-4 py-3.5 text-white">
              {step !== "greeting" && (
                <button onClick={reset} aria-label="Start over" className="text-white/70 hover:text-white">
                  <ArrowLeft className="size-4.5" />
                </button>
              )}
              <span className="grid size-9 place-items-center rounded-full bg-brand-500">
                <Headphones className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold leading-tight">KidsCares Help</p>
                <p className="flex items-center gap-1.5 text-[11px] text-white/60">
                  <span className="size-1.5 rounded-full bg-mint-400" />
                  Usually replies instantly
                </p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-white/70 hover:text-white">
                <X className="size-4.5" />
              </button>
            </header>

            {/* Transcript */}
            <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto bg-cream p-4">
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}
                >
                  <p
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      m.from === "user"
                        ? "rounded-br-md bg-brand-500 text-white"
                        : "rounded-bl-md border border-line bg-white text-ink",
                    )}
                  >
                    {m.text}
                  </p>
                </motion.div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <span className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-line bg-white px-3.5 py-2.5">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="size-1.5 rounded-full bg-ink-muted"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </span>
                </div>
              )}
            </div>

            {/* Options */}
            <div className="border-t border-line bg-white p-3">
              {!ready ? (
                <p className="py-2 text-center text-xs text-ink-muted">Loading…</p>
              ) : !user ? (
                <div className="space-y-2">
                  <p className="text-center text-xs text-ink-soft">
                    Sign in so I can see your orders.
                  </p>
                  <Link href={loginHref("/account/orders")} onClick={() => setOpen(false)}>
                    <Chip primary>Sign in</Chip>
                  </Link>
                </div>
              ) : step === "greeting" ? (
                <div className="grid gap-2">
                  <Chip onClick={loadOrders} icon={PackageSearch}>Track my order</Chip>
                  <Chip onClick={loadOrders} icon={RotateCcw}>Cancel an order</Chip>
                  <Link href="/help/contact" onClick={() => setOpen(false)}>
                    <Chip icon={Headphones}>Something else</Chip>
                  </Link>
                </div>
              ) : step === "orders" ? (
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {orders.length === 0 ? (
                    <Link href="/" onClick={() => setOpen(false)}>
                      <Chip primary>Start shopping</Chip>
                    </Link>
                  ) : (
                    orders.map((o) => (
                      <button
                        key={o._id}
                        onClick={() => chooseOrder(o, "menu")}
                        className="flex w-full items-center gap-2.5 rounded-2xl border-2 border-line p-2 text-left transition hover:border-brand-300"
                      >
                        {o.image && (
                          <span className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-cream">
                            <Image src={o.image} alt="" fill unoptimized sizes="40px" className="object-cover" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-extrabold text-ink">{o.orderNo}</span>
                          <span className="block truncate text-[11px] text-ink-muted">
                            {o.firstItem}
                            {o.itemCount > 1 && ` +${o.itemCount - 1}`}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs font-bold">{inr(o.total)}</span>
                      </button>
                    ))
                  )}
                </div>
              ) : step === "order-actions" && selected ? (
                <div className="grid gap-2">
                  <Chip onClick={() => chooseOrder(selected, "track")} icon={Truck}>
                    Where is it?
                  </Chip>
                  <Chip onClick={() => startCancel(selected)} icon={RotateCcw}>
                    Cancel this order
                  </Chip>
                  <Chip onClick={() => setStep("orders")}>Pick another order</Chip>
                </div>
              ) : step === "track" && selected ? (
                <div className="grid gap-2">
                  <Link href={`/account/orders/${selected._id}`} onClick={() => setOpen(false)}>
                    <Chip primary icon={PackageSearch}>See full tracking</Chip>
                  </Link>
                  {selected.cancellable && (
                    <Chip onClick={() => startCancel(selected)} icon={RotateCcw}>
                      Cancel instead
                    </Chip>
                  )}
                  <Chip onClick={reset}>Back to start</Chip>
                </div>
              ) : step === "cancel-reasons" ? (
                <div className="max-h-56 space-y-1.5 overflow-y-auto">
                  {reasons.map((r) => (
                    <button
                      key={r.code}
                      onClick={() => {
                        setReasonCode(r.code);
                        setStep("cancel-note");
                        say("bot", "Got it. Anything you would like to add? (optional)");
                      }}
                      className="w-full rounded-xl border-2 border-line px-3 py-2 text-left text-xs font-semibold text-ink-soft transition hover:border-brand-300 hover:text-brand-600"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              ) : step === "cancel-note" ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitCancellation()}
                      placeholder="Add a detail (optional)"
                      aria-label="Cancellation note"
                      maxLength={200}
                      className="h-10 flex-1 rounded-full border-2 border-line px-3.5 text-xs outline-none focus:border-brand-400"
                    />
                    <button
                      onClick={submitCancellation}
                      aria-label="Send"
                      className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-500 text-white transition hover:bg-brand-600"
                    >
                      <Send className="size-4" />
                    </button>
                  </div>
                  <p className="text-center text-[11px] text-ink-muted">
                    {selected?.cancellable
                      ? "This will cancel the order right away."
                      : "This raises a recall request for our team."}
                  </p>
                </div>
              ) : step === "working" ? (
                <p className="flex items-center justify-center gap-2 py-2 text-xs font-semibold text-ink-soft">
                  <Loader2 className="size-3.5 animate-spin" />
                  Working on it…
                </p>
              ) : (
                <div className="grid gap-2">
                  {selected && !error && (
                    <Link href={`/account/orders/${selected._id}`} onClick={() => setOpen(false)}>
                      <Chip primary>View order</Chip>
                    </Link>
                  )}
                  <Chip onClick={reset}>Anything else?</Chip>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Chip({
  children,
  onClick,
  icon: Icon,
  primary,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: typeof MessageCircle;
  primary?: boolean;
}) {
  return (
    <span
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => onClick && e.key === "Enter" && onClick()}
      className={cn(
        "flex w-full cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition",
        primary
          ? "bg-brand-500 text-white hover:bg-brand-600"
          : "border-2 border-line text-ink-soft hover:border-brand-300 hover:text-brand-600",
      )}
    >
      {Icon && <Icon className="size-3.5" />}
      {children}
    </span>
  );
}
