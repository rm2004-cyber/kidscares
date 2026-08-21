"use client";

import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Plus, Star } from "lucide-react";
import type { Product } from "@/lib/types";
import { discountPct, inr } from "@/lib/format";
import { useWishlist } from "@/store/useWishlist";
import { useHydrated } from "@/lib/useHydrated";
import { useCart } from "@/store/useCart";
import { cn } from "@/lib/utils";

const BADGE: Record<
  NonNullable<Product["badge"]>,
  { label: string; className: string }
> = {
  new: { label: "New", className: "bg-sky-ks text-white" },
  bestseller: { label: "Loved", className: "bg-sun-400 text-ink" },
  sale: { label: "Sale", className: "bg-brand-500 text-white" },
  limited: { label: "Few left", className: "bg-grape-500 text-white" },
};

/** Pastel frame tints, picked deterministically so a card never changes hue. */
const TINTS = [
  "bg-brand-50 group-hover:ring-brand-200",
  "bg-mint-50 group-hover:ring-mint-200",
  "bg-sun-100 group-hover:ring-sun-300",
  "bg-grape-100 group-hover:ring-grape-300",
  "bg-sky-ks/10 group-hover:ring-sky-ks/30",
];

function tintFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

/**
 * Rendered 30–40× per grid, so this component is deliberately cheap:
 *
 * - Selectors return primitives, never the raw arrays. Subscribing to `s.ids`
 *   handed every card a new array reference on any wishlist change, so one
 *   heart click re-rendered the entire grid.
 * - No scroll-reveal animation. 40 IntersectionObservers competing with the
 *   scroll thread is what made scrolling feel like it was catching.
 * - Hover effects name their properties instead of using `transition-all`.
 */
function ProductCardImpl({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const hydrated = useHydrated();
  // Boolean selector: this card only re-renders when its own state flips.
  const isWished = useWishlist((s) => s.ids.includes(product._id));
  const toggle = useWishlist((s) => s.toggle);
  const add = useCart((s) => s.add);

  const wished = hydrated && isWished;
  const off = discountPct(product.mrp, product.price);
  const tint = tintFor(product._id);

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    add(product, product.sizes[0], product.colors[0]?.name ?? "Default");
  };

  return (
    <article className="group relative h-full">
      <Link
        href={`/product/${product.slug}`}
        className="flex h-full flex-col rounded-[1.6rem] bg-white p-2 shadow-[0_2px_10px_-6px_rgba(23,32,46,0.18)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_44px_-20px_rgba(247,77,63,0.4)]"
      >
        <div
          className={cn(
            "relative aspect-[4/5] overflow-hidden rounded-[1.15rem] ring-0 ring-offset-0 transition-[box-shadow] duration-300 group-hover:ring-4",
            tint,
          )}
        >
          <Image
            src={product.images[0]}
            alt={product.title}
            fill
            unoptimized
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 20vw"
            priority={priority}
            loading={priority ? undefined : "lazy"}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.07]"
          />

          {product.badge && (
            // Slight tilt so it reads as a stuck-on sticker, not a UI chip.
            <span
              className={cn(
                "absolute left-2 top-2 -rotate-6 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide shadow-sm",
                BADGE[product.badge].className,
              )}
            >
              {BADGE[product.badge].label}
            </span>
          )}

          {off >= 40 && (
            <span className="absolute bottom-2 left-2 rotate-3 rounded-full bg-white px-2 py-1 text-[10px] font-extrabold text-brand-600 shadow-sm">
              {off}% OFF
            </span>
          )}

          {!product.inStock && (
            <div className="absolute inset-0 grid place-items-center bg-white/75">
              <span className="rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-white">
                Sold out
              </span>
            </div>
          )}

          <button
            type="button"
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={wished}
            onClick={(e) => {
              e.preventDefault();
              toggle(product._id);
            }}
            className="absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-white/95 shadow-md transition-transform duration-200 hover:scale-110 active:scale-90"
          >
            <Heart
              className={cn(
                "size-4.5 transition-colors",
                wished ? "fill-brand-500 text-brand-500" : "text-ink-soft",
              )}
            />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-1 px-1.5 pb-1 pt-2.5">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[11px] font-extrabold uppercase tracking-wide text-brand-600">
              {product.brand}
            </p>
            <span className="ml-auto flex shrink-0 items-center gap-0.5 rounded-full bg-mint-100 px-1.5 py-0.5 text-[10px] font-extrabold text-mint-700">
              <Star className="size-2.5 fill-mint-600" strokeWidth={0} />
              {product.rating.toFixed(1)}
            </span>
          </div>

          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-ink">
            {product.title}
          </h3>

          <div className="mt-auto flex items-end justify-between gap-2 pt-2.5">
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-lg font-extrabold text-ink">
                  {inr(product.price)}
                </span>
                <span className="text-[11px] text-ink-muted line-through">
                  {inr(product.mrp)}
                </span>
              </div>
              <p className="text-[11px] font-bold text-mint-600">Save {inr(product.mrp - product.price)}</p>
            </div>

            {product.inStock && (
              <button
                type="button"
                onClick={quickAdd}
                aria-label={`Add ${product.title} to bag`}
                className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-white shadow-md transition-transform duration-200 hover:scale-110 hover:bg-brand-500 active:scale-90"
              >
                <Plus className="size-4.5" strokeWidth={3} />
              </button>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}

export const ProductCard = memo(ProductCardImpl);
