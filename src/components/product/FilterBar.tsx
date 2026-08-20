"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDown01,
  ArrowDown10,
  ArrowDownWideNarrow,
  Cake,
  Check,
  ChevronDown,
  Flame,
  IndianRupee,
  Sparkles,
  Star,
  Tag,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { AgeGroup, Brand } from "@/lib/types";
import { Glyph } from "@/components/ui/Glyph";
import { AGE_GLYPHS } from "@/lib/theme/ageGlyphs";
import { cn } from "@/lib/utils";

/**
 * Faceted filtering.
 *
 * Filters live in the URL, not in component state: every combination is a
 * shareable, crawlable, back-button-safe address. Facet URLs are disallowed in
 * robots.txt so they cannot dilute the canonical category page.
 *
 * Layout is a row of popover pills rather than a stacked panel of chip rows —
 * the panel grew taller than the product grid it was filtering, which pushed
 * the actual products below the fold on every category page.
 */

const SORTS = [
  { value: "popular", label: "Popularity", icon: Flame, tone: "text-brand-500" },
  { value: "new", label: "Newest first", icon: Sparkles, tone: "text-grape-500" },
  { value: "price-asc", label: "Price: Low to High", icon: ArrowDown01, tone: "text-mint-600" },
  { value: "price-desc", label: "Price: High to Low", icon: ArrowDown10, tone: "text-sky-ks" },
  { value: "rating", label: "Customer rating", icon: Star, tone: "text-sun-500" },
] as const;

const PRICE_BANDS = [
  { label: "Under ₹500", min: 0, max: 500 },
  { label: "₹500 – ₹1,000", min: 500, max: 1000 },
  { label: "₹1,000 – ₹2,500", min: 1000, max: 2500 },
  { label: "₹2,500 – ₹5,000", min: 2500, max: 5000 },
  { label: "Above ₹5,000", min: 5000, max: 100000 },
];


