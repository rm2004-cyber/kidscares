"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Heart, Home, Search, ShoppingBag, User } from "lucide-react";
import { useCart } from "@/store/useCart";
import { useWishlist } from "@/store/useWishlist";
import { useHydrated } from "@/lib/useHydrated";
import { cn } from "@/lib/utils";

/**
 * Mobile bottom tab bar — the web counterpart of the app's CustomTabBar.
 *
 * Keeps the app's shape: a floating rounded pill inset from all three edges,
 * with a white indicator that slides between tabs. Reanimated's shared-value
 * translateX is replaced by a motion `layoutId`, which animates the pill
 * between positions without measuring tab widths by hand.
 */

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/cart", label: "Cart", icon: ShoppingBag },
  { href: "/account", label: "Profile", icon: User },
] as const;

/** Routes where the bar would fight a page's own primary action. */
const HIDE_ON = ["/checkout"];

export function BottomTabs() {
  const pathname = usePathname();
  const mounted = useHydrated();

  const count = useCart((s) => s.totals.count);
  const wishlistCount = useWishlist((s) => s.ids.length);

  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  /* Longest-prefix match so /product/x and /category/y still light up Home,
     while /wishlist does not also match "/". */
  const activeHref =
    TABS.filter((t) => (t.href === "/" ? pathname === "/" : pathname.startsWith(t.href)))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? "/";

  const badgeFor = (href: string) => {
    if (!mounted) return 0;
    if (href === "/cart") return count;
    if (href === "/wishlist") return wishlistCount;
    return 0;
  };

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-2.5 bottom-2.5 z-40 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Opaque background: this bar is fixed over scrolling content, so a
          backdrop-filter here would re-blur on every frame of every scroll. */}
      <ul className="relative flex h-[68px] items-stretch rounded-[34px] border border-line bg-white px-1.5 shadow-[0_-6px_28px_-8px_rgba(23,32,46,0.28)]">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = activeHref === href;
          const badge = badgeFor(href);

          return (
            <li key={href} className="relative flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="relative flex h-full flex-col items-center justify-center gap-0.5"
              >
                {/* The sliding pill. One element shared across tabs via
                    layoutId, so motion tweens it instead of cross-fading. */}
                {active && (
                  <motion.span
                    layoutId="bottom-tab-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-x-1 inset-y-1.5 -z-10 rounded-[26px] bg-brand-50 ring-1 ring-brand-100"
                  />
                )}

                <span className="relative">
                  <Icon
                    className={cn(
                      "size-[22px] transition-colors duration-200",
                      active ? "text-brand-600" : "text-ink-soft",
                    )}
                    // Wishlist reads better filled when it is the active tab.
                    fill={active && href === "/wishlist" ? "currentColor" : "none"}
                    strokeWidth={active ? 2.4 : 2}
                  />

                  {badge > 0 && (
                    <motion.span
                      key={badge}
                      initial={{ scale: 0.4 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                      className="absolute -right-2 -top-1.5 grid min-w-[17px] place-items-center rounded-full bg-brand-500 px-1 text-[9px] font-bold leading-[15px] text-white"
                    >
                      {badge > 99 ? "99+" : badge}
                    </motion.span>
                  )}
                </span>

                <span
                  className={cn(
                    "text-[10px] leading-tight transition-colors duration-200",
                    active ? "font-bold text-brand-600" : "font-medium text-ink-soft",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
