"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  Loader2,
  MapPin,
  PackageX,
  RotateCcw,
  Truck,
} from "lucide-react";

import { trackingApi, ApiError } from "@/utils/service";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

type Step = { key: string; label: string; at: string | null; done: boolean; current: boolean };

type Tracking = {
  orderNo: string;
  status: string;
  placedAt: string;
  total: number;
  itemCount: number;
  items: { title: string; image?: string; qty: number; size?: string; color?: string }[];
  courier: string | null;
  awb: string | null;
  eta: string | null;
  payment: { method?: string; status?: string };
  address: { city?: string; state?: string; pincode?: string };
  steps: Step[];
  exception: string | null;
  history: { status: string; note?: string; location?: string; at: string }[];
};

/* Our internal status names are not customer language — "rto-initiated" means
   nothing to someone waiting for a parcel. */
const HISTORY_LABEL: Record<string, string> = {
  placed: "Order placed",
  confirmed: "Order confirmed",
  packed: "Packed and ready",
  "shipment-booked": "Handed to the courier",
  shipped: "Picked up by the courier",
  "in-transit": "On the move",
  "out-for-delivery": "Out for delivery",
  delivered: "Delivered",
  "delivery-failed": "Delivery attempt did not succeed",
  "rto-initiated": "Being returned to us",
  "rto-in-transit": "On its way back to us",
  "rto-delivered": "Back at our warehouse",
  cancelled: "Order cancelled",
};

/* Plain language for states that are not on the happy path. Customers should
   not have to decode "RTO" — it is our jargon, not theirs. */
const EXCEPTION_COPY: Record<string, { title: string; body: string }> = {
  "delivery-failed": {
    title: "We could not deliver it",
    body: "The courier tried and could not complete the delivery. They will attempt again on the next working day — keeping your phone reachable helps.",
  },
  "rto-initiated": {
    title: "On its way back to us",
    body: "After several failed attempts the parcel is being returned to our warehouse. We will be in touch about a refund or a fresh delivery.",
  },
  "rto-in-transit": {
    title: "On its way back to us",
    body: "The parcel is travelling back to our warehouse. We will email you as soon as it arrives.",
  },
  "rto-delivered": {
    title: "The parcel is back with us",
    body: "It reached our warehouse. Our team will contact you about a refund or re-delivery.",
  },
  cancelled: {
    title: "This order was cancelled",
    body: "If you paid online, the refund goes back to your original payment method.",
  },
};

/**
 * Customer order tracking.
 *
 * Reads our own database rather than calling the courier, so the page shows
 * exactly what the admin panel shows and stays up even when Shiprocket is
 * down. It polls while the parcel is moving, because a tracking page that
 * needs a manual refresh is the one thing people always complain about.
 */
