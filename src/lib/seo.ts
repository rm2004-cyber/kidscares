import type { Metadata } from "next";
import type { Category, Product } from "./types";
import { discountPct } from "./data";

/**
 * Central SEO helpers.
 *
 * Everything below reads from a document field first and falls back to a
 * derived value, so when the admin panel lands it only has to write the
 * `seo` sub-document — no page code changes.
 */

export const SITE = {
  name: "KidsCares",
  tagline: "Everything Kids Need, All in One Place",
  description:
    "Shop clothing, footwear, toys, soft toys and daily essentials for kids of every age. Age-graded, safety tested and parent approved. Free delivery above ₹999.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://kidscares.example",
  locale: "en_IN",
  currency: "INR",
  twitter: "@kidscares",
};

export function absoluteUrl(path = "") {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

function ogImage(seed: string, label: string) {
  return absoluteUrl(
    `/api/placeholder?w=1200&h=630&seed=${encodeURIComponent(seed)}&label=${encodeURIComponent(label)}&glyph=teddy`,
  );
}

export function buildMetadata({
  title,
  description,
  path,
  images,
  index = true,
  keywords,
}: {
  title: string;
  description: string;
  path: string;
  images?: string[];
  index?: boolean;
  keywords?: string[];
}): Metadata {
  const url = absoluteUrl(path);
  // Social cards need a 1.91:1 image. Product photography is portrait, so a
  // dedicated OG render is used unless a page supplies a purpose-built one.
  const img = images?.length ? images : [ogImage(path, title)];
  const declaredSize = images?.length ? {} : { width: 1200, height: 630 };

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    robots: {
      index,
      follow: index,
      googleBot: { index, follow: index, "max-image-preview": "large" },
    },
    openGraph: {
      type: "website",
      siteName: SITE.name,
      locale: SITE.locale,
      url,
      title,
      description,
      images: img.map((u) => ({ url: u, alt: title, ...declaredSize })),
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.twitter,
      title,
      description,
      images: img,
    },
  };
}

export function productMetadata(product: Product): Metadata {
  const seo = product.seo ?? {};
  const off = discountPct(product.mrp, product.price);

  // No site name here — the root layout's title template appends it.
  const title = seo.title ?? `${product.title} by ${product.brand} — ${off}% Off`;
  const description =
    seo.description ??
    `Buy ${product.title} from ${product.brand} at ₹${product.price} (${off}% off). ` +
      `Rated ${product.rating}/5 by ${product.reviewCount} parents. Free delivery above ₹999, easy 30-day returns.`;

  return buildMetadata({
    title,
    description,
    path: `/product/${product.slug}`,
    images: seo.ogImage ? [seo.ogImage] : [absoluteUrl(product.images[0])],
    index: seo.index ?? true,
    keywords: seo.keywords ?? [
      product.title,
      product.brand,
      "kids " + product.categorySlug.split("/").pop()?.replace(/-/g, " "),
      "buy online india",
    ],
  });
}

export function categoryMetadata(
  category: Category,
  productCount: number,
): Metadata {
  const seo = category.seo ?? {};
  const title = seo.title ?? `Kids ${category.name} Online — ${productCount}+ Styles`;
  const description =
    seo.description ??
    category.blurb ??
    `Shop ${productCount}+ kids ${category.name.toLowerCase()} at ${SITE.name}. Age-graded, safety tested, free delivery above ₹999 and easy 30-day returns.`;

  return buildMetadata({
    title,
    description,
    path: `/category/${category.slug}`,
    index: seo.index ?? true,
    keywords: seo.keywords ?? [
      `kids ${category.name.toLowerCase()}`,
      `buy ${category.name.toLowerCase()} online`,
      "children " + category.name.toLowerCase(),
    ],
  });
}

/* ------------------------------------------------------------- JSON-LD */

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: absoluteUrl("/kidscareslogo-mark.png"),
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+91-1800-123-4567",
      contactType: "customer service",
      areaServed: "IN",
      availableLanguage: ["en", "hi"],
    },
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    // Enables the Google sitelinks search box.
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: absoluteUrl("/search?q={search_term_string}"),
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function productLd(product: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.images.map((i) => absoluteUrl(i)),
    sku: product._id,
    brand: { "@type": "Brand", name: product.brand },
    audience: { "@type": "PeopleAudience", suggestedMinAge: 0 },
    material: product.safety?.material,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
      bestRating: 5,
    },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/product/${product.slug}`),
      priceCurrency: SITE.currency,
      price: product.price,
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: SITE.name },
    },
  };
}

export function breadcrumbLd(trail: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: absoluteUrl(t.url),
    })),
  };
}

export function itemListLd(products: Product[], listName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 30).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/product/${p.slug}`),
      name: p.title,
    })),
  };
}
