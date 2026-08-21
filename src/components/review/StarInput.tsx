"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const LABELS = ["", "Poor", "Not great", "Okay", "Good", "Love it"];

/**
 * Star picker.
 *
 * Rendered as real radio inputs behind the stars so it is keyboard-operable
 * and announced correctly — a row of divs with click handlers would be neither.
 */
export function StarInput({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "md" | "lg";
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  const px = size === "lg" ? "size-9" : size === "sm" ? "size-5" : "size-7";

  return (
    <div>
      <fieldset
        className="flex items-center gap-1"
        onMouseLeave={() => setHover(0)}
      >
        <legend className="sr-only">Your rating</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            onMouseEnter={() => setHover(n)}
            className="cursor-pointer p-0.5"
          >
            <input
              type="radio"
              name="rating"
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
            />
            <Star
              className={cn(
                px,
                "transition-transform",
                n <= shown
                  ? "fill-sun-400 text-sun-400"
                  : "fill-line text-line",
                hover === n && "scale-115",
              )}
              strokeWidth={0}
            />
            <span className="sr-only">{n} stars</span>
          </label>
        ))}
      </fieldset>
      <p className="mt-1 h-4 text-xs font-bold text-ink-soft">
        {shown ? LABELS[shown] : "Tap a star"}
      </p>
    </div>
  );
}
