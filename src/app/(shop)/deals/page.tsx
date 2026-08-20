import { Flame, Tag } from "lucide-react";
import { Suspense } from "react";

import { DealsSection } from "@/components/home/DealsSection";
import { ProductGrid, SectionHeader } from "@/components/home/Section";
import { ProductGridSkeleton } from "@/components/ui/Skeletons";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { SurfaceTheme } from "@/lib/theme/useSurface";
import { breadcrumbLd, buildMetadata, itemListLd } from "@/lib/seo";
import { discountPct, getDeals, getProducts } from "@/lib/data";

export const revalidate = 900;

export const metadata = buildMetadata({
  title: "Today's Deals on Kids Clothing, Toys & Essentials",
  description:
    "Live offers across kids clothing, footwear, toys and daily needs — up to 70% off, refreshed every morning. Free delivery above ₹999.",
  path: "/deals",
  keywords: [
    "kids deals",
    "kids sale online",
    "toy offers",
    "baby products discount",
  ],
});

export default async function DealsPage() {
  const [deals, all] = await Promise.all([getDeals(), getProducts()]);

  // "Deal" = anything with a real discount, best first.
  const discounted = all
    .filter((p) => discountPct(p.mrp, p.price) >= 35)
    .sort((a, b) => discountPct(b.mrp, b.price) - discountPct(a.mrp, a.price));

  const trail = [
    { name: "Home", url: "/" },
    { name: "Today's Deals", url: "/deals" },
  ];

  return (
    <>
      <SurfaceTheme theme="toys" />
      <JsonLd
        data={[breadcrumbLd(trail), itemListLd(discounted, "KidsCares Today's Deals")]}
      />

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-6">
        <Breadcrumbs trail={trail} />

        <header>
          <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold sm:text-4xl">
            <Flame className="size-8 fill-brand-500 text-brand-500" />
            Today&apos;s Deals
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Every offer below is live right now and refreshed each morning. Prices
            shown are final — no coupon needed.
          </p>
        </header>

        <DealsSection deals={deals} />

        <section>
          <SectionHeader
            title="Biggest Discounts"
            subtitle={`${discounted.length} products at 35% off or more.`}
            icon={Tag} iconClassName="size-6 text-sky-ks"
          />
          <Suspense fallback={<ProductGridSkeleton />}>
            <ProductGrid products={discounted} />
          </Suspense>
        </section>
      </div>
    </>
  );
}
