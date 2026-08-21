"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  Heart,
  LogIn,
  MapPin,
  Package,
  Settings,
  Ticket,
  UserPlus,
} from "lucide-react";

import { SectionCard } from "@/components/ui/Form";
import { OrderStatusPill } from "./orders/OrderStatusPill";
import { accountApi, contentApi } from "@/utils/service";
import { loginHref, useAuth } from "@/store/useAuth";
import { inr } from "@/lib/format";

const TILES = [
  { icon: Package, title: "Your Orders", copy: "Track, return or buy again", href: "/account/orders" },
  { icon: MapPin, title: "Addresses", copy: "Manage delivery addresses", href: "/account/addresses" },
  { icon: Ticket, title: "Coupons", copy: "Offers on your account", href: "/account/coupons" },
  { icon: Heart, title: "Wishlist", copy: "Everything you saved", href: "/wishlist" },
  { icon: Settings, title: "Settings", copy: "Profile and notifications", href: "/account/settings" },
];

/** Wishlist is browsable as a guest; everything else needs a session. */
const GUEST_OK = new Set(["/wishlist"]);

type OrderLite = {
  _id: string;
  orderNo: string;
  status: string;
  total: number;
  items: { title: string; image?: string }[];
};

export function AccountHome() {
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  const signedIn = ready && !!user;

  const [recent, setRecent] = useState<OrderLite[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [deliveredCount, setDeliveredCount] = useState(0);
  const [couponCount, setCouponCount] = useState(0);

  /* Only fetched once signed in — a guest has nothing to show, and the API
     would reject the call anyway. */
  useEffect(() => {
    if (!signedIn) return;

    accountApi
      .listOrders({ limit: 20 })
      .then((res) => {
        const list = (res?.data ?? []) as OrderLite[];
        setRecent(list.slice(0, 2));
        setOrderCount(res?.meta?.total ?? list.length);
        setDeliveredCount(list.filter((o) => o.status === "delivered").length);
      })
      .catch(() => {});

    contentApi
      .getCoupons()
      .then((list) => setCouponCount((list ?? []).length))
      .catch(() => {});
  }, [signedIn]);

  const initials = user
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "";

  return (
    <>
      {/* Identity header — swaps between a greeting and a sign-in prompt. */}
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-card border border-line bg-white p-5">
        {signedIn ? (
          <>
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-brand-100 font-display text-xl font-extrabold text-brand-700">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl font-extrabold sm:text-2xl">
                Hello, {user.name.split(" ")[0]}
              </h1>
              <p className="truncate text-sm text-ink-soft">{user.email}</p>
            </div>
            <Link
              href="/account/settings"
              className="rounded-full border-2 border-line px-4 py-2 text-xs font-bold text-ink-soft transition hover:border-brand-300 hover:text-brand-600"
            >
              Edit profile
            </Link>
          </>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl font-extrabold sm:text-2xl">
                Your Account
              </h1>
              <p className="text-sm text-ink-soft">
                Sign in to see orders, coupons and saved addresses.
              </p>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Link href={loginHref("/account")} className="flex-1 sm:flex-none">
                <span className="flex items-center justify-center gap-1.5 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600">
                  <LogIn className="size-4" />
                  Sign in
                </span>
              </Link>
              <Link href="/signup" className="flex-1 sm:flex-none">
                <span className="flex items-center justify-center gap-1.5 rounded-full border-2 border-line px-5 py-2.5 text-sm font-bold text-ink-soft transition hover:border-brand-300 hover:text-brand-600">
                  <UserPlus className="size-4" />
                  Sign up
                </span>
              </Link>
            </div>
          </>
        )}
      </div>

      {signedIn && (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Orders" value={String(orderCount)} href="/account/orders" />
            <Stat label="Coupons available" value={String(couponCount)} href="/account/coupons" />
            <Stat label="Delivered" value={String(deliveredCount)} href="/account/orders" />
          </div>

          <SectionCard
            title="Recent orders"
            className="mb-4"
            bodyClassName="p-0"
            actions={
              <Link
                href="/account/orders"
                className="text-xs font-bold text-brand-600 hover:underline"
              >
                View all
              </Link>
            }
          >
            <ul className="divide-y divide-line">
              {recent.map((o) => (
                <li key={o._id}>
                  <Link
                    href={`/account/orders/${o._id}`}
                    className="flex items-center gap-3 p-4 transition hover:bg-cream/60"
                  >
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-cream">
                      <Image
                        src={o.items[0]?.image ?? ""}
                        alt=""
                        fill
                        unoptimized
                        sizes="56px"
                        className="object-cover"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink">{o.orderNo}</p>
                      <p className="truncate text-xs text-ink-muted">
                        {o.items[0]?.title}
                        {o.items.length > 1 && ` +${o.items.length - 1} more`}
                      </p>
                      <div className="mt-1">
                        <OrderStatusPill status={o.status} />
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-extrabold">{inr(o.total)}</p>
                    <ChevronRight className="size-4 shrink-0 text-ink-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>
        </>
      )}

      {/* Tiles are always visible. Signed out, they route through sign-in and
          land on the requested screen afterwards. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map(({ icon: Icon, title, copy, href }) => {
          const needsAuth = !signedIn && !GUEST_OK.has(href);
          return (
            <Link
              key={title}
              href={needsAuth ? loginHref(href) : href}
              className="flex items-start gap-3 rounded-card border border-line bg-white p-5 transition hover:-translate-y-1 hover:border-brand-300 hover:shadow-[0_16px_36px_-22px_rgba(247,77,63,0.45)]"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cream text-brand-600">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-ink">{title}</p>
                <p className="text-xs text-ink-muted">
                  {needsAuth ? "Sign in to view" : copy}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-card border border-line bg-white p-4 transition hover:border-brand-300"
    >
      <p className="font-display text-2xl font-extrabold text-ink">{value}</p>
      <p className="text-xs font-semibold text-ink-muted">{label}</p>
    </Link>
  );
}
