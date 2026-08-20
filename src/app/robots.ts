import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

/**
 * Rules will move behind an admin-editable settings document; the shape stays
 * identical, so only the source of `disallow` changes.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/cart",
        "/checkout",
        "/account",
        "/wishlist",
        // Faceted search would otherwise burn crawl budget on near-duplicates.
        "/search",
        "/*?*brand=",
        "/*?*minPrice=",
        "/*?*sort=",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl(""),
  };
}
