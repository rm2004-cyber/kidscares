"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, GripVertical, Loader2, Star, Trash2, Upload } from "lucide-react";

import { adminApi, ApiError } from "@/utils/service";
import type { MediaItem } from "@/lib/media";
import { cn } from "@/lib/utils";

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Image manager.
 *
 * Files go straight to Cloudinary through the API and come back as
 * `{ url, publicId }`. The publicId is kept on the item so removing an image
 * can also delete the asset — otherwise every edit would leak files into the
 * Cloudinary account with no way to find them again.
 *
 * A local object URL is shown while the upload is in flight so the grid never
 * jumps; it is replaced by the real URL on success and revoked either way.
 */
export function ImageManager({
  images,
  onChange,
  max = 8,
}: {
  images: MediaItem[];
  onChange: (next: MediaItem[]) => void;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [pending, setPending] = useState<string[]>([]);
  const [error, setError] = useState("");

  const addFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setError("");

    const files = Array.from(fileList)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, max - images.length);

    if (!files.length) return;

    const tooBig = files.find((f) => f.size > MAX_BYTES);
    if (tooBig) {
      setError(`${tooBig.name} is larger than 8MB.`);
      return;
    }

    const previews = files.map((f) => URL.createObjectURL(f));
    setPending(previews);

    try {
      const uploaded = (await adminApi.uploadImages(files)) as MediaItem[];
      onChange([...images, ...uploaded]);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Upload failed. Check the Cloudinary settings in the server .env.",
      );
    } finally {
      previews.forEach(URL.revokeObjectURL);
      setPending([]);
    }
  };

  const removeAt = async (index: number) => {
    const target = images[index];
    onChange(images.filter((_, i) => i !== index));

    // Best effort: the form already dropped it, so a failed delete only leaves
    // an orphaned file, never a broken product.
    if (target?.publicId) {
      adminApi.deleteImage(target.publicId).catch(() => {});
    }
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const busy = pending.length > 0;

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        <AnimatePresence initial={false}>
          {images.map((img, i) => (
            <motion.div
              key={img.publicId ?? img.url}
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
              <Image src={img.url} alt="" fill unoptimized sizes="120px" className="object-cover" />

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
                    onClick={() => void removeAt(i)}
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

        {/* Optimistic tiles while the upload is in flight. */}
        {pending.map((src) => (
          <div
            key={src}
            className="relative aspect-square overflow-hidden rounded-xl border border-line bg-cream"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="size-full object-cover opacity-40" />
            <span className="absolute inset-0 grid place-items-center">
              <Loader2 className="size-5 animate-spin text-brand-500" />
            </span>
          </div>
        ))}

        {images.length + pending.length < max && (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void addFiles(e.dataTransfer.files);
            }}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed transition disabled:opacity-50",
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
          void addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {error && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] font-semibold text-red-600">
          <AlertCircle className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      )}

      <p className="mt-2 text-[11px] text-ink-muted">
        {images.length}/{max} images · drag to reorder · first image is used on
        cards and as the social preview · JPG or PNG up to 8MB
      </p>
    </div>
  );
}
