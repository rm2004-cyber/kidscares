import type { Product } from "@/lib/types";
import type { SeoValue } from "@/components/admin/SeoEditor";

/**
 * Pure form helpers.
 *
 * Kept out of `ProductForm.tsx` because that file is a Client Component, and a
 * plain function exported from one cannot be *called* on the server — only
 * rendered. Server pages need `toFormValue` to seed the editor, so it lives
 * here in a boundary-free module.
 */

export type ProductFormValue = {
  title: string;
  slug: string;
  brand: string;
  categorySlug: string;
  ageSlugs: string[];
  images: string[];
  price: number;
  mrp: number;
  badge: Product["badge"] | "";
  colors: { name: string; hex: string }[];
  sizes: string[];
  description: string;
  highlights: string[];
  safety: { certification: string; ageWarning: string; material: string };
  inStock: boolean;
  seo: SeoValue;
};

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const emptyProduct: ProductFormValue = {
  title: "",
  slug: "",
  brand: "",
  categorySlug: "",
  ageSlugs: [],
  images: [],
  price: 0,
  mrp: 0,
  badge: "",
  colors: [],
  sizes: [],
  description: "",
  highlights: [],
  safety: { certification: "", ageWarning: "", material: "" },
  inStock: true,
  seo: {
    title: "",
    description: "",
    keywords: [],
    canonical: "",
    index: true,
    follow: true,
  },
};

export function toFormValue(p: Product): ProductFormValue {
  return {
    title: p.title,
    slug: p.slug,
    brand: p.brand,
    categorySlug: p.categorySlug,
    ageSlugs: p.ageSlugs,
    images: p.images,
    price: p.price,
    mrp: p.mrp,
    badge: p.badge ?? "",
    colors: p.colors,
    sizes: p.sizes,
    description: p.description,
    highlights: p.highlights,
    safety: p.safety ?? { certification: "", ageWarning: "", material: "" },
    inStock: p.inStock,
    seo: {
      title: p.seo?.title ?? "",
      description: p.seo?.description ?? "",
      keywords: p.seo?.keywords ?? [],
      canonical: p.seo?.canonical ?? "",
      index: p.seo?.index ?? true,
      follow: p.seo?.follow ?? true,
    },
  };
}
