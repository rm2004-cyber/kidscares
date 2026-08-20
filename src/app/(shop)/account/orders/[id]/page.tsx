import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AuthGate } from "@/components/auth/AuthGate";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Download,
  Headphones,
  MapPin,
  PackageX,
  RotateCcw,
  Wallet,
} from "lucide-react";

import { Button, SectionCard } from "@/components/ui/Form";
import { OrderStatusPill } from "../OrderStatusPill";
import { ORDER_STEPS, accountOrders } from "@/lib/account/mock";
import { inr } from "@/lib/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return accountOrders.map((o) => ({ id: o._id }));
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = accountOrders.find((o) => o._id === id);
  if (!order) notFound();

  const cancelled = order.status === "cancelled";
  const currentStep = ORDER_STEPS.findIndex((s) => s.key === order.status);

  return (
    <AuthGate>
      <Link
        href="/account/orders"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft transition hover:text-brand-600"
      >
        <ArrowLeft className="size-4" />
        All orders
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold">{order.orderNo}</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            Placed on{" "}
            {new Date(order.placedAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <OrderStatusPill status={order.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <SectionCard title={cancelled ? "Order cancelled" : "Delivery progress"}>
            {cancelled ? (
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600">
                  <PackageX className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">
                    This order was cancelled
                  </p>
                  <p className="text-xs text-ink-soft">
                    Any amount paid is refunded to the original payment method
                    within 3–5 working days.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <ol className="relative">
                  {ORDER_STEPS.map((step, i) => {
                    const done = i <= currentStep;
                    const active = i === currentStep;
                    const last = i === ORDER_STEPS.length - 1;

                    return (
                      <li key={step.key} className="flex gap-3 pb-6 last:pb-0">
                        <div className="flex flex-col items-center">
                          <span
                            className={cn(
                              "grid size-7 shrink-0 place-items-center rounded-full border-2 transition",
                              done
                                ? "border-mint-500 bg-mint-500 text-white"
                                : "border-line bg-white text-ink-muted",
                              active && "ring-4 ring-mint-100",
                            )}
                          >
                            {done ? (
                              <Check className="size-3.5" strokeWidth={3.5} />
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

                        <div className="-mt-0.5 pb-1">
                          <p
                            className={cn(
                              "text-sm font-bold",
                              done ? "text-ink" : "text-ink-muted",
                            )}
                          >
                            {step.label}
                          </p>
                          {active && (
                            <p className="text-xs text-ink-soft">
                              Expected by{" "}
                              {new Date(order.eta).toLocaleDateString("en-IN", {
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

                {order.status !== "delivered" && (
                  <div className="mt-2 rounded-2xl bg-cream p-3 text-xs text-ink-soft">
                    Arriving by{" "}
                    <b className="text-ink">
                      {new Date(order.eta).toLocaleDateString("en-IN", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </b>
                  </div>
                )}
              </>
            )}
          </SectionCard>

          <SectionCard title={`Items (${order.items.length})`} bodyClassName="p-0">
            <ul className="divide-y divide-line">
              {order.items.map((it, i) => (
                <li key={i} className="flex gap-3 p-4">
                  <Link
                    href={`/product/${it.slug}`}
                    className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-cream"
                  >
                    <Image
                      src={it.image}
                      alt=""
                      fill
                      unoptimized
                      sizes="80px"
                      className="object-cover"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-brand-600">
                      {it.brand}
                    </p>
                    <Link
                      href={`/product/${it.slug}`}
                      className="line-clamp-2 text-sm font-bold text-ink hover:text-brand-600"
                    >
                      {it.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Size {it.size} · {it.color} · Qty {it.qty}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm font-extrabold">
                        {inr(it.price * it.qty)}
                      </span>
                      {order.status === "delivered" && (
                        <Link
                          href={`/product/${it.slug}`}
                          className="ml-auto rounded-full border-2 border-line px-3 py-1 text-[11px] font-bold text-ink-soft transition hover:border-brand-300 hover:text-brand-600"
                        >
                          Buy again
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <aside className="space-y-4">
          <SectionCard title="Delivery address">
            <div className="flex gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-ink-muted" />
              <div className="min-w-0 text-xs leading-relaxed text-ink-soft">
                <p className="text-sm font-bold text-ink">{order.address.fullName}</p>
                <p>
                  {order.address.line1}
                  {order.address.line2 ? `, ${order.address.line2}` : ""}
                </p>
                <p>
                  {order.address.city}, {order.address.state} —{" "}
                  {order.address.pincode}
                </p>
                <p className="mt-1 font-semibold">{order.address.phone}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Payment summary">
            <dl className="space-y-2 text-sm">
              <Row label="Subtotal" value={inr(order.subtotal)} />
              {order.discount > 0 && (
                <Row label="Discount" value={`− ${inr(order.discount)}`} accent />
              )}
              <Row
                label="Delivery"
                value={order.shipping === 0 ? "FREE" : inr(order.shipping)}
                accent={order.shipping === 0}
              />
              <div className="flex items-center justify-between border-t border-line pt-2 font-display text-base font-extrabold">
                <dt>Total</dt>
                <dd>{inr(order.total)}</dd>
              </div>
            </dl>
            <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-cream px-3 py-2 text-xs font-semibold text-ink-soft">
              <Wallet className="size-3.5" />
              {order.payment === "cod" ? "Cash on delivery" : "Paid online"}
            </p>
          </SectionCard>

          <SectionCard title="Need help?">
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Download className="size-4" />
                Download invoice
              </Button>
              {order.status === "delivered" && (
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <RotateCcw className="size-4" />
                  Return or exchange
                </Button>
              )}
              <Link href="/help/contact" className="block">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Headphones className="size-4" />
                  Contact support
                </Button>
              </Link>
            </div>
          </SectionCard>
        </aside>
      </div>
    </AuthGate>
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
