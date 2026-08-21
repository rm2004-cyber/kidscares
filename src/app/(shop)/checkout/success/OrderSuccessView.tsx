"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Package, Truck } from "lucide-react";

import { Button, SectionCard } from "@/components/ui/Form";
import { accountApi } from "@/utils/service";
import { inr } from "@/lib/format";

type Order = {
  _id: string;
  orderNo: string;
  total: number;
  eta?: string;
  payment?: { method: string };
};

/**
 * Order confirmation.
 *
 * Reads the order id from the URL so it shows the order that was just placed.
 * Previously this rendered a fixed sample, which meant the confirmation quoted
 * an order number the customer had never seen.
 */
export function OrderSuccessView() {
  const params = useSearchParams();
  const orderId = params.get("order");

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));

  useEffect(() => {
    if (!orderId) return;
    accountApi
      .getOrder(orderId)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [orderId]);

  const eta = order?.eta ? new Date(order.eta) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 text-center">
      <span className="mx-auto grid size-20 place-items-center rounded-full bg-mint-100">
        <Check className="size-10 text-mint-600" strokeWidth={3} />
      </span>

      <h1 className="mt-5 font-display text-3xl font-extrabold">Order placed</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Thanks — we have sent a confirmation to your email. You can track it any
        time from Your Orders.
      </p>

      {loading ? (
        <div className="skeleton mt-8 h-32 rounded-card" />
      ) : order ? (
        <SectionCard className="mt-8 text-left">
          <dl className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-ink-soft">Order number</dt>
              <dd className="font-extrabold">{order.orderNo}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-soft">
                {order.payment?.method === "cod" ? "Amount due" : "Amount paid"}
              </dt>
              <dd className="font-extrabold">{inr(order.total)}</dd>
            </div>
            {eta && (
              <div className="flex items-center justify-between border-t border-line pt-2.5">
                <dt className="flex items-center gap-1.5 text-ink-soft">
                  <Truck className="size-4" />
                  Arriving by
                </dt>
                <dd className="font-extrabold text-mint-600">
                  {eta.toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "long",
                  })}
                </dd>
              </div>
            )}
          </dl>
        </SectionCard>
      ) : null}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href={order ? `/account/orders/${order._id}` : "/account/orders"}>
          <Button className="w-full sm:w-auto">
            <Package className="size-4" />
            Track this order
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline" className="w-full sm:w-auto">
            Keep shopping
          </Button>
        </Link>
      </div>
    </div>
  );
}
