import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { ProductGrid } from "@/components/home/Section";
import { ProductGridSkeleton } from "@/components/ui/Skeletons";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { FilterBar } from "@/components/product/FilterBar";
import { Glyph } from "@/components/ui/Glyph";
import { JsonLd } from "@/components/JsonLd";
import { SurfaceTheme } from "@/lib/theme/useSurface";
import { breadcrumbLd, categoryMetadata, itemListLd } from "@/lib/seo";
import {
  categories,
  categoryTrail,
  getAgeGroups,
  getBrands,
  getCategoryBySlug,
  getProducts,
  getSubcategories,
  type ProductQuery,
} from "@/lib/data";

type Params = { slug: string[] };
type Search = Record<string, string | string[] | undefined>;

/** Pre-renders every category at build time; ISR keeps them fresh. */
export async function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug.split("/") }));
}

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug.join("/"));
  if (!category) return { title: "Category not found" };

  const products = await getProducts({ category: category.slug });
  return categoryMetadata(category, products.length);
}

/** Turns `?brand=X&age=Y&sort=Z` into a repository query. */
function toQuery(category: string, sp: Search): ProductQuery {
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const many = (k: string) => {
    const v = sp[k];
    return v == null ? [] : Array.isArray(v) ? v : [v];
  };

  return {
    category,
    age: one("age"),
    brand: many("brand"),
    minPrice: one("minPrice") ? Number(one("minPrice")) : undefined,
    maxPrice: one("maxPrice") ? Number(one("maxPrice")) : undefined,
    sort: (one("sort") as ProductQuery["sort"]) ?? "popular",
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const path = slug.join("/");

  const category = await getCategoryBySlug(path);
  if (!category) notFound();

  const [products, subs, brands, ageGroups] = await Promise.all([
    getProducts(toQuery(category.slug, sp)),
    getSubcategories(category.slug),
    getBrands(),
    getAgeGroups(),
  ]);

  const trail = [
    { name: "Home", url: "/" },
    ...categoryTrail(category.slug).map((c) => ({
      name: c.name,
      url: `/category/${c.slug}`,
    })),
  ];

  return (
    <>
      <SurfaceTheme theme={category.slug} />
      <JsonLd
        data={[
          breadcrumbLd(trail),
          itemListLd(products, `${category.name} at KidsCare`),
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-6">
        <Breadcrumbs trail={trail} />

        <header className="mb-6 overflow-hidden rounded-card border border-line bg-white">
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:p-8">
            <span className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-cream">
              <Image
                src={category.image}
                alt=""
                fill
                unoptimized
                sizes="80px"
                className="object-cover"
              />
            </span>
            <div>
              {/* The only h1 on the page — the ranking target. */}
              <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
                Kids {category.name}
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
                {category.blurb ??
                  `Browse our full ${category.name.toLowerCase()} range — age-graded, safety tested and parent approved.`}
              </p>
              <p className="mt-2 text-xs font-semibold text-ink-muted">
                {products.length} products
              </p>
            </div>
          </div>

          {subs.length > 0 && (
            <nav
              aria-label={`${category.name} subcategories`}
              className="rail flex gap-2 overflow-x-auto border-t border-line px-6 py-3"
            >
              {subs.map((s) => (
                <Link
                  key={s._id}
                  href={`/category/${s.slug}`}
                  className="shrink-0 rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink-soft transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
                >
                  {s.name}
                </Link>
              ))}
            </nav>
          )}
        </header>

        <FilterBar brands={brands} ageGroups={ageGroups} total={products.length} />

        <Suspense fallback={<ProductGridSkeleton />}>
          {products.length > 0 ? (
            <ProductGrid products={products} />
          ) : (
            <EmptyState categoryName={category.name} />
          )}
        </Suspense>

        {/* Keyword-rich copy below the fold — helps the category page rank for
            long-tail queries without pushing products down. */}
        <section className="mt-14 rounded-card border border-line bg-white p-6 sm:p-8">
          <h2 className="font-display text-xl font-extrabold">
            Buying {category.name.toLowerCase()} for your child
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-soft">
            <p>
              Every {category.name.toLowerCase()} product at KidsCare is checked for
              material safety, sizing accuracy and everyday durability before it
              reaches the catalogue. Filter by age to see only what fits your child
              today, and by brand once you know what works.
            </p>
            <p>
              Orders above ₹999 ship free across 24,000+ pincodes, and anything that
              does not fit can be returned within 30 days with free pickup.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

function EmptyState({ categoryName }: { categoryName: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line bg-white py-20 text-center">
      <Glyph name="searchOff" className="size-16 text-ink-muted" />
      <p className="font-display text-lg font-bold">No matches in {categoryName}</p>
      <p className="max-w-sm text-sm text-ink-muted">
        Try widening the price range or clearing a filter or two.
      </p>
    </div>
  );
}
