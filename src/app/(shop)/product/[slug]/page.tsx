import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Gallery } from "@/components/product/Gallery";
import { BuyBox } from "@/components/product/BuyBox";
import { ProductRail, SectionHeader } from "@/components/home/Section";
import { RailSkeleton } from "@/components/ui/Skeletons";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Stars } from "@/components/ui/Rating";
import { Check, Lightbulb, ShieldCheck } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { SurfaceTheme } from "@/lib/theme/useSurface";
import { breadcrumbLd, productLd, productMetadata } from "@/lib/seo";
import {
  categoryTrail,
  getProductBySlug,
  getRelatedProducts,
  products as allProducts,
} from "@/lib/data";

type Params = { slug: string };

export async function generateStaticParams() {
  return allProducts.map((p) => ({ slug: p.slug }));
}

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return productMetadata(product);
}

export default async function ProductPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product, 10);

  const trail = [
    { name: "Home", url: "/" },
    ...categoryTrail(product.categorySlug).map((c) => ({
      name: c.name,
      url: `/category/${c.slug}`,
    })),
    { name: product.title, url: `/product/${product.slug}` },
  ];

  return (
    <>
      <SurfaceTheme theme={product.categorySlug} />
      <JsonLd data={[productLd(product), breadcrumbLd(trail)]} />

      <div className="mx-auto max-w-7xl px-4 py-6">
        <Breadcrumbs trail={trail} />

        <div className="grid gap-8 lg:grid-cols-[1fr_minmax(360px,42%)] lg:gap-12">
          <Gallery images={product.images} alt={product.title} />
          <BuyBox product={product} />
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <section className="rounded-card border border-line bg-white p-6">
            <h2 className="font-display text-lg font-extrabold">
              Product Description
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {product.description}
            </p>

            <h3 className="mt-5 text-sm font-bold">Highlights</h3>
            <ul className="mt-2 space-y-1.5">
              {product.highlights.map((h) => (
                <li key={h} className="flex gap-2 text-sm text-ink-soft">
                  <Check className="mt-0.5 size-4 shrink-0 text-mint-500" strokeWidth={3} />
                  {h}
                </li>
              ))}
            </ul>
          </section>

          {product.safety && (
            /* Safety block is deliberately prominent: for a kids brand it is
               both a conversion driver and a structured-data signal. */
            <section className="rounded-card border border-mint-200 bg-mint-50 p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
                <ShieldCheck className="size-5 text-mint-600" />
                Safety &amp; Care
              </h2>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="font-bold text-ink">Certification</dt>
                  <dd className="text-ink-soft">{product.safety.certification}</dd>
                </div>
                <div>
                  <dt className="font-bold text-ink">Age guidance</dt>
                  <dd className="text-ink-soft">{product.safety.ageWarning}</dd>
                </div>
                <div>
                  <dt className="font-bold text-ink">Materials</dt>
                  <dd className="text-ink-soft">{product.safety.material}</dd>
                </div>
              </dl>
            </section>
          )}
        </div>

        <section className="mt-6 rounded-card border border-line bg-white p-6">
          <h2 className="font-display text-lg font-extrabold">
            Ratings &amp; Reviews
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-6">
            <div className="text-center">
              <p className="font-display text-4xl font-extrabold">
                {product.rating.toFixed(1)}
              </p>
              <Stars rating={product.rating} />
              <p className="mt-1 text-xs text-ink-muted">
                {product.reviewCount.toLocaleString("en-IN")} ratings
              </p>
            </div>
            <div className="min-w-52 flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((star) => {
                // Deterministic distribution — no Math.random, so SSR matches.
                const share = [62, 24, 8, 4, 2][5 - star];
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-ink-muted">{star}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-sun-400"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-ink-muted">{share}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-14">
          <SectionHeader
            title="You may also like"
            subtitle="More from this aisle, picked by fit and age."
            icon={Lightbulb} iconClassName="size-6 text-sun-500"
          />
          <Suspense fallback={<RailSkeleton />}>
            <ProductRail products={related} />
          </Suspense>
        </section>
      </div>
    </>
  );
}
