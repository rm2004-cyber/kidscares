import { GLYPHS } from "@/lib/theme/icons";
import { cn } from "@/lib/utils";

/**
 * Renders one of the shared hand-drawn glyphs as inline SVG.
 *
 * The same source set backs the page backdrop and the placeholder image
 * service, so a category shows the same mark wherever it appears. `currentColor`
 * is substituted for the `CC` placeholder, which lets callers colour a glyph
 * with a normal text class.
 */
export function Glyph({
  name,
  className,
  title,
}: {
  name: keyof typeof GLYPHS | string;
  className?: string;
  title?: string;
}) {
  const body = GLYPHS[name] ?? GLYPHS.star;

  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-6", className)}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      dangerouslySetInnerHTML={{ __html: body.replace(/CC/g, "currentColor") }}
    />
  );
}

/** Glyph inside a soft tinted circle — used for age pills and feature rows. */
export function GlyphBadge({
  name,
  tone = "brand",
  className,
  glyphClassName,
}: {
  name: string;
  tone?: keyof typeof TONES;
  className?: string;
  glyphClassName?: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full",
        TONES[tone],
        className ?? "size-9",
      )}
    >
      <Glyph name={name} className={cn("size-5", glyphClassName)} />
    </span>
  );
}

export const TONES = {
  brand: "bg-brand-50 text-brand-600",
  mint: "bg-mint-50 text-mint-600",
  sun: "bg-sun-100 text-amber-600",
  grape: "bg-grape-100 text-grape-600",
  sky: "bg-sky-ks/10 text-sky-ks",
  pink: "bg-brand-100 text-brand-700",
  ink: "bg-cream text-ink-soft",
} as const;
