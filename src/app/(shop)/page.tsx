import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  Baby,
  Shirt,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  ToyBrick,
  Umbrella,
} from "lucide-react";

import { HeroCarousel } from "@/components/home/HeroCarousel";
import { AgeStrip, CategoryRail } from "@/components/home/CategoryRail";
import { DealsSection } from "@/components/home/DealsSection";
import { ProductRail, SectionHeader } from "@/components/home/Section";
import { RailSkeleton, CategoryRailSkeleton, HeroSkeleton } from "@/components/ui/Skeletons";
import { JsonLd } from "@/components/JsonLd";
import { GlyphBadge } from "@/components/ui/Glyph";
import { itemListLd } from "@/lib/seo";
import {
  getAgeGroups,
  getBanners,
  getBrands,
  getDeals,
  getProducts,
  getTopCategories,
} from "@/lib/data";

export const metadata = {
  // Home overrides the title template — it should not read "Home | KidsCares".
  title: {
    absolute: "KidsCares — Kids Clothing, Footwear, Toys & Daily Needs Online",
  },
  description:
    "Shop everything for kids in one place: clothing, footwear, toys, soft toys, school supplies and daily essentials. Age-graded, safety tested, free delivery above ₹999.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [banners, categories, ages, deals, brands] = await Promise.all([
    getBanners(),
    getTopCategories(),
    getAgeGroups(),
    getDeals(),
    getBrands(),
  ]);

  const [bestsellers, newArrivals, toys, essentials] = await Promise.all([
    getProducts({ badge: "bestseller" }),
    getProducts({ sort: "new" }),
    getProducts({ category: "toys", sort: "rating" }),
    getProducts({ category: "daily-needs" }),
  ]);

  return (
    <>
      <JsonLd data={itemListLd(bestsellers, "KidsCares Bestsellers")} />

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-6 sm:py-8">
        <Suspense fallback={<HeroSkeleton />}>
          <HeroCarousel banners={banners} />
        </Suspense>

        <section aria-labelledby="age-heading">
          <h2
            id="age-heading"
            className="mb-4 font-display text-xl font-extrabold text-ink sm:text-2xl"
          >
            Shop by Age
          </h2>
          <AgeStrip ages={ages} />
        </section>

        <section aria-labelledby="cat-heading">
          <SectionHeader
            title="Shop by Category"
            subtitle="Eight aisles, everything a growing kid needs."
            icon={ShoppingBag}
          />
          <Suspense fallback={<CategoryRailSkeleton />}>
            <CategoryRail categories={categories} />
          </Suspense>
        </section>

        <DealsSection deals={deals} />

        <section aria-labelledby="best-heading">
          <SectionHeader
            title="Parent Favourites"
            subtitle="The products reordered most this month."
            href="/search?sort=popular"
            icon={Star} iconClassName="size-6 fill-sun-400 text-sun-400"
          />
          <Suspense fallback={<RailSkeleton />}>
            <ProductRail products={bestsellers.slice(0, 10)} />
          </Suspense>
        </section>

        <PromoStrip />

        <section aria-labelledby="new-heading">
          <SectionHeader
            title="Just Landed"
            subtitle="Fresh arrivals, added this week."
            href="/search?sort=new"
            icon={Sparkles} iconClassName="size-6 text-grape-500"
          />
          <Suspense fallback={<RailSkeleton />}>
            <ProductRail products={newArrivals.slice(0, 10)} />
          </Suspense>
        </section>

        <section aria-labelledby="toys-heading">
          <SectionHeader
            title="Playroom Picks"
            subtitle="Learning toys, puzzles and pretend play — all age-graded."
            href="/category/toys"
            icon={ToyBrick} iconClassName="size-6 text-sun-500"
          />
          <Suspense fallback={<RailSkeleton />}>
            <ProductRail products={toys.slice(0, 10)} />
          </Suspense>
        </section>

        <BrandStrip brands={brands} />

        <section aria-labelledby="essentials-heading">
          <SectionHeader
            title="Daily Essentials"
            subtitle="Diapers, feeding and bath — the restock run, sorted."
            href="/category/daily-needs"
            icon={Baby} iconClassName="size-6 text-mint-500"
          />
          <Suspense fallback={<RailSkeleton />}>
            <ProductRail products={essentials.slice(0, 10)} />
          </Suspense>
        </section>

        <TrustBand />
      </div>
    </>
  );
}

