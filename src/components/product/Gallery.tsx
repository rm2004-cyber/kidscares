"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  /** Cursor-tracked zoom origin, desktop only. */
  const [origin, setOrigin] = useState("50% 50%");
  const [zoomed, setZoomed] = useState(false);

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      <div className="rail flex gap-2 overflow-x-auto sm:flex-col sm:overflow-visible">
        {images.map((src, i) => (
          <button
            key={src}
            onClick={() => setActive(i)}
            aria-label={`View image ${i + 1}`}
            aria-current={active === i}
            className={cn(
              "relative size-16 shrink-0 overflow-hidden rounded-xl border-2 transition sm:size-20",
              active === i
                ? "border-brand-500"
                : "border-line hover:border-brand-200",
            )}
          >
            <Image src={src} alt="" fill unoptimized sizes="80px" className="object-cover" />
          </button>
        ))}
      </div>

      <div
        className="relative aspect-square flex-1 overflow-hidden rounded-card bg-cream"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(
            `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`,
          );
        }}
        onMouseEnter={() => setZoomed(true)}
        onMouseLeave={() => setZoomed(false)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            <Image
              src={images[active]}
              alt={`${alt} — image ${active + 1}`}
              fill
              unoptimized
              priority={active === 0}
              sizes="(max-width:1024px) 100vw, 45vw"
              className="object-cover transition-transform duration-300"
              style={{
                transformOrigin: origin,
                transform: zoomed ? "scale(1.6)" : "scale(1)",
              }}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
