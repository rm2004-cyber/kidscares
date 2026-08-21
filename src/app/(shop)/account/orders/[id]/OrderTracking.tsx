"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  Check,
  ExternalLink,
  Loader2,
  MapPin,
  PackageX,
  RefreshCw,
  Truck,
} from "lucide-react";

import { Button, SectionCard } from "@/components/ui/Form";
import { supportApi, ApiError } from "@/utils/service";
import { cn } from "@/lib/utils";

type Scan = { status: string; location?: string; at: string; note?: string };

type StatusPayload = {
  orderNo: string;
  status: string;
  line: { label: string; detail: string };
  cancellable: boolean;
  tracking: {
    courier: string | null;
    awb: string | null;
    trackingUrl: string | null;
    updatedAt: string | null;
    scans: Scan[];
  };
  timeline: { status: string; at: string; note?: string }[];
  eta: string | null;
};

const STEPS = [
  { key: "placed", label: "Order placed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "packed", label: "Packed" },
  { key: "shipped", label: "Shipped" },
  { key: "in-transit", label: "In transit" },
  { key: "out-for-delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
];

/**
 * Live order tracking.
 *
 * The status line and the cancel button both come from the API, not from the
 * status rendered at build time — the server decides whether cancelling is
 * still allowed, and it re-checks the courier when its last scan is stale.
 * Rendering the button from a cached status would offer an action the API
 * would then refuse.
 */
export function OrderTracking({
  orderId,
  initialStatus,
}: {
  orderId: string;
  initialStatus: string;
}) {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const payload = await supportApi.orderStatus(orderId);
        setData(payload);
        setError("");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load tracking.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  /* Poll while the parcel is actually moving. Terminal states never change,
     so polling them would be pure waste. */
  useEffect(() => {
    const live = ["shipped", "in-transit", "out-for-delivery"].includes(
      data?.status ?? initialStatus,
    );
    if (!live) return;

    const id = setInterval(() => void load(true), 60_000);
    return () => clearInterval(id);
  }, [data?.status, initialStatus, load]);

  if (loading) {
    return (
      <SectionCard title="Delivery progress">
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-6 rounded-lg" />
          ))}
        </div>
      </SectionCard>
    );
  }

  if (error || !data) {
    return (
      <SectionCard title="Delivery progress">
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <AlertCircle className="size-4 text-brand-500" />
          {error || "Tracking is unavailable right now."}
        </p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => load(true)}>
          <RefreshCw className="size-3.5" />
          Try again
        </Button>
      </SectionCard>
    );
  }

  const cancelled = data.status === "cancelled";
  const returned = ["returned", "rto"].includes(data.status);
  const currentStep = STEPS.findIndex((s) => s.key === data.status);
  const t = data.tracking;

  return (
    <SectionCard
      title={cancelled ? "Order cancelled" : "Delivery progress"}
      actions={
        !cancelled &&
        !returned && (
          <button
            onClick={() => load(true)}
            aria-label="Refresh tracking"
            className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline"
          >
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
            Refresh
          </button>
        )
      }
    >
      {/* One-line status, the way Flipkart shows it. */}
      <div
        className={cn(
          "mb-5 flex items-start gap-3 rounded-2xl border-2 p-4",
          cancelled
            ? "border-red-200 bg-red-50"
            : data.status === "delivered"
              ? "border-mint-300 bg-mint-50"
              : "border-line bg-cream",
        )}
      >
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl",
            cancelled
              ? "bg-red-100 text-red-600"
              : data.status === "delivered"
                ? "bg-mint-100 text-mint-700"
                : "bg-white text-brand-600",
          )}
        >
          {cancelled ? (
            <PackageX className="size-5" />
          ) : data.status === "delivered" ? (
            <Check className="size-5" strokeWidth={3} />
          ) : (
            <Truck className="size-5" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-extrabold text-ink">{data.line.label}</p>
          <p className="text-sm text-ink-soft">{data.line.detail}</p>

          {t.awb && (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-muted">
              <span>
                {t.courier} · <b className="text-ink">{t.awb}</b>
              </span>
              {t.trackingUrl && (
                <a
                  href={t.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-brand-600 hover:underline"
                >
                  Track on courier site
                  <ExternalLink className="size-3" />
                </a>
              )}
            </p>
          )}
        </div>
      </div>

      {!cancelled && !returned && (
        <ol className="relative">
          {STEPS.map((step, i) => {
            const done = i <= currentStep;
            const active = i === currentStep;
            const last = i === STEPS.length - 1;

            return (
              <li key={step.key} className="flex gap-3 pb-5 last:pb-0">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full border-2 transition",
                      done
                        ? "border-mint-500 bg-mint-500 text-white"
                        : "border-line bg-white text-ink-muted",
                      active && "ring-4 ring-mint-100",
                    )}
                  >
                    {done ? (
                      <Check className="size-3" strokeWidth={3.5} />
                    ) : (
                      <span className="size-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  {!last && (
                    <span
                      className={cn(
                        "w-0.5 flex-1 transition-colors",
                        i < currentStep ? "bg-mint-400" : "bg-line",
                      )}
                    />
                  )}
                </div>

                <div className="-mt-0.5">
                  <p className={cn("text-sm font-bold", done ? "text-ink" : "text-ink-muted")}>
                    {step.label}
                  </p>
                  {active && data.eta && data.status !== "delivered" && (
                    <p className="text-xs text-ink-soft">
                      Expected by{" "}
                      {new Date(data.eta).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Courier scan history, newest first. */}
      <AnimatePresence>
        {t.scans.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 overflow-hidden border-t border-line pt-4"
          >
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
              Courier updates
            </p>
            <ul className="max-h-56 space-y-2.5 overflow-y-auto">
              {[...t.scans].reverse().map((s, i) => (
                <li key={i} className="flex gap-2.5 text-xs">
                  <MapPin className="mt-0.5 size-3 shrink-0 text-ink-muted" />
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{s.status}</p>
                    <p className="text-ink-muted">
                      {[s.location, new Date(s.at).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {t.updatedAt && (
        <p className="mt-3 text-[11px] text-ink-muted">
          Last checked{" "}
          {new Date(t.updatedAt).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </SectionCard>
  );
}

/**
 * Cancel control.
 *
 * Only rendered while the API says cancelling is still allowed. After the
 * parcel ships, the button is replaced with a pointer to the help chat, which
 * raises a recall request instead of cancelling outright.
 */
export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [ctx, setCtx] = useState<{
    cancellable: boolean;
    afterShipping: boolean;
    alreadyRequested: boolean;
    status: string;
  } | null>(null);

  useEffect(() => {
    supportApi
      .cancellationContext(orderId)
      .then(setCtx)
      .catch(() => setCtx(null));
  }, [orderId]);

  if (!ctx) return null;
  if (["cancelled", "returned", "delivered"].includes(ctx.status)) return null;

  if (ctx.alreadyRequested) {
    return (
      <div className="rounded-2xl border-2 border-sun-200 bg-sun-100/60 p-3">
        <p className="flex items-center gap-2 text-xs font-bold text-amber-700">
          <Loader2 className="size-3.5 animate-spin" />
          Cancellation requested
        </p>
        <p className="mt-1 text-[11px] text-amber-700/80">
          Our team is reviewing it and will confirm within 24 hours.
        </p>
      </div>
    );
  }

  if (!ctx.cancellable) {
    return (
      <div className="rounded-2xl border-2 border-line p-3">
        <p className="text-xs font-bold text-ink">Need to cancel?</p>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
          This parcel has already left our warehouse, so we need to recall it from the
          courier. Open the help chat at the bottom right and we will raise it for you.
        </p>
      </div>
    );
  }

  return (
    <Button
      variant="danger"
      size="sm"
      className="w-full justify-start"
      onClick={() => {
        // The chat widget owns the reason capture, so cancelling always
        // produces a reason the admin can act on.
        document
          .querySelector<HTMLButtonElement>('[aria-label="Open help chat"]')
          ?.click();
      }}
    >
      <PackageX className="size-4" />
      Cancel this order
    </Button>
  );
}