/** Two large editorial tiles between product rails — breaks up the grid rhythm. */
function PromoStrip() {
  const tiles = [
    {
      title: "Newborn Starter Kit",
      copy: "Everything for the first 6 months, bundled at 40% off.",
      href: "/age/0-6-months",
      gradient: "from-mint-300 to-mint-500",
      icon: Baby,
    },
    {
      title: "Monsoon Footwear",
      copy: "Quick-dry, non-slip and school-ready. From ₹499.",
      href: "/category/footwear",
      gradient: "from-sky-ks to-grape-500",
      icon: Umbrella,
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2">
      {tiles.map((t) => (
        <Link
          key={t.title}
          href={t.href}
          className={`group relative flex min-h-[160px] items-center justify-between overflow-hidden rounded-card bg-gradient-to-br ${t.gradient} p-6 text-white transition-transform duration-300 hover:-translate-y-1`}
        >
          <div className="relative z-10 max-w-[62%]">
            <h3 className="font-display text-xl font-extrabold sm:text-2xl">
              {t.title}
            </h3>
            <p className="mt-1 text-sm text-white/90">{t.copy}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold">
              Shop now
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
          <t.icon
            className="absolute -bottom-4 -right-4 size-40 opacity-20 transition-transform duration-500 group-hover:scale-110"
            strokeWidth={1.25}
          />
        </Link>
      ))}
    </section>
  );
}

function BrandStrip({ brands }: { brands: Awaited<ReturnType<typeof getBrands>> }) {
  return (
    <section aria-labelledby="brands-heading">
      <SectionHeader
        title="Brands Parents Trust"
        subtitle="Vetted for safety, sizing and everyday durability."
        icon={Tag} iconClassName="size-6 text-sky-ks"
      />
      <ul className="rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:grid sm:grid-cols-4 sm:gap-4 lg:grid-cols-8">
        {brands.map((b) => (
          <li key={b._id} className="shrink-0">
            <Link
              href={`/search?q=${encodeURIComponent(b.name)}`}
              className="flex w-32 flex-col items-center gap-2 rounded-2xl border border-line bg-white p-3 transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-md sm:w-auto"
            >
              <Image
                src={b.logo}
                alt=""
                width={80}
                height={48}
                unoptimized
                className="h-12 w-20 rounded-lg object-cover"
              />
              <span className="text-xs font-bold text-ink">{b.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TrustBand() {
  const items = [
    { glyph: "shield", tone: "mint" as const, title: "Safety First", copy: "Every toy meets BIS / ISO 8124 standards and carries a clear age grade." },
    { glyph: "leaf", tone: "sun" as const, title: "Skin-Friendly", copy: "OEKO-TEX certified fabrics — no harsh dyes, no irritants." },
    { glyph: "truck", tone: "sky" as const, title: "Fast Delivery", copy: "Free over ₹999, delivered to 24,000+ pincodes across India." },
    { glyph: "refresh", tone: "grape" as const, title: "Easy Returns", copy: "30 days, free pickup, refund to source in 3–5 working days." },
  ];

  return (
    <section className="rounded-card border border-line bg-white p-6 sm:p-8">
      <h2 className="mb-6 text-center font-display text-2xl font-extrabold sm:text-3xl">
        Why parents choose KidsCares
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.title} className="text-center">
            <GlyphBadge
              name={i.glyph}
              tone={i.tone}
              className="mx-auto size-14 rounded-2xl"
              glyphClassName="size-7"
            />
            <p className="mt-3 font-display text-base font-bold">{i.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{i.copy}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
