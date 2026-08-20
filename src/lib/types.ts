/**
 * Domain types.
 *
 * Field names deliberately match the MongoDB documents we will create later
 * (`_id` as string, `slug` unique, embedded `seo` sub-document), so the mock
 * repository in `data.ts` can be swapped for Mongoose queries without any
 * component changing.
 */

export type Seo = {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  canonical?: string;
  index: boolean;
  follow: boolean;
};

export type AgeGroup = {
  _id: string;
  slug: string;
  label: string;
  minMonths: number;
  maxMonths: number;
};

export type Category = {
  _id: string;
  slug: string;
  name: string;
  /** null for a top-level category */
  parent: string | null;
  image: string;
  /** short blurb rendered on the category landing page + used as meta fallback */
  blurb?: string;
  accent: string;
  productCount: number;
  seo?: Partial<Seo>;
};

export type Brand = {
  _id: string;
  slug: string;
  name: string;
  logo: string;
};

export type ProductVariant = {
  _id: string;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
  sku: string;
};

export type Product = {
  _id: string;
  slug: string;
  title: string;
  brand: string;
  categorySlug: string;
  ageSlugs: string[];
  /** Cloudinary public URLs once wired; placeholders for now. */
  images: string[];
  price: number;
  mrp: number;
  rating: number;
  reviewCount: number;
  badge?: "new" | "bestseller" | "sale" | "limited";
  colors: { name: string; hex: string }[];
  sizes: string[];
  description: string;
  highlights: string[];
  /** Toy/garment safety info — a real ranking + trust signal for a kids brand. */
  safety?: { certification: string; ageWarning: string; material: string };
  inStock: boolean;
  createdAt: string;
  seo?: Partial<Seo>;
};

export type Banner = {
  _id: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  image: string;
  /** tailwind gradient classes — admin will pick from a preset list */
  gradient: string;
  align: "left" | "right";
};

export type Deal = {
  _id: string;
  title: string;
  discountLabel: string;
  href: string;
  image: string;
  accent: string;
  /** ISO timestamp the countdown ticks down to */
  endsAt: string;
};

export type CartLine = {
  productId: string;
  slug: string;
  title: string;
  brand: string;
  image: string;
  price: number;
  mrp: number;
  size: string;
  color: string;
  qty: number;
};
