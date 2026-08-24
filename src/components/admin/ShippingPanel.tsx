"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  Box,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Loader2,
  MapPin,
  Package,
  Truck,
  X,
  Zap,
} from "lucide-react";

import { Badge, Button, Input } from "@/components/admin/ui";
import { adminApi, ApiError } from "@/utils/service";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

type Parcel = { weightKg: number; lengthCm: number; breadthCm: number; heightCm: number };

type OrderLike = {
  _id: string;
  orderNo: string;
  status: string;
  total: number;
  payment?: { method?: string; status?: string };
  acceptedByName?: string;
  acceptedAt?: string;
  packedByName?: string;
  packedAt?: string;
  parcel?: Parcel;
  shipping_details?: {
    awb?: string;
    courier?: string;
    trackingUrl?: string;
  };
};

type Courier = {
  courierId: number;
  name: string;
  rate: number;
  codCharge: number;
  codAvailable: boolean;
  estimatedDays: string | number | null;
  rating: number | null;
  deliveryPerformance: number | null;
  recommended: boolean;
};

type Options = {
  options: Courier[];
  cheapestId: number | null;
  fastestId: number | null;
  totalReturned: number;
  codAmount: number;
  from: string;
  to: string;
};

const DEFAULT_PARCEL: Parcel = { weightKg: 0.5, lengthCm: 15, breadthCm: 12, heightCm: 8 };

/**
 * The admin's shipping controls.
 *
 * Shows exactly one action at a time — accept, pack, or book — because the
 * order can only be in one place, and a panel full of greyed-out buttons makes
 * people guess. Once a courier holds the parcel there is nothing to press:
 * every status after that arrives from tracking, so the panel becomes a
 * read-only record rather than a set of levers that could contradict it.
 */
export function ShippingPanel({
  order,
  onChanged,
}: {
  order: OrderLike;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [parcel, setParcel] = useState<Parcel>(order.parcel ?? DEFAULT_PARCEL);
  const [picker, setPicker] = useState(false);

  useEffect(() => {
    setParcel(order.parcel ?? DEFAULT_PARCEL);
    setError("");
  }, [order._id, order.parcel]);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError("");
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That did not work. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const d = order.shipping_details ?? {};
  const booked = Boolean(d.awb);
  const cod = order.payment?.method === "cod";

  return (
    <div className="rounded-2xl border-2 border-line p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
          <Truck className="size-3.5" />
          Shipping
        </p>
        <Badge tone={booked ? "mint" : "neutral"}>
          {booked ? "Booked" : "Not booked"}
        </Badge>
      </div>

      {error && (
        <p className="mb-2.5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600">
          <AlertCircle className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      )}

      {/* ── what we know so far ── */}
      <dl className="mb-3 space-y-1 text-xs">
        <Line label="Courier" value={d.courier ?? "Not selected"} muted={!d.courier} />
        <Line label="AWB" value={d.awb ?? "Not generated"} muted={!d.awb} mono={Boolean(d.awb)} />
        {order.acceptedByName && (
          <Line label="Accepted by" value={order.acceptedByName} />
        )}
        {order.packedByName && <Line label="Packed by" value={order.packedByName} />}
      </dl>

      {/* ── step 1: accept ── */}
      {order.status === "placed" && (
        <Button
          className="w-full"
          disabled={busy !== null}
          onClick={() => run("accept", () => adminApi.acceptOrder(order._id))}
        >
          {busy === "accept" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ClipboardCheck className="size-4" />
          )}
          Accept order
        </Button>
      )}

      {/* ── step 2: measure and pack ── */}
      {["confirmed", "packed"].includes(order.status) && (
        <div>
          <p className="mb-1.5 text-[11px] font-bold text-ink">
            {order.status === "packed" ? "Parcel measurements" : "Measure the parcel"}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Dim
              label="Weight (kg)"
              value={parcel.weightKg}
              onChange={(v) => setParcel({ ...parcel, weightKg: v })}
            />
            <Dim
              label="Length (cm)"
              value={parcel.lengthCm}
              onChange={(v) => setParcel({ ...parcel, lengthCm: v })}
            />
            <Dim
              label="Breadth (cm)"
              value={parcel.breadthCm}
              onChange={(v) => setParcel({ ...parcel, breadthCm: v })}
            />
            <Dim
              label="Height (cm)"
              value={parcel.heightCm}
              onChange={(v) => setParcel({ ...parcel, heightCm: v })}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-ink-muted">
            Couriers bill on the greater of actual and volumetric weight, so a
            rough guess here becomes a billing adjustment later.
          </p>

          <Button
            className="mt-2.5 w-full"
            variant={order.status === "packed" ? "secondary" : "primary"}
            disabled={busy !== null}
            onClick={() => run("pack", () => adminApi.packOrder(order._id, parcel))}
          >
            {busy === "pack" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Box className="size-4" />
            )}
            {order.status === "packed" ? "Update measurements" : "Mark as packed"}
          </Button>
        </div>
      )}

      {/* ── step 3: book a courier ── */}
      {order.status === "packed" && (
        <Button className="mt-2 w-full" onClick={() => setPicker(true)} disabled={busy !== null}>
          <Truck className="size-4" />
          Book shipping
        </Button>
      )}

      {/* ── booked: nothing left to press ── */}
      {booked && (
        <>
          {d.trackingUrl && (
            <a
              href={d.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-xs font-bold text-ink-soft transition hover:border-brand-300 hover:text-brand-600"
            >
              <MapPin className="size-4" />
              Track shipment
            </a>
          )}
          <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-ink-muted">
            <Clock className="mt-px size-3 shrink-0" />
            This parcel is with the courier. Its status updates on its own from
            Shiprocket tracking — there is nothing to set by hand.
          </p>
        </>
      )}

      <CourierPicker
        open={picker}
        order={order}
        cod={cod}
        onClose={() => setPicker(false)}
        onBooked={() => {
          setPicker(false);
          onChanged();
        }}
      />
    </div>
  );
}

