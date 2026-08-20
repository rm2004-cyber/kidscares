import { Suspense } from "react";
import Link from "next/link";

import { Glyph } from "@/components/ui/Glyph";
import { ProductGrid } from "@/components/home/Section";
import { ProductGridSkeleton } from "@/components/ui/Skeletons";
import { FilterBar } from "@/components/product/FilterBar";
import { getAgeGroups, getBrands, getProducts, topCategories, type ProductQuery } from "@/lib/data";

type Search = Record<string, string | string[] | undefined>;

/**
 * Search results are intentionally `noindex, follow`: they are useful to a
 * shopper but would flood the index with thin, near-duplicate pages. Links
 * out of here are still followed so product pages keep their crawl paths.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  return {
    title: q ? `Search results for "${q}"` : "Search",
    description: q
      ? `Products matching "${q}" at KidsCares.`
      : "Search kids clothing, footwear, toys and daily essentials at KidsCares.",
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const many = (k: string) => {
    const v = sp[k];
    return v == null ? [] : Array.isArray(v) ? v : [v];
  };

  const q = one("q") ?? "";

  const query: ProductQuery = {
    q: q || undefined,
    age: one("age"),
    brand: many("brand"),
    minPrice: one("minPrice") ? Number(one("minPrice")) : undefined,
    maxPrice: one("maxPrice") ? Number(one("maxPrice")) : undefined,
    sort: (one("sort") as ProductQuery["sort"]) ?? "popular",
  };

  const [results, brands, ageGroups] = await Promise.all([
    getProducts(query),
    getBrands(),
    getAgeGroups(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
        {q ? (
          <>
            Results for <span className="text-brand-600">&ldquo;{q}&rdquo;</span>
          </>
        ) : (
          "Browse all products"
        )}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        {results.length} {results.length === 1 ? "product" : "products"} found
      </p>

      <div className="mt-5">
        <FilterBar brands={brands} ageGroups={ageGroups} total={results.length} />
      </div>

      <Suspense fallback={<ProductGridSkeleton />}>
        {results.length > 0 ? (
          <ProductGrid products={results} />
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line bg-white py-20 text-center">
            <Glyph name="searchOff" className="size-16 text-ink-muted" />
            <p className="font-display text-lg font-bold">Nothing matched that</p>
            <p className="max-w-sm text-sm text-ink-muted">
              Check the spelling, or start from a category instead.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {topCategories.slice(0, 5).map((c) => (
                <Link
                  key={c._id}
                  href={`/category/${c.slug}`}
                  className="rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold transition hover:border-brand-300 hover:text-brand-600"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </Suspense>
    </div>
  );
}
