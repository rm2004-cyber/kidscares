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

export function RailSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-[46%] shrink-0 sm:w-[30%] lg:w-[19%]">
          <ProductCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export function CategoryRailSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="flex gap-6 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex shrink-0 flex-col items-center gap-2">
          <Box className="size-20 rounded-full sm:size-24" />
          <Box className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return <Box className="aspect-[21/9] w-full rounded-card md:aspect-[24/8]" />;
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