export function FilterBar({
  brands,
  ageGroups,
  total,
}: {
  brands: Brand[];
  ageGroups: AgeGroup[];
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [open, setOpen] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  // Any click outside the bar, or Escape, dismisses an open popover.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = sheetOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

  const push = (next: URLSearchParams) => {
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    push(next);
  };

  const toggleMulti = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    const current = next.getAll(key);
    next.delete(key);
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updated.forEach((v) => next.append(key, v));
    push(next);
  };

  const setPrice = (band: (typeof PRICE_BANDS)[number] | null) => {
    const next = new URLSearchParams(params.toString());
    if (!band) {
      next.delete("minPrice");
      next.delete("maxPrice");
    } else {
      next.set("minPrice", String(band.min));
      next.set("maxPrice", String(band.max));
    }
    push(next);
  };

  const activeAges = params.getAll("age");
  const activeBrands = params.getAll("brand");
  const activeMin = params.get("minPrice");
  const activeSort = params.get("sort") ?? "popular";
  const activeBand = PRICE_BANDS.find((b) => String(b.min) === activeMin) ?? null;

  const activeCount =
    activeAges.length + activeBrands.length + (activeBand ? 1 : 0);

  const clearAll = () => router.push(pathname, { scroll: false });

  /** One removable chip per selected value, shown under the pill row. */
  const chips = [
    ...activeAges.map((slug) => ({
      key: `age-${slug}`,
      label: ageGroups.find((a) => a.slug === slug)?.label ?? slug,
      onRemove: () => toggleMulti("age", slug),
    })),
    ...activeBrands.map((name) => ({
      key: `brand-${name}`,
      label: name,
      onRemove: () => toggleMulti("brand", name),
    })),
    ...(activeBand
      ? [{ key: "price", label: activeBand.label, onRemove: () => setPrice(null) }]
      : []),
  ];

  return (
    <>
      <div
        ref={barRef}
        className="sticky top-[124px] z-30 -mx-4 mb-5 bg-cream/95 px-4 py-3 lg:top-[115px]"
      >
        <div className="flex items-center gap-2">
          {/* Mobile opens a sheet; the popovers below are desktop-only. */}
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-white shadow-sm transition active:scale-95 lg:hidden"
          >
            <SlidersHorizontal className="size-4" />
            Filters
            {activeCount > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-white text-[10px] font-extrabold text-ink">
                {activeCount}
              </span>
            )}
          </button>

          <div className="hidden items-center gap-2 lg:flex">
            <FacetPill
              label="Age"
              icon={Cake}
              count={activeAges.length}
              open={open === "age"}
              onToggle={() => setOpen(open === "age" ? null : "age")}
            >
              <PanelList>
                {ageGroups.map((a, i) => (
                  <OptionRow
                    key={a._id}
                    selected={activeAges.includes(a.slug)}
                    onClick={() => toggleMulti("age", a.slug)}
                    glyph={AGE_GLYPHS[i % AGE_GLYPHS.length]}
                    label={a.label}
                  />
                ))}
              </PanelList>
            </FacetPill>

            <FacetPill
              label="Brand"
              icon={Tag}
              count={activeBrands.length}
              open={open === "brand"}
              onToggle={() => setOpen(open === "brand" ? null : "brand")}
            >
              <PanelList className="max-h-72">
                {brands.map((b) => (
                  <OptionRow
                    key={b._id}
                    selected={activeBrands.includes(b.name)}
                    onClick={() => toggleMulti("brand", b.name)}
                    label={b.name}
                  />
                ))}
              </PanelList>
            </FacetPill>

            <FacetPill
              label="Price"
              icon={IndianRupee}
              count={activeBand ? 1 : 0}
              open={open === "price"}
              onToggle={() => setOpen(open === "price" ? null : "price")}
            >
              <PanelList>
                {PRICE_BANDS.map((p) => (
                  <OptionRow
                    key={p.label}
                    selected={activeBand?.label === p.label}
                    onClick={() => setPrice(activeBand?.label === p.label ? null : p)}
                    label={p.label}
                  />
                ))}
              </PanelList>
            </FacetPill>

            {activeCount > 0 && (
              <button
                onClick={clearAll}
                className="rounded-full px-3 py-2 text-xs font-bold text-brand-600 underline-offset-2 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          <p className="ml-auto hidden text-sm text-ink-soft sm:block">
            <b className="text-ink">{total}</b> products
          </p>

          <div className="ml-auto sm:ml-3">
            <FacetPill
              label={SORTS.find((s) => s.value === activeSort)!.label}
              icon={ArrowDownWideNarrow}
              open={open === "sort"}
              onToggle={() => setOpen(open === "sort" ? null : "sort")}
              align="right"
            >
              <PanelList>
                {SORTS.map((s) => (
                  <OptionRow
                    key={s.value}
                    selected={activeSort === s.value}
                    onClick={() => {
                      setParam("sort", s.value === "popular" ? null : s.value);
                      setOpen(null);
                    }}
                    icon={s.icon}
                    iconClass={s.tone}
                    label={s.label}
                  />
                ))}
              </PanelList>
            </FacetPill>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {chips.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <ul className="rail flex gap-1.5 overflow-x-auto pt-2.5">
                {chips.map((c) => (
                  <li key={c.key} className="shrink-0">
                    <button
                      onClick={c.onRemove}
                      className="flex items-center gap-1 rounded-full bg-brand-500 py-1.5 pl-3 pr-2 text-xs font-bold text-white transition hover:bg-brand-600"
                    >
                      {c.label}
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <MobileSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        total={total}
        ageGroups={ageGroups}
        brands={brands}
        activeAges={activeAges}
        activeBrands={activeBrands}
        activeBand={activeBand}
        activeSort={activeSort}
        onToggleAge={(s) => toggleMulti("age", s)}
        onToggleBrand={(s) => toggleMulti("brand", s)}
        onSetPrice={setPrice}
        onSetSort={(v) => setParam("sort", v === "popular" ? null : v)}
        onClear={clearAll}
      />
    </>
  );
}

/* ------------------------------------------------------------- pieces */

function FacetPill({
  label,
  emoji,
  icon: Icon,
  count = 0,
  open,
  onToggle,
  align = "left",
  children,
}: {
  label: string;
  emoji?: string;
  icon?: typeof ChevronDown;
  count?: number;
  open: boolean;
  onToggle: () => void;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const active = count > 0;

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-1.5 rounded-full border-2 px-3.5 py-2 text-sm font-bold transition",
          active
            ? "border-brand-500 bg-brand-500 text-white"
            : open
              ? "border-ink bg-white text-ink"
              : "border-line bg-white text-ink-soft hover:border-brand-300 hover:text-brand-600",
        )}
      >
        {Icon ? <Icon className="size-4" /> : emoji && <span>{emoji}</span>}
        {label}
        {active && (
          <span className="grid size-5 place-items-center rounded-full bg-white text-[10px] font-extrabold text-brand-600">
            {count}
          </span>
        )}
        <ChevronDown
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute top-full z-40 mt-2 min-w-56 origin-top rounded-2xl border border-line bg-white p-1.5 shadow-[0_20px_44px_-20px_rgba(23,32,46,0.35)]",
              align === "right" ? "right-0" : "left-0",
            )}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PanelList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ul className={cn("space-y-0.5 overflow-y-auto", className)}>{children}</ul>
  );
}

function OptionRow({
  selected,
  onClick,
  label,
  glyph,
  icon: Icon,
  iconClass,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  /** Hand-drawn glyph name, for facets that have artwork. */
  glyph?: string;
  /** Lucide icon, for facets that are better served by a UI icon. */
  icon?: typeof Flame;
  iconClass?: string;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        aria-pressed={selected}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-semibold transition",
          selected ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-cream",
        )}
      >
        {glyph && <Glyph name={glyph} className="size-4.5 text-ink-soft" />}
        {Icon && <Icon className={cn("size-4", iconClass)} />}
        <span className="flex-1 truncate">{label}</span>
        <span
          className={cn(
            "grid size-4.5 shrink-0 place-items-center rounded-md border-2 transition",
            selected ? "border-brand-500 bg-brand-500" : "border-line",
          )}
        >
          {selected && <Check className="size-3 text-white" strokeWidth={3.5} />}
        </span>
      </button>
    </li>
  );
}

