"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useSurfaceStore } from "@/lib/theme/useSurface";
import { resolveSurface, surfacePattern, surfaceWash } from "@/lib/theme/surfaces";

/**
 * Themed page backdrop.
 *
 * Two stacked layers per theme — a colour wash and a tiled glyph pattern —
 * rendered inside AnimatePresence so a category change crossfades rather than
 * cutting. Both layers are `fixed` and `pointer-events-none`, and the pattern
 * is a CSS `background-image`, so the whole thing is paint-only: it never
 * enters layout or hit-testing, and adds no per-scroll cost.
 */
export function Backdrop() {
  const key = useSurfaceStore((s) => s.key);
  const surface = useMemo(() => resolveSurface(key), [key]);

  const wash = useMemo(() => surfaceWash(surface), [surface]);
  const pattern = useMemo(() => surfacePattern(surface), [surface]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.div
          key={surface.key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.65, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <div className="absolute inset-0" style={{ background: wash }} />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: pattern,
              backgroundRepeat: "repeat",
              backgroundSize: "260px 260px",
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Soft light blooms. Only `transform` animates, so these stay on the
          compositor and never trigger paint while floating. */}
      <span className="animate-float absolute -left-24 top-24 size-72 rounded-full bg-white/50 blur-3xl" />
      <span
        className="animate-float absolute -right-20 top-[38rem] size-80 rounded-full bg-white/45 blur-3xl"
        style={{ animationDelay: "-2.5s" }}
      />
      <span
        className="animate-float absolute left-1/3 top-[82rem] size-72 rounded-full bg-white/45 blur-3xl"
        style={{ animationDelay: "-4s" }}
      />

      {/* Fades the pattern out behind the footer so it never fights the text. */}
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-white via-white/70 to-transparent" />
    </div>
  );
}
