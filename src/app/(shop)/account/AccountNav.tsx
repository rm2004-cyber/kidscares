"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Heart,
  LogOut,
  MapPin,
  Package,
  Settings,
  Ticket,
  User,
} from "lucide-react";
import { loginHref, useAuth } from "@/store/useAuth";
import { useHydrated } from "@/lib/useHydrated";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/account", label: "Overview", icon: User, exact: true, guest: true },
  { href: "/account/orders", label: "Your Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/coupons", label: "Coupons", icon: Ticket },
  { href: "/wishlist", label: "Wishlist", icon: Heart, guest: true },
  { href: "/account/settings", label: "Settings", icon: Settings },
];

/**
 * Account navigation. A sidebar from `lg` up, a horizontal scrolling rail
 * below it — a vertical list would eat most of a phone screen before any
 * content appeared.
 */
export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const signedIn = hydrated && !!user;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  /* Signed-out visitors still see every entry; the link routes them through
     sign-in and back to whatever they picked. */
  const resolve = (href: string, guest?: boolean) =>
    signedIn || guest ? href : loginHref(href);

  const handleSignOut = () => {
    signOut();
    router.push("/");
  };

  return (
    <>
      <nav className="rail -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 lg:hidden">
        {LINKS.map(({ href, label, icon: Icon, exact, guest }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={resolve(href, guest)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3.5 py-2 text-xs font-bold transition",
                active
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-line bg-white text-ink-soft",
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <aside className="hidden lg:block">
        <nav className="sticky top-32 overflow-hidden rounded-card border border-line bg-white p-2">
          <ul className="space-y-0.5">
            {LINKS.map(({ href, label, icon: Icon, exact, guest }) => {
              const active = isActive(href, exact);
              return (
                <li key={href}>
                  <Link
                    href={resolve(href, guest)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                      active
                        ? "bg-brand-50 text-brand-700"
                        : "text-ink-soft hover:bg-cream hover:text-ink",
                    )}
                  >
                    <Icon className="size-4.5 shrink-0" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {signedIn && (
            <div className="mt-1 border-t border-line pt-1">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-soft transition hover:bg-cream hover:text-brand-600"
              >
                <LogOut className="size-4.5 shrink-0" />
                Sign out
              </button>
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
