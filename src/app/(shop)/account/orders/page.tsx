import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";

import { AuthGate } from "@/components/auth/AuthGate";
import { Button } from "@/components/ui/Form";
import { OrderStatusPill } from "./OrderStatusPill";
import { accountOrders } from "@/lib/account/mock";
import { inr } from "@/lib/data";

export const metadata: Metadata = {
  title: "Your Orders",
  description: "Track, return or reorder from your KidsCares order history.",
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
  const orders = accountOrders;

  return (
    <AuthGate>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-extrabold">Your Orders</h1>
        <p className="mt-0.5 text-sm text-ink-soft">
          {orders.length} orders in the last 12 months
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line bg-white py-16 text-center">
          <Package className="size-12 text-ink-muted" />
          <p className="font-display text-lg font-bold">No orders yet</p>
          <p className="max-w-sm text-sm text-ink-muted">
            When you place an order it will show up here with live tracking.
          </p>
          <Link href="/deals" className="mt-1">
            <Button size="sm">Start shopping</Button>
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o._id}>
              <Link
                href={`/account/orders/${o._id}`}
                className="block rounded-card border border-line bg-white transition hover:border-brand-300 hover:shadow-[0_14px_32px_-20px_rgba(247,77,63,0.4)]"
              >
                <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-ink">{o.orderNo}</p>
                    <p className="text-[11px] text-ink-muted">
                      Placed{" "}
                      {new Date(o.placedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <OrderStatusPill status={o.status} className="ml-auto" />
                  <ChevronRight className="size-4 text-ink-muted" />
                </div>

                <div className="flex items-center gap-3 px-4 py-3">
                  <ul className="flex -space-x-3">
                    {o.items.slice(0, 3).map((it, i) => (
                      <li
                        key={i}
                        className="relative size-14 overflow-hidden rounded-xl border-2 border-white bg-cream"
                      >
                        <Image
                          src={it.image}
                          alt=""
                          fill
                          unoptimized
                          sizes="56px"
                          className="object-cover"
                        />
                      </li>
                    ))}
                    {o.items.length > 3 && (
                      <li className="grid size-14 place-items-center rounded-xl border-2 border-white bg-cream text-xs font-extrabold text-ink-soft">
                        +{o.items.length - 3}
                      </li>
                    )}
                  </ul>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {o.items[0].title}
                    </p>
                    {o.items.length > 1 && (
                      <p className="text-xs text-ink-muted">
                        and {o.items.length - 1} more{" "}
                        {o.items.length === 2 ? "item" : "items"}
                      </p>
                    )}
                  </div>

                  <p className="shrink-0 font-display text-base font-extrabold">
                    {inr(o.total)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AuthGate>
  );
}
