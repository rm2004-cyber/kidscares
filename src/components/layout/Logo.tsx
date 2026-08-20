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
 */

const ART = {
  mark: { src: "/kidscareslogo-mark.png", ratio: 1740 / 460 },
  full: { src: "/kidscarelogo.png", ratio: 2172 / 724 },
} as const;

const HEIGHTS = { xs: 24, sm: 30, md: 38, lg: 56, xl: 76 } as const;

export function Logo({
  variant = "mark",
  size = "md",
  href = "/",
  className,
  priority,
}: {
  variant?: keyof typeof ART;
  size?: keyof typeof HEIGHTS;
  /** Pass null to render the artwork without wrapping it in a link. */
  href?: string | null;
  className?: string;
  priority?: boolean;
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

  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center"
      aria-label="KidsCares home"
    >
      {mark}
    </Link>
  );
}
