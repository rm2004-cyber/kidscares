import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Gallery } from "@/components/product/Gallery";
import { BuyBox } from "@/components/product/BuyBox";
import { ProductRail, SectionHeader } from "@/components/home/Section";
import { RailSkeleton } from "@/components/ui/Skeletons";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ProductReviews } from "@/components/review/ProductReviews";
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

        <div className="mt-6">
          <ProductReviews slug={product.slug} />
        </div>

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