export function TrackView({ orderNo }: { orderNo: string }) {
  const [data, setData] = useState<Tracking | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData((await trackingApi.byOrderNo(orderNo)) as Tracking);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "We could not load this order right now.",
      );
    }
  }, [orderNo]);

  useEffect(() => {
    void load();
  }, [load]);

  /* Poll only while something can still change — a delivered order is final,
     and polling it forever is wasted traffic on someone's mobile data. */
  const settled =
    data && ["delivered", "cancelled", "rto-delivered", "returned"].includes(data.status);

  useEffect(() => {
    if (!data || settled) return;
    const id = setInterval(() => void load(), 60_000);
    return () => clearInterval(id);
  }, [data, settled, load]);

  if (error) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <PackageX className="mx-auto size-10 text-ink-muted" />
        <h1 className="mt-3 font-display text-xl font-extrabold">Order not found</h1>
        <p className="mt-1 text-sm text-ink-soft">{error}</p>
        <Link
          href="/account/orders"
          className="mt-5 inline-block rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-white"
        >
          Go to your orders
        </Link>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex items-center justify-center gap-2 py-24 text-sm text-ink-soft">
        <Loader2 className="size-4 animate-spin" />
        Loading your order…
      </main>
    );
  }

  const exception = data.exception ? EXCEPTION_COPY[data.exception] : null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <header className="mb-5">
        <p className="text-xs font-semibold text-ink-muted">Order {data.orderNo}</p>
        <h1 className="font-display text-2xl font-extrabold text-ink">
          {exception ? exception.title : data.steps.find((s) => s.current)?.label ?? "On its way"}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {data.itemCount} item{data.itemCount === 1 ? "" : "s"} · {inr(data.total)}
          {data.address.city && ` · to ${data.address.city}`}
        </p>
      </header>

      {exception && (
        <div className="mb-5 flex items-start gap-2.5 rounded-2xl border-2 border-sun-200 bg-sun-100/50 p-3.5">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-700" />
          <p className="text-xs leading-relaxed text-ink-soft">{exception.body}</p>
        </div>
      )}

      {(data.courier || data.awb) && (
        <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border-2 border-line bg-white p-3.5">
          {data.courier && (
            <span className="flex items-center gap-2 text-xs">
              <Truck className="size-4 text-ink-muted" />
              <span className="text-ink-muted">Courier</span>
              <b className="text-ink">{data.courier}</b>
            </span>
          )}
          {data.awb && (
            <span className="flex items-center gap-2 text-xs">
              <MapPin className="size-4 text-ink-muted" />
              <span className="text-ink-muted">Tracking</span>
              <b className="font-mono text-ink">{data.awb}</b>
            </span>
          )}
        </div>
      )}

      {/* ── the ladder ── */}
      <ol className="mb-6 rounded-2xl border-2 border-line bg-white p-4">
        {data.steps.map((s, i) => {
          const last = i === data.steps.length - 1;
          return (
            <li key={s.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
                    s.done
                      ? "border-mint-500 bg-mint-500"
                      : s.current
                        ? "border-brand-500 bg-brand-500"
                        : "border-line bg-white",
                  )}
                >
                  {s.done && <Check className="size-3 text-white" strokeWidth={4} />}
                  {s.current && <span className="size-1.5 rounded-full bg-white" />}
                </span>
                {!last && (
                  <span
                    className={cn("w-0.5 flex-1", s.done ? "bg-mint-500" : "bg-line")}
                  />
                )}
              </div>

              <div className={cn("min-w-0 flex-1", !last && "pb-4")}>
                <p
                  className={cn(
                    "text-sm font-bold",
                    s.done || s.current ? "text-ink" : "text-ink-muted",
                  )}
                >
                  {s.label}
                </p>
                {s.at && (
                  <p className="text-[11px] text-ink-muted">
                    {new Date(s.at).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
                {s.current && !s.at && (
                  <p className="text-[11px] text-brand-600">In progress</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* ── what is in the box ── */}
      <section className="mb-6 rounded-2xl border-2 border-line bg-white p-4">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">
          In this order
        </h2>
        <ul className="space-y-2.5">
          {data.items.map((it, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-cream">
                {it.image && (
                  <Image src={it.image} alt="" fill unoptimized sizes="48px" className="object-cover" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-ink">{it.title}</span>
                <span className="block text-[11px] text-ink-muted">
                  {[it.size, it.color, `Qty ${it.qty}`].filter(Boolean).join(" · ")}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {data.history.length > 0 && (
        <section className="rounded-2xl border-2 border-line bg-white p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-muted">
            <RotateCcw className="size-3.5" />
            Journey so far
          </h2>
          <ul className="space-y-2">
            {[...data.history].reverse().map((h, i) => (
              <li key={i} className="flex justify-between gap-3 text-[11px]">
                <span className="text-ink">
                  {HISTORY_LABEL[h.status] ?? h.note ?? h.status.replace(/-/g, " ")}
                  {h.location && <span className="text-ink-muted"> · {h.location}</span>}
                </span>
                <span className="shrink-0 text-ink-muted">
                  {new Date(h.at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
