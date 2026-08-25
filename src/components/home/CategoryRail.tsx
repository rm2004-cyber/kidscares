"use client";

import Image from "next/image";
import Link from "next/link";
import type { AgeGroup, Category } from "@/lib/types";
import { useSurfaceStore } from "@/lib/theme/useSurface";
import { GlyphBadge, type TONES } from "@/components/ui/Glyph";
import { AGE_GLYPHS } from "@/lib/theme/ageGlyphs";

/** Rotating tints so consecutive age pills never repeat a colour. */
const AGE_TONES: (keyof typeof TONES)[] = ["brand", "mint", "sun", "grape", "sky", "pink"];

/* Panel tint behind an age tile when it has no photo yet. */
const AGE_PANEL: Record<string, string> = {
  brand: "bg-brand-50",
  mint: "bg-mint-50",
  sun: "bg-sun-100",
  grape: "bg-grape-100",
  sky: "bg-sky-ks/10",
  pink: "bg-brand-100",
};

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
    <ul className="grid grid-cols-4 justify-items-center gap-x-4 gap-y-6 pb-3 pt-3 sm:flex sm:flex-wrap sm:justify-start sm:gap-7">
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
            className="group flex w-full max-w-24 flex-col items-center gap-2 text-center sm:w-24"
          >
            <span
              className={`relative size-16 overflow-hidden rounded-full ring-4 transition-all duration-300 group-hover:-translate-y-1 group-hover:ring-8 sm:size-20 lg:size-24 ${
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

/**
 * Age tiles — the highest-intent filter for a kids store, so it sits high.
 *
 * A photo of a child that age communicates the band faster than any label
 * does, so the picture is the tile and the label sits under it on a plate.
 * The arched top is the shape parents recognise from every kidswear storefront.
 *
 * The photo is optional: an age group saved without one falls back to its
 * glyph on a tinted panel, so the row never renders a broken frame.
 */
export function AgeStrip({ ages }: { ages: AgeGroup[] }) {
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-5 lg:gap-5">
      {ages.map((a, i) => {
        const tone = AGE_TONES[i % AGE_TONES.length];
        const panel = AGE_PANEL[tone] ?? "bg-cream";
        return (
          <li key={a._id}>
            <Link
              href={`/age/${a.slug}`}
              className="group block overflow-hidden rounded-2xl border border-line bg-white transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg"
            >
              {/* Arch: fully rounded at the top, square where it meets the plate. */}
              <span
                className={`relative block aspect-[4/5] overflow-hidden rounded-t-[999px] ${panel}`}
              >
                {a.image?.url ? (
                  <Image
                    src={a.image.url}
                    alt=""
                    fill
                    unoptimized
                    sizes="(max-width:640px) 33vw, (max-width:1024px) 25vw, 20vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center">
                    <GlyphBadge name={AGE_GLYPHS[i % AGE_GLYPHS.length]} tone={tone} />
                  </span>
                )}
              </span>

              <span className="block px-2 py-2 text-center">
                <span className="block text-[13px] font-extrabold leading-tight text-ink sm:text-sm">
                  {a.label}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
