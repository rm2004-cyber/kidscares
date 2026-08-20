"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { motion } from "motion/react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { Banner } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Hero banner rail. Mirrors the app's reanimated-carousel: autoplay, looping,
 * animated dot indicators that stretch for the active slide.
 */
export function HeroCarousel({ banners }: { banners: Banner[] }) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, duration: 28 }, [
    Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true }),
  ]);
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (embla) setSelected(embla.selectedScrollSnap());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    onSelect();
    embla.on("select", onSelect).on("reInit", onSelect);
  }, [embla, onSelect]);

  return (
    <section aria-label="Featured offers" className="relative">
      <div className="overflow-hidden rounded-card" ref={emblaRef}>
        <div className="flex">
          {banners.map((b, i) => (
            <div key={b._id} className="min-w-0 flex-[0_0_100%]">
              <div
                className={cn(
                  "relative flex min-h-[260px] items-center overflow-hidden bg-gradient-to-br sm:min-h-[340px] lg:min-h-[400px]",
                  b.gradient,
                )}
              >
                {/* Decorative bubbles give the flat gradient some depth. */}
                <div className="pointer-events-none absolute -left-16 -top-16 size-64 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -bottom-24 right-1/3 size-72 rounded-full bg-white/10" />

                <div
                  className={cn(
                    "relative z-10 flex w-full flex-col gap-6 p-6 sm:p-10 lg:flex-row lg:items-center lg:p-14",
                    b.align === "right" && "lg:flex-row-reverse",
                  )}
                >
                  {/* No dynamic `key` here: keying on the selected index
                      remounted this element on every slide change, replaying
                      `initial` and flashing the headline out each rotation.
                      `animate` alone is enough. */}
                  <motion.div
                    animate={
                      selected === i ? { opacity: 1, y: 0 } : { opacity: 0.55, y: 8 }
                    }
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="flex-1 text-white"
                  >
                    <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur">
                      Limited time
                    </span>
                    <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight drop-shadow-sm sm:text-4xl lg:text-5xl">
                      {b.title}
                    </h2>
                    <p className="mt-2 max-w-md text-sm text-white/90 sm:text-base">
                      {b.subtitle}
                    </p>
                    <Link
                      href={b.href}
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-ink shadow-lg transition hover:gap-3 hover:shadow-xl active:scale-95"
                    >
                      {b.cta}
                      <ArrowRight className="size-4" />
                    </Link>
                  </motion.div>

                  <div className="relative hidden h-56 flex-1 lg:block">
                    <Image
                      src={b.image}
                      alt=""
                      fill
                      unoptimized
                      priority={i === 0}
                      sizes="(max-width:1024px) 0px, 40vw"
                      className="animate-float object-contain drop-shadow-2xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => embla?.scrollPrev()}
        aria-label="Previous banner"
        className="absolute left-3 top-1/2 hidden -translate-y-1/2 place-items-center rounded-full bg-white/90 p-2 shadow-md transition hover:bg-white sm:grid"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        onClick={() => embla?.scrollNext()}
        aria-label="Next banner"
        className="absolute right-3 top-1/2 hidden -translate-y-1/2 place-items-center rounded-full bg-white/90 p-2 shadow-md transition hover:bg-white sm:grid"
      >
        <ChevronRight className="size-5" />
      </button>

      <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
        {banners.map((b, i) => (
          <button
            key={b._id}
            onClick={() => embla?.scrollTo(i)}
            aria-label={`Go to banner ${i + 1}`}
            aria-current={selected === i}
            className={cn(
              "h-1.5 rounded-full bg-white transition-all duration-300",
              selected === i ? "w-7 opacity-100" : "w-1.5 opacity-50",
            )}
          />
        ))}
      </div>
    </section>
  );
}
