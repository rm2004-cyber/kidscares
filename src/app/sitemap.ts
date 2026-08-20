import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { getAgeGroups, getAllCategories, getAllProducts } from "@/lib/data";

/**
 * Generated from the catalogue on every revalidation, so a product the admin
 * adds appears here with no manual step. Search/wishlist/cart are omitted —
 * they are marked noindex.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products, ages] = await Promise.all([
    getAllCategories(),
    getAllProducts(),
    getAgeGroups(),
  ]);

  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/deals"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/safety"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  return [
    ...staticRoutes,
    ...categories.map((c) => ({
      url: absoluteUrl(`/category/${c.slug}`),
      lastModified: now,
      changeFrequency: "daily" as const,
      // Top-level aisles outrank leaf categories.
      priority: c.parent === null ? 0.9 : 0.7,
    })),
    ...ages.map((a) => ({
      url: absoluteUrl(`/age/${a.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: absoluteUrl(`/product/${p.slug}`),
      lastModified: new Date(p.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
