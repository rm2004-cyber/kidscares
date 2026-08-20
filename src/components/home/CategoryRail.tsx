"use client";

import Image from "next/image";
import Link from "next/link";
import type { AgeGroup, Category } from "@/lib/types";
import { useSurfaceStore } from "@/lib/theme/useSurface";
import { GlyphBadge, type TONES } from "@/components/ui/Glyph";
import { AGE_GLYPHS } from "@/lib/theme/ageGlyphs";

/** Rotating tints so consecutive age pills never repeat a colour. */
const AGE_TONES: (keyof typeof TONES)[] = ["brand", "mint", "sun", "grape", "sky", "pink"];

const ACCENT_RING: Record<string, string> = {
  brand: "ring-brand-200 bg-brand-50",
  mint: "ring-mint-200 bg-mint-50",
  sun: "ring-sun-200 bg-sun-100",
  grape: "ring-grape-300 bg-grape-100",
  sky: "ring-sky-ks/30 bg-sky-ks/10",
};

/**
 * No scroll-reveal on these items: they sit in a horizontally scrolling rail,
 * so anything parked off-screen to the right never satisfies an IntersectionObserver
 * viewport check and would stay at opacity 0 indefinitely.
 */
export function CategoryRail({ categories }: { categories: Category[] }) {
  /* Hovering an aisle previews its backdrop theme, so the colour/glyph change
     is discoverable from the home page and not only after navigating. Safe to
     drive from here because the home route mounts no <SurfaceTheme>. */
  const setKey = useSurfaceStore((s) => s.setKey);

  return (
    <ul className="rail -mx-4 flex gap-5 overflow-x-auto px-4 pb-2 sm:gap-7">
      {categories.map((c) => (
        <li
          key={c._id}
          className="shrink-0"
          onMouseEnter={() => setKey(c.slug)}
          onMouseLeave={() => setKey(null)}
        >
          <Link
            href={`/category/${c.slug}`}
            onFocus={() => setKey(c.slug)}
            onBlur={() => setKey(null)}
            className="group flex w-20 flex-col items-center gap-2 text-center sm:w-24"
          >
            <span
              className={`relative size-20 overflow-hidden rounded-full ring-4 transition-all duration-300 group-hover:-translate-y-1 group-hover:ring-8 sm:size-24 ${
                ACCENT_RING[c.accent] ?? ACCENT_RING.brand
              }`}
            >
              <Image
                src={c.image}
                alt=""
                fill
                unoptimized
                sizes="96px"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </span>
            <span className="text-xs font-semibold leading-tight text-ink group-hover:text-brand-600 sm:text-[13px]">
              {c.name}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Age pills — the highest-intent filter for a kids store, so it sits high. */
export function AgeStrip({ ages }: { ages: AgeGroup[] }) {
  return (
    <ul className="rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:grid sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
      {ages.map((a, i) => (
        <li key={a._id} className="shrink-0">
          <Link
            href={`/age/${a.slug}`}
            className="flex w-36 items-center gap-2.5 rounded-2xl border border-line bg-white px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md sm:w-full"
          >
            <GlyphBadge name={AGE_GLYPHS[i % AGE_GLYPHS.length]} tone={AGE_TONES[i % AGE_TONES.length]} />
            <span className="text-[13px] font-bold leading-tight text-ink">
              {a.label}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
