"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { GripVertical, Star, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Image manager.
 *
 * Currently local-only: files are held as object URLs so the form is fully
 * usable before Cloudinary exists. The upload handler is the single seam —
 * `onUpload` will POST to a signed Cloudinary endpoint and return secure URLs,
 * and nothing else in this component changes.
 *
 * First image is the primary; reordering promotes a different one.
 */
export function ImageManager({
  images,
  onChange,
  max = 8,
}: {
  images: string[];
  onChange: (next: string[]) => void;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const urls = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, max - images.length)
      .map((f) => URL.createObjectURL(f));
    if (urls.length) onChange([...images, ...urls]);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        <AnimatePresence initial={false}>
          {images.map((src, i) => (
            <motion.div
              key={src}
              layout
              exit={{ opacity: 0, scale: 0.9 }}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragEnd={() => setDragIndex(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null) move(dragIndex, i);
                setDragIndex(null);
              }}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-xl border bg-cream",
                i === 0 ? "border-brand-300 ring-2 ring-brand-100" : "border-line",
                dragIndex === i && "opacity-40",
              )}
            >
              <Image src={src} alt="" fill unoptimized sizes="120px" className="object-cover" />

              {i === 0 && (
                <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded-md bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  <Star className="size-2.5 fill-white" strokeWidth={0} />
                  Main
                </span>
              )}

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-ink/70 px-1 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="cursor-grab text-white/70">
                  <GripVertical className="size-3.5" />
                </span>
                <div className="flex gap-0.5">
                  {i !== 0 && (
                    <button
                      type="button"
                      onClick={() => move(i, 0)}
                      title="Make main image"
                      aria-label="Make main image"
                      className="grid size-5 place-items-center rounded text-white/80 hover:bg-white/20 hover:text-white"
                    >
                      <Star className="size-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onChange(images.filter((_, j) => j !== i))}
                    title="Remove"
                    aria-label="Remove image"
                    className="grid size-5 place-items-center rounded text-white/80 hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {images.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(e.dataTransfer.files);
            }}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed transition",
              dragOver
                ? "border-brand-400 bg-brand-50"
                : "border-line bg-cream hover:border-brand-300 hover:bg-brand-50/50",
            )}
          >
            <Upload className="size-4 text-ink-muted" />
            <span className="px-1 text-center text-[10px] font-semibold leading-tight text-ink-muted">
              Drop or click
            </span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <p className="mt-2 text-[11px] text-ink-muted">
        {images.length}/{max} images · drag to reorder · first image is used on
        cards and as the social preview
      </p>
    </div>
  );
}
