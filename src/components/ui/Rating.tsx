import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Compact rating chip — matches the green pill used in the app's cards. */
export function RatingBadge({
  rating,
  count,
  className,
}: {
  rating: number;
  count?: number;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-1 text-xs", className)}>
      <span className="flex items-center gap-0.5 rounded-md bg-mint-500 px-1.5 py-0.5 font-bold text-white">
        {rating.toFixed(1)}
        <Star className="size-2.5 fill-white" strokeWidth={0} />
      </span>
      {count != null && (
        <span className="text-ink-muted">({count.toLocaleString("en-IN")})</span>
      )}
    </span>
  );
}

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          width={size}
          height={size}
          className={
            i <= Math.round(rating)
              ? "fill-sun-400 text-sun-400"
              : "fill-line text-line"
          }
          strokeWidth={0}
        />
      ))}
    </span>
  );
}
