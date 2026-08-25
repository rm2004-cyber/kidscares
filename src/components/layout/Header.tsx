"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  ChevronDown,
  Flame,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import type { AgeGroup, Category } from "@/lib/types";
import { RotatingPlaceholder } from "./RotatingPlaceholder";
import { useCart } from "@/store/useCart";
import { useWishlist } from "@/store/useWishlist";
import { useHydrated } from "@/lib/useHydrated";
import { Logo } from "./Logo";
import { GlyphBadge } from "@/components/ui/Glyph";
import { AGE_GLYPHS } from "@/lib/theme/ageGlyphs";
import { catalogApi } from "@/utils/service";
import { cn } from "@/lib/utils";

type Suggestion = {
  _id: string;
  slug: string;
  title: string;
  brand: string;
  images?: { url: string }[];
};

type Props = {
  topCategories: Category[];
  allCategories: Category[];
  ageGroups: AgeGroup[];
};

/* Shown when the catalogue has not loaded yet, so the bar is never blank. */
const FALLBACK_TERMS = ["clothes", "footwear", "soft toys", "prams", "daily needs"];

export function Header({ topCategories, allCategories, ageGroups }: Props) {
  const router = useRouter();
  const mounted = useHydrated();

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const scrolledRef = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const count = useCart((s) => s.totals.count);
  const openCart = useCart((s) => s.open);
  const wishlistCount = useWishlist((s) => s.ids.length);

  /* Scroll only ever toggles a boolean, so the handler is throttled to one
     rAF and bails before touching React state unless the value actually
     changed. Without the ref guard this ran setState on every scroll event
     while the sticky header was being repainted. */
  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      const next = window.scrollY > 8;
      if (next !== scrolledRef.current) {
        scrolledRef.current = next;
        setScrolled(next);
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Body scroll lock while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  /* Small delay on close so the pointer can cross the gap between the
     trigger and the panel without the menu flickering shut. */
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpenMenu(null), 140);
  };
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  /* Real category names keep the hints honest — a hard-coded list would go on
     advertising an aisle long after it was removed. */
  const searchTerms = useMemo(() => {
    const names = (topCategories.length ? topCategories : allCategories)
      .map((c) => c.name?.toLowerCase())
      .filter((n): n is string => Boolean(n));
    return names.length >= 2 ? names.slice(0, 6) : FALLBACK_TERMS;
  }, [topCategories, allCategories]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      setSuggestOpen(false);
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  /* Debounced so a fast typist fires one request, not one per keystroke.
     Anything under two characters matches too much to be useful. */
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      catalogApi
        .suggestions(q)
        .then((list) => {
          setSuggestions((list ?? []) as Suggestion[]);
          setSuggestOpen(true);
        })
        .catch(() => setSuggestions([]));
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <header
      /* Opaque, not translucent+blurred. A backdrop-filter on a sticky
         element forces the browser to re-blur that strip on every scroll
         frame, which was a large share of the scroll cost. */
      className={cn(
        "sticky top-0 z-50 bg-white transition-shadow duration-300",
        scrolled ? "shadow-[0_4px_24px_-12px_rgba(23,32,46,0.25)]" : "border-b border-line",
      )}
      onMouseLeave={scheduleClose}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-5 lg:h-[70px]">
        <button
          type="button"
          className="grid size-9 place-items-center rounded-full text-ink lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>

        <Logo size="lg" priority reload className="!h-10 sm:!h-11 lg:!h-12" />

        <div className="relative hidden flex-1 md:block">
          <form onSubmit={submitSearch} className="relative flex items-center" role="search">
            <Search className="pointer-events-none absolute left-4 size-4 text-ink-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => suggestions.length && setSuggestOpen(true)}
              onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
              placeholder=""
              aria-label="Search products"
              aria-expanded={suggestOpen}
              className="h-11 w-full rounded-full border border-line bg-cream pl-11 pr-4 text-sm outline-none transition focus:border-brand-300 focus:bg-white"
            />
            <RotatingPlaceholder
              terms={searchTerms}
              hidden={query.length > 0}
              className="left-11 right-4"
            />
          </form>

          <AnimatePresence>
            {suggestOpen && suggestions.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-white py-1.5 shadow-[0_20px_44px_-20px_rgba(23,32,46,0.35)]"
              >
                {suggestions.map((sug) => (
                  <li key={sug._id}>
                    <Link
                      href={`/product/${sug.slug}`}
                      onClick={() => setSuggestOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 transition hover:bg-cream"
                    >
                      <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-cream">
                        {sug.images?.[0]?.url && (
                          <Image
                            src={sug.images[0].url}
                            alt=""
                            fill
                            unoptimized
                            sizes="40px"
                            className="object-cover"
                          />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {sug.title}
                        </span>
                        <span className="block text-[11px] text-ink-muted">{sug.brand}</span>
                      </span>
                    </Link>
                  </li>
                ))}
                <li className="border-t border-line pt-1">
                  <button
                    onClick={() => {
                      setSuggestOpen(false);
                      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-brand-600 hover:bg-cream"
                  >
                    See all results for “{query.trim()}”
                  </button>
                </li>
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        <nav className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/account"
            className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-ink transition hover:bg-cream sm:flex"
          >
            <User className="size-4.5" />
            <span className="hidden lg:inline">Account</span>
          </Link>

          {/*
            Deals only shows below md, where it fills the gap the two icons
            below leave behind. The desktop category bar already carries a
            "Today's Deals" link, so showing it here too would be the same
            duplication this replaced.
          */}
          <Link
            href="/deals"
            className="flex items-center gap-1.5 rounded-full px-2.5 py-2 text-sm font-bold text-brand-600 transition hover:bg-brand-50 md:hidden"
            aria-label="Today's deals"
          >
            <Flame className="size-5" />
            <span>Deals</span>
          </Link>

          {/*
            Wishlist and cart live in the bottom tab bar on mobile, badges and
            all, so repeating them here bought nothing and crowded the logo.
            From md up there is no bottom bar, so they come back.
          */}
          <Link
            href="/wishlist"
            className="relative hidden size-10 place-items-center rounded-full transition hover:bg-cream md:grid"
            aria-label="Wishlist"
          >
            <Heart className="size-5" />
            {mounted && wishlistCount > 0 && <Bubble n={wishlistCount} />}
          </Link>

          <button
            type="button"
            onClick={openCart}
            className="relative hidden size-10 place-items-center rounded-full transition hover:bg-cream md:grid"
            aria-label={`Cart, ${mounted ? count : 0} items`}
          >
            <ShoppingBag className="size-5" />
            {mounted && count > 0 && <Bubble n={count} />}
          </button>
        </nav>
      </div>

      {/* Desktop category bar + mega menu */}
      <div className="hidden border-t border-line lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-4">
          <MegaTrigger
            label="Shop by Age"
            active={openMenu === "age"}
            onOpen={() => {
              cancelClose();
              setOpenMenu("age");
            }}
          />
          {topCategories.map((c) => (
            <MegaTrigger
              key={c._id}
              label={c.name}
              href={`/category/${c.slug}`}
              active={openMenu === c.slug}
              onOpen={() => {
                cancelClose();
                setOpenMenu(c.slug);
              }}
            />
          ))}
          <Link
            href="/deals"
            className="ml-auto flex items-center gap-1.5 px-3 py-3 text-sm font-bold text-brand-600"
          >
            <Flame className="size-4 fill-brand-500 text-brand-500" />
            Today&apos;s Deals
          </Link>
        </div>

        <AnimatePresence>
          {openMenu && (
            <motion.div
              key={openMenu}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onMouseEnter={cancelClose}
              className="absolute inset-x-0 top-full border-t border-line bg-white shadow-[0_24px_48px_-24px_rgba(23,32,46,0.3)]"
            >
              <div className="mx-auto max-w-7xl px-4 py-6">
                {openMenu === "age" ? (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {ageGroups.map((a, i) => (
                      <Link
                        key={a._id}
                        href={`/age/${a.slug}`}
                        onClick={() => setOpenMenu(null)}
                        className="rounded-2xl border border-line bg-cream p-4 text-center transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50"
                      >
                        <GlyphBadge
                          name={AGE_GLYPHS[i % AGE_GLYPHS.length]}
                          tone="brand"
                          className="mx-auto size-10"
                        />
                        <p className="mt-1.5 text-sm font-bold text-ink">{a.label}</p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <MegaPanel
                    parent={topCategories.find((c) => c.slug === openMenu)!}
                    subs={allCategories.filter((c) => c.parent === openMenu)}
                    onNavigate={() => setOpenMenu(null)}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile search sits below the bar so the logo row stays uncluttered */}
      <form onSubmit={submitSearch} className="border-t border-line px-4 py-2.5 md:hidden">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-4 size-4 text-ink-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder=""
            aria-label="Search products"
            className="h-10 w-full rounded-full border border-line bg-cream pl-11 pr-4 text-sm outline-none focus:border-brand-300 focus:bg-white"
          />
          <RotatingPlaceholder
            terms={searchTerms}
            hidden={query.length > 0}
            className="left-11 right-4"
          />
        </div>
      </form>

      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        topCategories={topCategories}
        allCategories={allCategories}
        ageGroups={ageGroups}
      />
    </header>
  );
}

function Bubble({ n }: { n: number }) {
  return (
    <motion.span
      key={n}
      initial={{ scale: 0.5 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white"
    >
      {n > 99 ? "99+" : n}
    </motion.span>
  );
}

function MegaTrigger({
  label,
  href,
  active,
  onOpen,
}: {
  label: string;
  href?: string;
  active: boolean;
  onOpen: () => void;
}) {
  const inner = (
    <span
      className={cn(
        "flex items-center gap-1 px-3 py-3 text-sm font-semibold transition-colors",
        active ? "text-brand-600" : "text-ink hover:text-brand-600",
      )}
    >
      {label}
      <ChevronDown
        className={cn("size-3.5 transition-transform", active && "rotate-180")}
      />
    </span>
  );

  const shared = { onMouseEnter: onOpen, onFocus: onOpen };
  return href ? (
    <Link href={href} {...shared}>
      {inner}
    </Link>
  ) : (
    <button type="button" {...shared}>
      {inner}
    </button>
  );
}

function MegaPanel({
  parent,
  subs,
  onNavigate,
}: {
  parent: Category;
  subs: Category[];
  onNavigate: () => void;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div>
        <p className="mb-4 font-display text-lg font-bold text-ink">{parent.name}</p>
        <div className="grid grid-cols-3 gap-x-6 gap-y-2.5">
          {subs.length > 0 ? (
            subs.map((s) => (
              <Link
                key={s._id}
                href={`/category/${s.slug}`}
                onClick={onNavigate}
                className="text-sm text-ink-soft transition hover:translate-x-1 hover:text-brand-600"
              >
                {s.name}
              </Link>
            ))
          ) : (
            <p className="text-sm text-ink-muted">
              Browse all {parent.productCount} products in {parent.name}.
            </p>
          )}
          <Link
            href={`/category/${parent.slug}`}
            onClick={onNavigate}
            className="text-sm font-bold text-brand-600"
          >
            View all
            <ArrowRight className="inline size-3.5" />
          </Link>
        </div>
      </div>

      <Link
        href={`/category/${parent.slug}`}
        onClick={onNavigate}
        className="group relative hidden overflow-hidden rounded-card bg-cream lg:block"
      >
        <Image
          src={parent.image}
          alt=""
          width={280}
          height={200}
          unoptimized
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-4">
          <p className="text-sm font-bold text-white">Shop {parent.name}</p>
          <p className="text-xs text-white/80">{parent.productCount} products</p>
        </div>
      </Link>
    </div>
  );
}

function MobileDrawer({
  open,
  onClose,
  topCategories,
  allCategories,
  ageGroups,
}: Props & { open: boolean; onClose: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-ink/40 lg:hidden"
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-50 flex w-[86%] max-w-sm flex-col bg-white lg:hidden"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <Logo size="md" href={null} />
              <button onClick={onClose} aria-label="Close menu" className="p-1">
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">
                Shop by Age
              </p>
              <div className="mb-6 grid grid-cols-2 gap-2">
                {ageGroups.map((a) => (
                  <Link
                    key={a._id}
                    href={`/age/${a.slug}`}
                    onClick={onClose}
                    className="rounded-xl border border-line bg-cream px-3 py-2 text-sm font-semibold"
                  >
                    {a.label}
                  </Link>
                ))}
              </div>

              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">
                Categories
              </p>
              <ul className="space-y-1">
                {topCategories.map((c) => {
                  const subs = allCategories.filter((s) => s.parent === c.slug);
                  const isOpen = expanded === c.slug;
                  return (
                    <li key={c._id} className="border-b border-line/70 last:border-0">
                      <div className="flex items-center">
                        <Link
                          href={`/category/${c.slug}`}
                          onClick={onClose}
                          className="flex-1 py-3 text-sm font-semibold"
                        >
                          {c.name}
                        </Link>
                        {subs.length > 0 && (
                          <button
                            onClick={() => setExpanded(isOpen ? null : c.slug)}
                            aria-label={`Toggle ${c.name} subcategories`}
                            aria-expanded={isOpen}
                            className="p-2"
                          >
                            <ChevronDown
                              className={cn(
                                "size-4 transition-transform",
                                isOpen && "rotate-180",
                              )}
                            />
                          </button>
                        )}
                      </div>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.ul
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden pb-2 pl-3"
                          >
                            {subs.map((s) => (
                              <li key={s._id}>
                                <Link
                                  href={`/category/${s.slug}`}
                                  onClick={onClose}
                                  className="block py-2 text-sm text-ink-soft"
                                >
                                  {s.name}
                                </Link>
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="border-t border-line p-4">
              <Link
                href="/deals"
                onClick={onClose}
                className="flex items-center justify-center gap-1.5 rounded-full bg-brand-500 py-3 text-center text-sm font-bold text-white"
              >
                <Flame className="size-4 fill-white" />
                Today&apos;s Deals
              </Link>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
