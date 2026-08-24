"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  Bell,
  ExternalLink,
  Flame,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  PackageX,
  RotateCcw,
  Search,
  Settings,
  ShoppingCart,
  Shapes,
  Tag,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { adminAuthApi } from "@/utils/service";
import { AdminGate, type Admin } from "./AdminGate";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
};

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/live", label: "Live Traffic", icon: Activity, badge: "LIVE" },
    ],
  },
  {
    group: "Catalogue",
    items: [
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/categories", label: "Categories", icon: Shapes },
      { href: "/admin/brands", label: "Brands", icon: Tag },
    ],
  },
  {
    group: "Merchandising",
    items: [
      { href: "/admin/banners", label: "Advertisements", icon: ImageIcon },
      { href: "/admin/deals", label: "Deals & Countdown", icon: Flame },
    ],
  },
  {
    group: "Operations",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
      { href: "/admin/reviews", label: "Reviews", icon: MessageSquare },
      { href: "/admin/returns", label: "Returns", icon: RotateCcw },
      { href: "/admin/cancellations", label: "Cancellations", icon: PackageX },
      { href: "/admin/payments", label: "Payments", icon: Wallet },
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return <AdminGate>{(admin) => <Shell admin={admin}>{children}</Shell>}</AdminGate>;
}

function Shell({ admin, children }: { admin: Admin; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const signOut = async () => {
    await adminAuthApi.logout().catch(() => {});
    router.replace("/admin/login");
  };

  // Close the mobile drawer whenever navigation happens.
  useEffect(() => setDrawerOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <div className="flex min-h-dvh bg-cream">
      {/* Desktop rail — always visible from lg up. */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-ink/10 bg-ink lg:flex">
        <SidebarContent pathname={pathname} onSignOut={signOut} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-50 bg-ink/50 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[82%] max-w-72 flex-col bg-ink lg:hidden"
            >
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-3.5 z-10 grid size-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X className="size-4.5" />
              </button>
              <SidebarContent pathname={pathname} onSignOut={signOut} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar admin={admin} onOpenMenu={() => setDrawerOpen(true)} />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  pathname,
  onSignOut,
}: {
  pathname: string;
  onSignOut: () => void;
}) {
  return (
    <>
      <div className="flex h-16 shrink-0 items-center gap-3 px-4">
        {/* The artwork is dark-on-transparent, so on the ink sidebar it sits
            on a light plate rather than being recoloured. */}
        <span className="rounded-xl bg-white/95 px-2.5 py-1.5">
          <Logo size="md" href="/admin" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          Admin
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV.map((section) => (
          <div key={section.group} className="mb-5">
            <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/35">
              {section.group}
            </p>
            <ul className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon, badge }) => {
                // Exact match for /admin, prefix match for its children — so
                // /admin/products does not also light up Dashboard.
                const active =
                  href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(href);

                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-white/10 text-white"
                          : "text-white/55 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="admin-nav-active"
                          transition={{ type: "spring", stiffness: 450, damping: 36 }}
                          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand-400"
                        />
                      )}
                      <Icon className="size-4.5 shrink-0" />
                      <span className="truncate">{label}</span>
                      {badge && (
                        <span className="ml-auto flex items-center gap-1 rounded-full bg-mint-500/20 px-1.5 py-0.5 text-[9px] font-bold text-mint-300">
                          <span className="size-1.5 animate-pulse rounded-full bg-mint-400" />
                          {badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <Link
          href="/"
          target="_blank"
          className="mb-1 flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-white/55 transition hover:bg-white/5 hover:text-white"
        >
          <ExternalLink className="size-4.5" />
          View storefront
        </Link>
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-white/55 transition hover:bg-white/5 hover:text-white"
        >
          <LogOut className="size-4.5" />
          Sign out
        </button>
      </div>
    </>
  );
}

function Topbar({ admin, onOpenMenu }: { admin: Admin; onOpenMenu: () => void }) {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white px-4 sm:px-6">
      <button
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="grid size-9 place-items-center rounded-xl text-ink hover:bg-cream lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <label className="relative hidden max-w-md flex-1 items-center sm:flex">
        <Search className="pointer-events-none absolute left-3.5 size-4 text-ink-muted" />
        <input
          placeholder="Search products, orders, customers…"
          aria-label="Search admin"
          className="h-10 w-full rounded-xl border border-line bg-cream pl-10 pr-3 text-sm outline-none transition focus:border-brand-300 focus:bg-white"
        />
      </label>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          aria-label="Notifications"
          className="relative grid size-9 place-items-center rounded-xl text-ink-soft hover:bg-cream"
        >
          <Bell className="size-4.5" />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-brand-500 ring-2 ring-white" />
        </button>

        <div className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 hover:bg-cream">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-100 text-xs font-extrabold text-brand-700">
            {admin.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <div className="hidden leading-tight sm:block">
            <p className="text-xs font-bold text-ink">{admin.name}</p>
            <p className="text-[10px] capitalize text-ink-muted">{admin.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
