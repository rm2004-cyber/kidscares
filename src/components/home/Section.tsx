import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/product/ProductCard";

export function SectionHeader({
  title,
  subtitle,
  href,
  icon: Icon,
  iconClassName,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  /** A lucide icon component; rendered in brand colour beside the title. */
  icon?: LucideIcon;
  iconClassName?: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">
          {Icon && <Icon className={iconClassName ?? "size-6 text-brand-500"} />}
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="group flex items-center gap-1.5 text-sm font-bold text-brand-600"
        >
          View all
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

/** Horizontal scroll rail on small screens, grid from `lg` up. */
export function ProductRail({ products }: { products: Product[] }) {
  /*
   * A grid at every size, never a side-scroller.
   *
   * A horizontal rail hides most of a row off-screen, which on a phone reads
   * as "there is nothing else here" — people scroll past rather than sideways.
   * Every product in the section is laid out here and wraps onto as many rows
   * as it needs; "View all" is a shortcut to the full listing, not the only
   * way to reach the rest of these.
   */
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5 lg:gap-5">
      {products.map((p) => (
        <li key={p._id}>
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
      {products.map((p, i) => (
        <li key={p._id}>
          <ProductCard product={p} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}
