"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { adminApi } from "@/utils/service";
import { cn } from "@/lib/utils";

type Event = {
  _id: string;
  status: string;
  courierStatus?: string;
  source: "admin" | "shiprocket" | "system" | "customer";
  note?: string;
  location?: string;
  actorName?: string;
  at: string;
};

const LABEL: Record<string, string> = {
  placed: "Order placed",
  confirmed: "Order accepted",
  packed: "Order packed",
  "shipment-booked": "Shipment booked",
  shipped: "Picked up by courier",
  "in-transit": "In transit",
  "out-for-delivery": "Out for delivery",
  delivered: "Delivered",
  "delivery-failed": "Delivery attempt failed",
  "rto-initiated": "Return to origin started",
  "rto-in-transit": "Coming back to us",
  "rto-delivered": "Back at our warehouse",
  "rto-restocked": "Stock counted back in",
  "booking-failed": "Booking failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/* Who reported it — the whole point of the history is being able to tell an
   admin's click apart from a courier's scan when the two disagree. */
const SOURCE_TONE: Record<Event["source"], string> = {
  admin: "bg-sky-ks/15 text-sky-700",
  shiprocket: "bg-mint-100 text-mint-700",
  system: "bg-cream text-ink-muted",
  customer: "bg-grape-100 text-grape-600",
};

const SOURCE_LABEL: Record<Event["source"], string> = {
  admin: "Admin",
  shiprocket: "Courier",
  system: "System",
  customer: "Customer",
};

export function OrderTimeline({ orderId, status }: { orderId: string; status: string }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEvents(((await adminApi.orderTimeline(orderId)) ?? []) as Event[]);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  /* `status` is a dependency so the history refetches when the panel above it
     books a shipment — otherwise the new line only appears on reopen. */
  useEffect(() => {
    void load();
  }, [load, status]);

  return (
    <div className="rounded-2xl border-2 border-line p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">
          Status history
        </p>
        <button
          onClick={() => void load()}
          aria-label="Refresh history"
          className="rounded-md p-1 text-ink-muted hover:bg-cream hover:text-ink"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
        </button>
      </div>

      {loading && events.length === 0 ? (
        <p className="flex items-center gap-2 py-3 text-xs text-ink-muted">
          <Loader2 className="size-3.5 animate-spin" />
          Loading…
        </p>
      ) : events.length === 0 ? (
        <p className="py-2 text-xs text-ink-muted">Nothing recorded yet.</p>
      ) : (
        <ol className="space-y-0">
          {events.map((e, i) => (
            <li key={e._id} className="flex gap-2.5">
              {/* Rail: a dot per event, joined by a line except after the last. */}
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "mt-1 size-2 shrink-0 rounded-full",
                    i === events.length - 1 ? "bg-brand-500" : "bg-line",
                  )}
                />
                {i < events.length - 1 && <span className="w-px flex-1 bg-line" />}
              </div>

              <div className={cn("min-w-0 flex-1", i < events.length - 1 && "pb-3")}>
                <p className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-ink">
                    {LABEL[e.status] ?? e.status.replace(/-/g, " ")}
                  </span>
                  <span
                    className={cn(
                      "rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide",
                      SOURCE_TONE[e.source],
                    )}
                  >
                    {SOURCE_LABEL[e.source]}
                  </span>
                </p>

                <p className="text-[10px] text-ink-muted">
                  {new Date(e.at).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {e.actorName && ` · ${e.actorName}`}
                  {e.location && ` · ${e.location}`}
                </p>

                {/* The courier's own wording, when it differs from our label —
                    useful when a mapping looks wrong. */}
                {(e.note || e.courierStatus) && (
                  <p className="mt-0.5 text-[11px] leading-snug text-ink-soft">
                    {e.note ?? e.courierStatus}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