function MobileSheet({
  open,
  onClose,
  total,
  ageGroups,
  brands,
  activeAges,
  activeBrands,
  activeBand,
  activeSort,
  onToggleAge,
  onToggleBrand,
  onSetPrice,
  onSetSort,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  total: number;
  ageGroups: AgeGroup[];
  brands: Brand[];
  activeAges: string[];
  activeBrands: string[];
  activeBand: (typeof PRICE_BANDS)[number] | null;
  activeSort: string;
  onToggleAge: (slug: string) => void;
  onToggleBrand: (name: string) => void;
  onSetPrice: (b: (typeof PRICE_BANDS)[number] | null) => void;
  onSetSort: (v: string) => void;
  onClear: () => void;
}) {
  const [tab, setTab] = useState("age");

  const TABS = [
    { id: "age", label: "Age", icon: Cake, n: activeAges.length },
    { id: "brand", label: "Brand", icon: Tag, n: activeBrands.length },
    { id: "price", label: "Price", icon: IndianRupee, n: activeBand ? 1 : 0 },
    { id: "sort", label: "Sort", icon: ArrowDownWideNarrow, n: 0 },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-ink/45 lg:hidden"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 34, stiffness: 340 }}
            className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[78vh] flex-col rounded-t-3xl bg-white lg:hidden"
            role="dialog"
            aria-label="Filters"
          >
            <div className="flex items-center justify-between px-5 pb-2 pt-3">
              <span className="mx-auto h-1 w-10 rounded-full bg-line" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3">
              <h3 className="font-display text-lg font-extrabold">Filters</h3>
              <button onClick={onClose} aria-label="Close filters" className="p-1">
                <X className="size-5" />
              </button>
            </div>

            {/* Two-pane sheet: facet list on the left, options on the right —
                avoids one long scroll through every facet. */}
            <div className="flex min-h-0 flex-1 border-t border-line">
              <ul className="w-32 shrink-0 overflow-y-auto border-r border-line bg-cream">
                {TABS.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => setTab(t.id)}
                      className={cn(
                        "flex w-full items-center gap-1.5 px-3 py-3.5 text-left text-sm font-bold transition",
                        tab === t.id
                          ? "bg-white text-brand-600"
                          : "text-ink-soft",
                      )}
                    >
                      <t.icon className="size-4" />
                      {t.label}
                      {t.n > 0 && (
                        <span className="ml-auto grid size-4.5 place-items-center rounded-full bg-brand-500 text-[10px] font-extrabold text-white">
                          {t.n}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>

              <div className="min-w-0 flex-1 overflow-y-auto p-2">
                {tab === "age" && (
                  <ul className="space-y-0.5">
                    {ageGroups.map((a, i) => (
                      <OptionRow
                        key={a._id}
                        selected={activeAges.includes(a.slug)}
                        onClick={() => onToggleAge(a.slug)}
                        glyph={AGE_GLYPHS[i % AGE_GLYPHS.length]}
                        label={a.label}
                      />
                    ))}
                  </ul>
                )}
                {tab === "brand" && (
                  <ul className="space-y-0.5">
                    {brands.map((b) => (
                      <OptionRow
                        key={b._id}
                        selected={activeBrands.includes(b.name)}
                        onClick={() => onToggleBrand(b.name)}
                        label={b.name}
                      />
                    ))}
                  </ul>
                )}
                {tab === "price" && (
                  <ul className="space-y-0.5">
                    {PRICE_BANDS.map((p) => (
                      <OptionRow
                        key={p.label}
                        selected={activeBand?.label === p.label}
                        onClick={() =>
                          onSetPrice(activeBand?.label === p.label ? null : p)
                        }
                        label={p.label}
                      />
                    ))}
                  </ul>
                )}
                {tab === "sort" && (
                  <ul className="space-y-0.5">
                    {SORTS.map((s) => (
                      <OptionRow
                        key={s.value}
                        selected={activeSort === s.value}
                        onClick={() => onSetSort(s.value)}
                        icon={s.icon}
                    iconClass={s.tone}
                        label={s.label}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex gap-2 border-t border-line p-4">
              <button
                onClick={onClear}
                className="flex-1 rounded-full border-2 border-line py-3 text-sm font-bold text-ink-soft"
              >
                Clear all
              </button>
              <button
                onClick={onClose}
                className="flex-[1.6] rounded-full bg-brand-500 py-3 text-sm font-bold text-white"
              >
                Show {total} products
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
