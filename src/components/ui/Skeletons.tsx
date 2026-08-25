/**
 * Skeleton set — the web counterpart of the app's
 * HomeScreenSkeleton / WishlishSkeleton / SearchScreenSkeleton.
 *
 * The RN version animated opacity with Reanimated; here a single CSS gradient
 * sweep (`.skeleton` in globals.css) does the same job with no JS on the
 * main thread, so these stay cheap inside Suspense fallbacks.
 */

export function Box({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-white">
      <Box className="aspect-[4/5] w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Box className="h-3 w-1/3" />
        <Box className="h-4 w-full" />
        <Box className="h-4 w-2/3" />
        <Box className="mt-3 h-5 w-1/2" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function RailSkeleton({ count = 10 }: { count?: number }) {
  /* Mirrors ProductRail exactly — same columns and gaps. The card art is
     aspect-ratio driven, so a different column count changes the card width,
     which changes its height, which shifts the page when the real rail swaps in. */
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5 lg:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategoryRailSkeleton({ count = 8 }: { count?: number }) {
  /* Item width and label height mirror CategoryRail so the strip does not
     change height when the real one arrives. */
  return (
    <div className="grid grid-cols-4 justify-items-center gap-x-4 gap-y-6 pb-3 pt-3 sm:flex sm:flex-wrap sm:gap-7">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex w-full max-w-24 flex-col items-center gap-2 sm:w-24">
          <Box className="size-16 rounded-full sm:size-20 lg:size-24" />
          <Box className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  /* Mirrors HeroCarousel's slide min-heights exactly. An aspect ratio was used
     here before, which resolved to 167px on a phone against the carousel's
     260px — a 93px jump at the very top of the page that shoved everything
     below it down, and the single biggest contributor to layout shift. */
  return (
    <Box className="min-h-[260px] w-full rounded-card sm:min-h-[340px] lg:min-h-[400px]" />
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Box className="aspect-square w-full" />
      <div className="space-y-4">
        <Box className="h-4 w-24" />
        <Box className="h-8 w-3/4" />
        <Box className="h-6 w-1/3" />
        <Box className="h-24 w-full" />
        <Box className="h-12 w-full" />
      </div>
    </div>
  );
}
