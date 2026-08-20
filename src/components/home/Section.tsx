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
  return (
    <ul className="rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-5 lg:overflow-visible lg:px-0">
      {products.map((p) => (
        <li key={p._id} className="w-[46%] shrink-0 sm:w-[31%] lg:w-auto">
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