/* ─────────────────────────── courier picker ───────────────────────────── */

/**
 * Quotes and books.
 *
 * Every option Shiprocket returns is shown with its real price and ETA rather
 * than auto-picking the cheapest: the cheapest is often two days slower, and
 * only the person looking at the order knows whether that is acceptable.
 */
function CourierPicker({
  open,
  order,
  cod,
  onClose,
  onBooked,
}: {
  open: boolean;
  order: OrderLike;
  cod: boolean;
  onClose: () => void;
  onBooked: () => void;
}) {
  const [data, setData] = useState<Options | null>(null);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setData(null);
    try {
      setData((await adminApi.courierOptions(order._id)) as Options);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not reach Shiprocket for quotes.",
      );
    } finally {
      setLoading(false);
    }
  }, [order._id]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const book = async (courierId: number) => {
    setBooking(courierId);
    setError("");
    try {
      await adminApi.bookShipment(order._id, courierId);
      onBooked();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Booking failed. Try another courier.");
    } finally {
      setBooking(null);
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
            className="fixed inset-0 z-[60] bg-ink/50"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            role="dialog"
            aria-label="Choose a courier"
            className="fixed inset-x-3 top-[6vh] z-[60] flex max-h-[88vh] flex-col overflow-hidden rounded-2xl bg-white sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-2xl sm:-translate-x-1/2"
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <div>
                <h2 className="text-sm font-bold text-ink">Choose a courier</h2>
                <p className="text-[11px] text-ink-muted">
                  {order.orderNo}
                  {data && ` · ${data.from} → ${data.to}`}
                  {cod && data ? ` · COD ${inr(data.codAmount)}` : ""}
                </p>
              </div>
              <button onClick={onClose} aria-label="Close" className="p-1">
                <X className="size-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
              {error && (
                <p className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-600">
                  <AlertCircle className="mt-px size-4 shrink-0" />
                  {error}
                </p>
              )}

              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-soft">
                  <Loader2 className="size-4 animate-spin" />
                  Asking Shiprocket for quotes…
                </div>
              ) : !data ? null : data.options.length === 0 ? (
                <div className="py-12 text-center">
                  <Package className="mx-auto size-9 text-ink-muted" />
                  <p className="mt-3 text-sm font-bold text-ink">No courier will take this</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-ink-soft">
                    {data.totalReturned > 0
                      ? "Shiprocket returned couriers, but none can service this pincode with the parcel and payment type on this order."
                      : "Shiprocket has no courier serving this pincode pair. Check the delivery pincode and your pickup location."}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {data.options.map((c) => {
                    const blockedByCod = cod && !c.codAvailable;
                    return (
                      <li key={c.courierId}>
                        <div
                          className={cn(
                            "flex flex-wrap items-center gap-3 rounded-xl border-2 p-3",
                            blockedByCod ? "border-line opacity-55" : "border-line",
                          )}
                        >
                          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-cream text-ink-soft">
                            <Truck className="size-4" />
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-ink">
                              {c.name}
                              {c.courierId === data.cheapestId && (
                                <Badge tone="mint">Cheapest</Badge>
                              )}
                              {c.courierId === data.fastestId &&
                                c.courierId !== data.cheapestId && (
                                  <Badge tone="sky">Fastest</Badge>
                                )}
                            </p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-ink-muted">
                              {c.estimatedDays != null && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="size-3" />
                                  {c.estimatedDays} day
                                  {Number(c.estimatedDays) === 1 ? "" : "s"}
                                </span>
                              )}
                              {c.rating != null && (
                                <span className="inline-flex items-center gap-1">
                                  <Zap className="size-3" />
                                  {c.rating.toFixed(1)}
                                </span>
                              )}
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1",
                                  blockedByCod && "font-bold text-red-600",
                                )}
                              >
                                {c.codAvailable ? (
                                  <CheckCircle2 className="size-3" />
                                ) : (
                                  <X className="size-3" />
                                )}
                                COD {c.codAvailable ? "ok" : "not available"}
                              </span>
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="font-display text-base font-extrabold text-ink">
                              {inr(c.rate)}
                            </p>
                            {cod && c.codCharge > 0 && (
                              <p className="text-[10px] text-ink-muted">
                                incl. {inr(c.codCharge)} COD
                              </p>
                            )}
                          </div>

                          <Button
                            size="sm"
                            disabled={booking !== null || blockedByCod}
                            onClick={() => book(c.courierId)}
                          >
                            {booking === c.courierId ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                Booking…
                              </>
                            ) : (
                              <>
                                <Check className="size-4" />
                                Book
                              </>
                            )}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <footer className="border-t border-line px-4 py-3">
              <p className="text-[11px] text-ink-muted">
                Booking generates the AWB and requests a pickup. The order stays
                <b className="text-ink"> booked</b> until the courier actually
                collects it — only then does it become shipped.
              </p>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ──────────────────────────────── bits ────────────────────────────────── */

function Line({
  label,
  value,
  muted,
  mono,
}: {
  label: string;
  value: string;
  muted?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd
        className={cn(
          "truncate font-semibold",
          muted ? "text-ink-muted" : "text-ink",
          mono && "font-mono",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Dim({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] font-semibold text-ink-muted">{label}</span>
      <Input
        value={String(value)}
        inputMode="decimal"
        onChange={(e) => onChange(Number(e.target.value.replace(/[^\d.]/g, "")) || 0)}
      />
    </label>
  );
}
