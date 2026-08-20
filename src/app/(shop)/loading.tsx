import { HeroSkeleton, ProductGridSkeleton, Box } from "@/components/ui/Skeletons";

/** Route-level fallback — shown while a server page streams in. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-6">
      <HeroSkeleton />
      <div className="flex gap-6 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex shrink-0 flex-col items-center gap-2">
            <Box className="size-20 rounded-full sm:size-24" />
            <Box className="h-3 w-16" />
          </div>
        ))}
      </div>
      <ProductGridSkeleton count={8} />
    </div>
  );
}
