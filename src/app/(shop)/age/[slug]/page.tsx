import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

import { ProductGrid } from "@/components/home/Section";
import { ProductGridSkeleton } from "@/components/ui/Skeletons";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { FilterBar } from "@/components/product/FilterBar";
import { Glyph } from "@/components/ui/Glyph";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd, buildMetadata, itemListLd } from "@/lib/seo";
import {
  ageGroups,
  getAgeGroups,
  getBrands,
  getProducts,
  topCategories,
  type ProductQuery,
} from "@/lib/data";

type Params = { slug: string };
type Search = Record<string, string | string[] | undefined>;

export async function generateStaticParams() {
  return ageGroups.map((a) => ({ slug: a.slug }));
}

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const age = ageGroups.find((a) => a.slug === slug);
  if (!age) return { title: "Age group not found" };

  const products = await getProducts({ age: slug });

  return buildMetadata({
    title: `Kids Products for ${age.label} — ${products.length}+ Picks`,
    description:
      `Shop clothing, footwear, toys and essentials suited to ${age.label}. ` +
      `Every product age-graded and safety tested. Free delivery above ₹999.`,
    path: `/age/${age.slug}`,
    keywords: [
      `products for ${age.label}`,
      `${age.label} kids clothing`,
      `toys for ${age.label}`,
      "age appropriate toys",
    ],
  });
}

export default async function AgePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const age = ageGroups.find((a) => a.slug === slug);
  if (!age) notFound();

  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const many = (k: string) => {
    const v = sp[k];
    return v == null ? [] : Array.isArray(v) ? v : [v];
  };

  const query: ProductQuery = {
    age: slug,
    brand: many("brand"),
    minPrice: one("minPrice") ? Number(one("minPrice")) : undefined,
    maxPrice: one("maxPrice") ? Number(one("maxPrice")) : undefined,
    sort: (one("sort") as ProductQuery["sort"]) ?? "popular",
  };

  const [products, brands, ages] = await Promise.all([
    getProducts(query),
    getBrands(),
    getAgeGroups(),
  ]);

  const trail = [
    { name: "Home", url: "/" },
    { name: `Age ${age.label}`, url: `/age/${age.slug}` },
  ];

  return (
    <>
      <JsonLd
        data={[breadcrumbLd(trail), itemListLd(products, `KidsCares — ${age.label}`)]}
      />

      <div className="mx-auto max-w-7xl px-4 py-6">
        <Breadcrumbs trail={trail} />

        <header className="mb-6 overflow-hidden rounded-card bg-gradient-to-br from-grape-500 to-sky-ks p-6 text-white sm:p-8">
          <p className="text-xs font-bold uppercase tracking-wider text-white/80">
            Shop by age
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold sm:text-4xl">
            Everything for {age.label}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/90">
            {products.length} products sized, graded and safety tested for this age
            band — from first outfits to the toys they will actually keep playing with.
          </p>

          <nav className="mt-4 flex flex-wrap gap-2" aria-label="Categories">
            {topCategories.slice(0, 6).map((c) => (
              <Link
                key={c._id}
                href={`/category/${c.slug}?age=${age.slug}`}
                className="rounded-full bg-white/20 px-3.5 py-1.5 text-xs font-bold backdrop-blur transition hover:bg-white hover:text-ink"
              >
                {c.name}
              </Link>
            ))}
          </nav>
        </header>

        <FilterBar brands={brands} ageGroups={ages} total={products.length} />

        <Suspense fallback={<ProductGridSkeleton />}>
          {products.length > 0 ? (
            <ProductGrid products={products} />
          ) : (
            <div className="rounded-card border border-dashed border-line bg-white py-20 text-center">
              <Glyph name="bottle" className="mx-auto size-16 text-ink-muted" />
              <p className="mt-3 font-display text-lg font-bold">
                Nothing here right now
              </p>
              <p className="text-sm text-ink-muted">Try clearing a filter.</p>
            </div>
          )}
        </Suspense>
      </div>
    </>
  );
}
