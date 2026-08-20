"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, Heart, ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/types";
import { discountPct, inr } from "@/lib/data";
import { RatingBadge } from "@/components/ui/Rating";
import { useCart } from "@/store/useCart";
import { useWishlist } from "@/store/useWishlist";
import { useHydrated } from "@/lib/useHydrated";
import { GlyphBadge } from "@/components/ui/Glyph";
import { cn } from "@/lib/utils";

export function BuyBox({ product }: { product: Product }) {
  const mounted = useHydrated();
  const add = useCart((s) => s.add);
  const ids = useWishlist((s) => s.ids);
  const toggle = useWishlist((s) => s.toggle);

  const [size, setSize] = useState(product.sizes[0]);
  const [color, setColor] = useState(product.colors[0]?.name ?? "Default");
  const [sizeError, setSizeError] = useState(false);

  const wished = mounted && ids.includes(product._id);
  const off = discountPct(product.mrp, product.price);

  const handleAdd = () => {
    if (!size) {
      setSizeError(true);
      return;
    }
    add(product, size, color);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-brand-600">
          {product.brand}
        </p>
        <h1 className="mt-1 font-display text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
          {product.title}
        </h1>
        <div className="mt-2">
          <RatingBadge rating={product.rating} count={product.reviewCount} />
        </div>
      </div>

      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-display text-3xl font-extrabold text-ink">
          {inr(product.price)}
        </span>
        <span className="text-base text-ink-muted line-through">
          {inr(product.mrp)}
        </span>
        <span className="rounded-full bg-mint-100 px-2.5 py-1 text-sm font-bold text-mint-700">
          {off}% off
        </span>
      </div>
      <p className="-mt-3 text-xs text-ink-muted">Inclusive of all taxes</p>

      {product.colors.length > 0 && (
        <Field label="Colour" value={color}>
          <div className="flex flex-wrap gap-2">
            {product.colors.map((c) => (
              <button
                key={c.name}
                onClick={() => setColor(c.name)}
                aria-label={c.name}
                aria-pressed={color === c.name}
                className={cn(
                  "grid size-9 place-items-center rounded-full ring-2 ring-offset-2 transition",
                  color === c.name ? "ring-ink" : "ring-line hover:ring-brand-300",
                )}
                style={{ backgroundColor: c.hex }}
              >
                {color === c.name && (
                  <Check className="size-4 text-white drop-shadow" strokeWidth={3} />
                )}
              </button>
            ))}
          </div>
        </Field>
      )}

      <Field label="Size" value={size}>
        <div className="flex flex-wrap gap-2">
          {product.sizes.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSize(s);
                setSizeError(false);
              }}
              aria-pressed={size === s}
              className={cn(
                "min-w-12 rounded-xl border px-3.5 py-2 text-sm font-semibold transition",
                size === s
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-white text-ink hover:border-brand-300",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        {sizeError && (
          <p className="mt-2 text-xs font-semibold text-brand-600">
            Please pick a size to continue.
          </p>
        )}
      </Field>

      <div className="flex gap-3 pt-1">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleAdd}
          disabled={!product.inStock}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-500 py-3.5 text-sm font-bold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-ink-muted"
        >
          <ShoppingBag className="size-4" />
          {product.inStock ? "Add to Bag" : "Out of Stock"}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => toggle(product._id)}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wished}
          className={cn(
            "grid size-13 shrink-0 place-items-center rounded-full border-2 px-4 transition",
            wished
              ? "border-brand-500 bg-brand-50"
              : "border-line hover:border-brand-300",
          )}
        >
          <Heart
            className={cn(
              "size-5",
              wished ? "fill-brand-500 text-brand-500" : "text-ink-soft",
            )}
          />
        </motion.button>
      </div>

      <ul className="grid grid-cols-3 gap-2 rounded-2xl border border-line bg-white p-3 text-center">
        {[
          { glyph: "truck", tone: "sky" as const, t: "Free over ₹999" },
          { glyph: "refresh", tone: "grape" as const, t: "30-day returns" },
          { glyph: "shield", tone: "mint" as const, t: "Safety tested" },
        ].map((i) => (
          <li
            key={i.t}
            className="flex flex-col items-center gap-1 text-xs font-semibold text-ink-soft"
          >
            <GlyphBadge name={i.glyph} tone={i.tone} className="size-8" glyphClassName="size-4.5" />
            {i.t}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-ink">
        {label}: <span className="font-semibold text-ink-soft">{value}</span>
      </p>
      {children}
    </div>
  );
}
