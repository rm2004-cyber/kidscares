"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

/**
 * A search placeholder that cycles through what the shop actually sells.
 *
 * The native `placeholder` attribute cannot be animated, so it is left empty
 * and this renders on top of the field instead. The input keeps its
 * `aria-label`, which is what a screen reader announces anyway — a placeholder
 * was never a substitute for one.
 *
 * Sits behind `pointer-events-none` so clicking the words still focuses the
 * input underneath, and disappears the moment anything is typed.
 */
export function RotatingPlaceholder({
  terms,
  hidden,
  className,
}: {
  terms: string[];
  /** True once the field has a value — the words must get out of the way. */
  hidden: boolean;
  className?: string;
}) {
  const [i, setI] = useState(0);
  const [animate, setAnimate] = useState(true);

  /* Text that never stops moving is hard to read for some people and is a
     recognised accessibility problem, so a system-level preference for less
     motion pins it to the first term. */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setAnimate(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (hidden || !animate || terms.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % terms.length), 2200);
    return () => clearInterval(id);
  }, [hidden, animate, terms.length]);

  if (hidden || terms.length === 0) return null;

  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-y-0 flex select-none items-center text-sm text-ink-muted ${className ?? ""}`}
    >
      <span className="whitespace-nowrap">Search for&nbsp;</span>

      {/* Fixed-height clipping box: the words slide within it rather than
          nudging the line above them as lengths change. */}
      <span className="relative inline-flex h-5 min-w-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={terms[i]}
            initial={animate ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={animate ? { opacity: 0, y: -8 } : undefined}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="absolute inset-0 flex items-center truncate font-semibold text-ink-soft"
          >
            &ldquo;{terms[i]}&rdquo;
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}
