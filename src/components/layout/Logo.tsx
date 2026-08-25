import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Brand lockup.
 *
 * Two assets, because one does not work at both scales:
 *
 *   "mark" — wordmark + cart only (3.8:1). Used in the header and sidebar,
 *            where the full lockup's tagline would render at ~5px and read as
 *            a grey smudge.
 *   "full" — wordmark plus the "Everything Kids Need" tagline (3:1). Used in
 *            the footer and on the login panel, where there is room for it.
 *
 * Both live in `public/`; replacing either file updates every usage.
 *
 * These are the whitespace-trimmed exports. The originals carried ~33% empty
 * margin, so every `height` set here was really drawing a logo two-thirds that
 * tall — the reason it read as small no matter what size was asked for.
 * Regenerate with `scripts/tighten-logo.mjs` if the artwork is ever replaced.
 */

const ART = {
  mark: { src: "/kidscares-mark.png", ratio: 1437 / 320 },
  full: { src: "/kidscares-full.png", ratio: 1768 / 440 },
} as const;

/* Ink height, not canvas height — a 40 here now genuinely draws 40px of logo. */
const HEIGHTS = { xs: 18, sm: 22, md: 28, lg: 38, xl: 52 } as const;

export function Logo({
  variant = "mark",
  size = "md",
  href = "/",
  className,
  priority,
  reload = false,
}: {
  variant?: keyof typeof ART;
  size?: keyof typeof HEIGHTS;
  /** Pass null to render the artwork without wrapping it in a link. */
  href?: string | null;
  className?: string;
  priority?: boolean;
  /**
   * Force a full page load instead of a client-side transition.
   *
   * The header lockup uses this: tapping the brand is how people ask for a
   * clean slate, and a soft navigation does nothing at all when they are
   * already on the home page.
   */
  reload?: boolean;
}) {
  const { src, ratio } = ART[variant];
  const h = HEIGHTS[size];

  const mark = (
    <Image
      src={src}
      alt="KidsCares — Everything Kids Need, All in One Place"
      width={Math.round(h * ratio)}
      height={h}
      priority={priority}
      className={cn("w-auto object-contain", className)}
      style={{ height: h }}
    />
  );

  if (href === null) return mark;

  const wrapper = "inline-flex shrink-0 items-center";

  /* A plain anchor rather than next/link — the browser does a real navigation,
     which is the point. Keeps working with JavaScript disabled too. */
  if (reload) {
    return (
      <a href={href} className={wrapper} aria-label="KidsCares home">
        {mark}
      </a>
    );
  }

  return (
    <Link href={href} className={wrapper} aria-label="KidsCares home">
      {mark}
    </Link>
  );
}
