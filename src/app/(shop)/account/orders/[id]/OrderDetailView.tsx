"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Download,
  Headphones,
  MapPin,
  Wallet,
} from "lucide-react";

import { Button, SectionCard } from "@/components/ui/Form";
import { OrderStatusPill } from "../OrderStatusPill";
import { CancelOrderButton, OrderTracking } from "./OrderTracking";
import { accountApi, reviewApi, ApiError } from "@/utils/service";
import { ReviewModal, type ReviewTarget } from "@/components/review/ReviewModal";
import { Star } from "lucide-react";
import { inr } from "@/lib/format";

type Order = {
  _id: string;
  orderNo: string;
  createdAt: string;
  status: string;
  subtotal: number;
  shipping: number;
  discount: number;
  couponCode?: string;
  total: number;
  tax?: {
    rate: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  };
  payment: { method: string; status: string };
  address?: {
    fullName: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  items: {
    product?: string;
    slug: string;
    title: string;
    brand: string;
    image?: string;
    size?: string;
    color?: string;
    qty: number;
    price: number;
  }[];
};

type MyReview = { product: string; rating: number; status: string };

export function OrderDetailView({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [target, setTarget] = useState<ReviewTarget | null>(null);

  /* Loaded so each delivered item can show whether it has already been
     reviewed, and in what state — pending, approved or rejected. */
  const loadReviews = () =>
    reviewApi
      .mine()
      .then((list) => setReviews((list ?? []) as MyReview[]))
      .catch(() => {});

  useEffect(() => {
    accountApi
      .getOrder(orderId)
      .then(setOrder)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load this order."),
      )
      .finally(() => setLoading(false));

    void loadReviews();
  }, [orderId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-40 rounded-lg" />
        <div className="skeleton h-64 rounded-card" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="rounded-card border border-line bg-white p-8 text-center">
        <AlertCircle className="mx-auto size-10 text-brand-500" />
        <p className="mt-3 font-display text-lg font-bold">{error || "Order not found"}</p>
        <Link href="/account/orders" className="mt-4 inline-block">
          <Button variant="outline" size="sm">Back to orders</Button>
        </Link>
      </div>
    );
  }

  const tax = order.tax;

  return (
    <>
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
            {new Date(order.createdAt).toLocaleDateString("en-IN", {
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
          <OrderTracking orderId={order._id} initialStatus={order.status} />

          <SectionCard title={`Items (${order.items.length})`} bodyClassName="p-0">
            <ul className="divide-y divide-line">
              {order.items.map((it, i) => (
                <li key={i} className="flex gap-3 p-4">
                  <Link
                    href={`/product/${it.slug}`}
                    className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-cream"
                  >
                    {it.image && (
                      <Image src={it.image} alt="" fill unoptimized sizes="80px" className="object-cover" />
                    )}
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
                      {[it.size && `Size ${it.size}`, it.color, `Qty ${it.qty}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold">
                        {inr(it.price * it.qty)}
                      </span>

                      {/* Reviewing is only offered once the parcel has actually
                          arrived — the API rejects it otherwise. */}
                      {order.status === "delivered" && it.product && (
                        <ReviewAction
                          review={reviews.find((r) => r.product === it.product)}
                          onClick={() =>
                            setTarget({
                              productId: it.product!,
                              orderId: order._id,
                              title: it.title,
                              brand: it.brand,
                              image: it.image,
                              size: it.size,
                              color: it.color,
                              existingReview:
                                reviews.find((r) => r.product === it.product) ?? null,
                            })
                          }
                        />
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <aside className="space-y-4">
          {order.address && (
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
                    {order.address.city}, {order.address.state} — {order.address.pincode}
                  </p>
                  <p className="mt-1 font-semibold">{order.address.phone}</p>
                </div>
              </div>
            </SectionCard>
          )}

          <SectionCard title="Billing summary">
            <dl className="space-y-2 text-sm">
              {/* Prices include GST, so the tax is shown broken out of the
                  taxable value rather than added on top. */}
              <Row label="Taxable value" value={inr(tax?.taxableValue ?? order.subtotal)} />
              {tax && tax.igst > 0 ? (
                <Row label={`IGST @ ${tax.rate}%`} value={inr(tax.igst)} />
              ) : tax ? (
                <>
                  <Row label={`CGST @ ${tax.rate / 2}%`} value={inr(tax.cgst)} />
                  <Row label={`SGST @ ${tax.rate / 2}%`} value={inr(tax.sgst)} />
                </>
              ) : null}
              {order.discount > 0 && (
                <Row
                  label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`}
                  value={`− ${inr(order.discount)}`}
                  accent
                />
              )}
              <Row
                label="Delivery charges"
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
              {order.payment.method === "cod"
                ? "Cash on delivery"
                : order.payment.status === "paid"
                  ? "Paid online"
                  : "Payment pending"}
            </p>
          </SectionCard>

          <SectionCard title="Need help?">
            <div className="space-y-2">
              <CancelOrderButton orderId={order._id} />
              <a
                href={accountApi.invoiceUrl(order._id)}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Download className="size-4" />
                  Download invoice
                </Button>
              </a>
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

      <ReviewModal
        target={target}
        onClose={() => setTarget(null)}
        onSubmitted={loadReviews}
      />
    </>
  );
}

/** Shows the review state for one item, or invites the first review. */
function ReviewAction({
  review,
  onClick,
}: {
  review?: MyReview;
  onClick: () => void;
}) {
  if (!review) {
    return (
      <button
        onClick={onClick}
        className="ml-auto flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-brand-500"
      >
        <Star className="size-3" />
        Rate &amp; review
      </button>
    );
  }

  const tone =
    review.status === "approved"
      ? "bg-mint-50 text-mint-700"
      : review.status === "rejected"
        ? "bg-red-50 text-red-600"
        : "bg-sun-100 text-amber-700";

  const label =
    review.status === "approved"
      ? "Published"
      : review.status === "rejected"
        ? "Not published"
        : "Awaiting approval";

  return (
    <button
      onClick={onClick}
      className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition hover:opacity-80 ${tone}`}
    >
      <Star className="size-3 fill-current" strokeWidth={0} />
      {review.rating}★ · {label}
    </button>
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
