import type { Metadata } from "next";
import Link from "next/link";
import { Check, Package, Truck } from "lucide-react";
import { Button, SectionCard } from "@/components/ui/Form";
import { accountOrders } from "@/lib/account/mock";
import { inr } from "@/lib/data";

export const metadata: Metadata = {
  title: "Order placed",
  robots: { index: false, follow: false },
};

export default function OrderSuccessPage() {
  // Until orders are persisted, the most recent mock order stands in.
  const order = accountOrders[0];
  const eta = new Date(Date.now() + 4 * 86_400_000);

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 text-center">
      <span className="mx-auto grid size-20 place-items-center rounded-full bg-mint-100">
        <Check className="size-10 text-mint-600" strokeWidth={3} />
      </span>

      <h1 className="mt-5 font-display text-3xl font-extrabold">
        Order placed
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        Thanks — we have sent a confirmation to your email. You can track it any
        time from Your Orders.
      </p>

      <SectionCard className="mt-8 text-left">
        <dl className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-ink-soft">Order number</dt>
            <dd className="font-extrabold">{order.orderNo}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-ink-soft">Amount paid</dt>
            <dd className="font-extrabold">{inr(order.total)}</dd>
          </div>
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
        </dl>
      </SectionCard>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href={`/account/orders/${order._id}`}>
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
