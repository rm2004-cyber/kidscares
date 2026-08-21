"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductGridSkeleton } from "@/components/ui/Skeletons";
import { useWishlist } from "@/store/useWishlist";
import { Glyph } from "@/components/ui/Glyph";
import { useEffect } from "react";

export function WishlistView() {
  const { products: saved, loaded, load, clear } = useWishlist();

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const mounted = loaded;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
            Your Wishlist
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {mounted ? `${saved.length} saved` : "Loading your saved items…"}
          </p>
        </div>
        {mounted && saved.length > 0 && (
          <button
            onClick={() => void clear()}
            className="rounded-full border border-line px-4 py-2 text-xs font-bold text-ink-soft transition hover:border-brand-300 hover:text-brand-600"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Until localStorage rehydrates the server cannot know what is saved,
          so the skeleton stands in rather than a wrong empty state. */}
      {!mounted ? (
        <ProductGridSkeleton count={4} />
      ) : saved.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line bg-white py-20 text-center">
          <Glyph name="heart" className="size-16 text-brand-300" />
          <p className="font-display text-lg font-bold">Nothing saved yet</p>
          <p className="max-w-sm text-sm text-ink-muted">
            Tap the heart on any product to keep it here for later.
          </p>
          <Link
            href="/"
            className="mt-2 rounded-full bg-brand-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600"
          >
            Start browsing
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
          <AnimatePresence mode="popLayout">
            {saved.map((p) => (
              <motion.li key={p._id} layout exit={{ opacity: 0, scale: 0.9 }}>
                <ProductCard product={p} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
