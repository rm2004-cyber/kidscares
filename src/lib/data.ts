import type {
  AgeGroup,
  Banner,
  Brand,
  Category,
  Deal,
  Product,
} from "./types";

/**
 * Mock repository.
 *
 * Every exported reader is `async` and takes the same arguments the eventual
 * Mongoose implementation will take, so wiring MongoDB later is a body swap
 * inside this file only — no page or component needs to change.
 */

/** Builds a placeholder image URL. `glyph` names an entry in lib/theme/icons. */
export const img = (
  seed: string,
  w: number,
  h: number,
  glyph = "",
  label = "",
) =>
  `/api/placeholder?w=${w}&h=${h}&seed=${encodeURIComponent(seed)}` +
  (glyph ? `&glyph=${encodeURIComponent(glyph)}` : "") +
  (label ? `&label=${encodeURIComponent(label)}` : "");

/* ----------------------------------------------------------------- ages */

export const ageGroups: AgeGroup[] = [
  { _id: "a1", slug: "0-6-months", label: "0–6 Months", minMonths: 0, maxMonths: 6 },
  { _id: "a2", slug: "6-24-months", label: "6–24 Months", minMonths: 6, maxMonths: 24 },
  { _id: "a3", slug: "2-4-years", label: "2–4 Years", minMonths: 24, maxMonths: 48 },
  { _id: "a4", slug: "4-6-years", label: "4–6 Years", minMonths: 48, maxMonths: 72 },
  { _id: "a5", slug: "6-10-years", label: "6–10 Years", minMonths: 72, maxMonths: 120 },
  { _id: "a6", slug: "10-plus-years", label: "10+ Years", minMonths: 120, maxMonths: 216 },
];

/* ----------------------------------------------------------- categories */

const cat = (
  id: string,
  slug: string,
  name: string,
  parent: string | null,
  emoji: string,
  accent: string,
  productCount: number,
  blurb?: string,
): Category => ({
  _id: id,
  slug,
  name,
  parent,
  image: img(slug, 400, 400, emoji),
  accent,
  productCount,
  blurb,
});

export const categories: Category[] = [
  cat("c1", "clothing", "Clothing", null, "tshirt", "brand", 1240,
    "Soft, skin-friendly everyday wear — rompers, sets, ethnic and party picks for every age."),
  cat("c2", "footwear", "Footwear", null, "sneaker", "sky", 486,
    "First-walker shoes, school shoes, sandals and sneakers with flexible, non-slip soles."),
  cat("c3", "toys", "Toys", null, "teddy", "sun", 932,
    "Learning toys, ride-ons, puzzles and pretend play — every item age-graded and safety tested."),
  cat("c4", "soft-toys", "Soft Toys", null, "teddy", "grape", 274,
    "Huggable plush friends in hypoallergenic, machine-washable fabrics."),
  cat("c5", "daily-needs", "Daily Needs", null, "bottle", "mint", 815,
    "Diapers, wipes, feeding and bath essentials — the restock run, sorted."),
  cat("c6", "baby-care", "Baby Care", null, "lotion", "brand", 391,
    "Gentle lotions, shampoos and skincare made for newborn skin."),
  cat("c7", "school-supplies", "School & Stationery", null, "backpack", "sky", 355,
    "Backpacks, lunch kits, bottles and art supplies built to survive a school year."),
  cat("c8", "nursery", "Nursery & Furniture", null, "crib", "grape", 168,
    "Cots, high chairs, storage and room décor that grow with your little one."),

  cat("c11", "clothing/rompers-onesies", "Rompers & Onesies", "clothing", "bottle", "brand", 212),
  cat("c12", "clothing/t-shirts", "T-Shirts & Tops", "clothing", "tshirt", "mint", 318),
  cat("c13", "clothing/dresses", "Dresses & Frocks", "clothing", "dress", "grape", 264),
  cat("c14", "clothing/ethnic-wear", "Ethnic Wear", "clothing", "star", "sun", 149),
  cat("c15", "clothing/winter-wear", "Winter Wear", "clothing", "jacket", "sky", 197),

  cat("c21", "footwear/first-walkers", "First Walkers", "footwear", "pacifier", "mint", 96),
  cat("c22", "footwear/sneakers", "Sneakers", "footwear", "sneaker", "brand", 174),
  cat("c23", "footwear/sandals", "Sandals & Floaters", "footwear", "sandal", "sun", 122),
  cat("c24", "footwear/school-shoes", "School Shoes", "footwear", "book", "sky", 94),

  cat("c31", "toys/learning-toys", "Learning & STEM", "toys", "block", "sky", 241),
  cat("c32", "toys/ride-ons", "Ride-Ons & Outdoor", "toys", "bike", "brand", 138),
  cat("c33", "toys/puzzles", "Puzzles & Board Games", "toys", "puzzle", "grape", 186),
  cat("c34", "toys/pretend-play", "Pretend Play", "toys", "robot", "sun", 167),

  cat("c51", "daily-needs/diapers", "Diapers & Wipes", "daily-needs", "wipes", "mint", 208),
  cat("c52", "daily-needs/feeding", "Feeding & Nursing", "daily-needs", "bottle", "brand", 246),
  cat("c53", "daily-needs/bath", "Bath & Hygiene", "daily-needs", "droplet", "sky", 189),
];

export const topCategories = categories.filter((c) => c.parent === null);

/* --------------------------------------------------------------- brands */

export const brands: Brand[] = [
  { _id: "b1", slug: "tinytwig", name: "TinyTwig", logo: img("tinytwig", 200, 120, "leaf") },
  { _id: "b2", slug: "pumpkin-patch", name: "Pumpkin Patch", logo: img("pumpkin", 200, 120, "gift") },
  { _id: "b3", slug: "little-bear", name: "Little Bear", logo: img("littlebear", 200, 120, "teddy") },
  { _id: "b4", slug: "sunnydays", name: "SunnyDays", logo: img("sunnydays", 200, 120, "star") },
  { _id: "b5", slug: "brainy-bots", name: "Brainy Bots", logo: img("brainybots", 200, 120, "robot") },
  { _id: "b6", slug: "cuddlenest", name: "CuddleNest", logo: img("cuddlenest", 200, 120, "bunny") },
  { _id: "b7", slug: "roamers", name: "Roamers", logo: img("roamers", 200, 120, "boot") },
  { _id: "b8", slug: "puredrop", name: "PureDrop", logo: img("puredrop", 200, 120, "droplet") },
];

/* ------------------------------------------------------------- products */

const COLORS = [
  { name: "Coral", hex: "#f74d3f" },
  { name: "Mint", hex: "#38d391" },
  { name: "Sunshine", hex: "#ffc531" },
  { name: "Grape", hex: "#7c53f5" },
  { name: "Sky", hex: "#34a6e8" },
  { name: "Blush", hex: "#ff9cc0" },
  { name: "Ivory", hex: "#f6efe6" },
];

type Seed = {
  title: string;
  brand: string;
  categorySlug: string;
  emoji: string;
  price: number;
  mrp: number;
  ages: string[];
  badge?: Product["badge"];
  sizes?: string[];
};

const SEEDS: Seed[] = [
  { title: "Organic Cotton Full-Sleeve Romper", brand: "TinyTwig", categorySlug: "clothing/rompers-onesies", emoji: "bottle", price: 649, mrp: 1099, ages: ["0-6-months", "6-24-months"], badge: "bestseller" },
  { title: "Rainbow Stripe Cotton T-Shirt", brand: "Pumpkin Patch", categorySlug: "clothing/t-shirts", emoji: "tshirt", price: 399, mrp: 799, ages: ["2-4-years", "4-6-years"], badge: "sale" },
  { title: "Floral Tiered Party Frock", brand: "SunnyDays", categorySlug: "clothing/dresses", emoji: "dress", price: 1249, mrp: 2199, ages: ["2-4-years", "4-6-years"], badge: "new" },
  { title: "Festive Kurta Pyjama Set", brand: "Little Bear", categorySlug: "clothing/ethnic-wear", emoji: "star", price: 1499, mrp: 2499, ages: ["4-6-years", "6-10-years"] },
  { title: "Hooded Fleece Winter Jacket", brand: "Roamers", categorySlug: "clothing/winter-wear", emoji: "jacket", price: 1799, mrp: 2999, ages: ["4-6-years", "6-10-years"], badge: "limited" },
  { title: "Anti-Slip First Walker Booties", brand: "TinyTwig", categorySlug: "footwear/first-walkers", emoji: "pacifier", price: 749, mrp: 1299, ages: ["6-24-months"], sizes: ["3", "4", "5", "6"], badge: "bestseller" },
  { title: "Lightweight Everyday Sneakers", brand: "Roamers", categorySlug: "footwear/sneakers", emoji: "sneaker", price: 1299, mrp: 2199, ages: ["4-6-years", "6-10-years"], sizes: ["8", "9", "10", "11", "12"] },
  { title: "Quick-Dry Beach Floaters", brand: "SunnyDays", categorySlug: "footwear/sandals", emoji: "sandal", price: 599, mrp: 999, ages: ["2-4-years", "4-6-years"], sizes: ["6", "7", "8", "9"], badge: "sale" },
  { title: "Scuff-Proof Velcro School Shoes", brand: "Roamers", categorySlug: "footwear/school-shoes", emoji: "book", price: 1099, mrp: 1699, ages: ["6-10-years"], sizes: ["10", "11", "12", "13"] },
  { title: "Wooden Alphabet Puzzle Board", brand: "Brainy Bots", categorySlug: "toys/learning-toys", emoji: "block", price: 899, mrp: 1499, ages: ["2-4-years"], sizes: ["Standard"], badge: "bestseller" },
  { title: "STEM Magnetic Building Tiles, 60 Pc", brand: "Brainy Bots", categorySlug: "toys/learning-toys", emoji: "block", price: 1999, mrp: 3499, ages: ["4-6-years", "6-10-years"], sizes: ["60 Pieces"], badge: "new" },
  { title: "Balance Bike with Adjustable Seat", brand: "Roamers", categorySlug: "toys/ride-ons", emoji: "bike", price: 3499, mrp: 5999, ages: ["2-4-years", "4-6-years"], sizes: ["Standard"], badge: "limited" },
  { title: "100-Piece Jungle Jigsaw Puzzle", brand: "Brainy Bots", categorySlug: "toys/puzzles", emoji: "puzzle", price: 549, mrp: 899, ages: ["4-6-years", "6-10-years"], sizes: ["100 Pieces"] },
  { title: "Little Chef Wooden Kitchen Set", brand: "Pumpkin Patch", categorySlug: "toys/pretend-play", emoji: "cup", price: 2799, mrp: 4499, ages: ["2-4-years", "4-6-years"], sizes: ["Standard"], badge: "bestseller" },
  { title: "Cuddly Teddy Bear, 45 cm", brand: "CuddleNest", categorySlug: "soft-toys", emoji: "teddy", price: 999, mrp: 1799, ages: ["0-6-months", "6-24-months", "2-4-years"], sizes: ["45 cm"], badge: "bestseller" },
  { title: "Plush Bunny Sleep Companion", brand: "CuddleNest", categorySlug: "soft-toys", emoji: "bunny", price: 749, mrp: 1299, ages: ["0-6-months", "6-24-months"], sizes: ["30 cm"] },
  { title: "Ultra-Soft Pants Diapers, Pack of 62", brand: "PureDrop", categorySlug: "daily-needs/diapers", emoji: "wipes", price: 899, mrp: 1249, ages: ["6-24-months"], sizes: ["S", "M", "L", "XL"], badge: "bestseller" },
  { title: "Fragrance-Free Water Wipes, 3 x 72", brand: "PureDrop", categorySlug: "daily-needs/diapers", emoji: "wipes", price: 449, mrp: 699, ages: ["0-6-months", "6-24-months"], sizes: ["216 Wipes"], badge: "sale" },
  { title: "Anti-Colic Feeding Bottle, 250 ml", brand: "PureDrop", categorySlug: "daily-needs/feeding", emoji: "bottle", price: 549, mrp: 899, ages: ["0-6-months", "6-24-months"], sizes: ["250 ml"] },
  { title: "Spill-Proof Insulated Sipper, 400 ml", brand: "SunnyDays", categorySlug: "daily-needs/feeding", emoji: "cup", price: 699, mrp: 1099, ages: ["2-4-years", "4-6-years"], sizes: ["400 ml"], badge: "new" },
  { title: "Tear-Free Baby Shampoo, 400 ml", brand: "PureDrop", categorySlug: "daily-needs/bath", emoji: "lotion", price: 349, mrp: 549, ages: ["0-6-months", "6-24-months"], sizes: ["400 ml"] },
  { title: "Dinosaur Ergonomic School Backpack", brand: "Pumpkin Patch", categorySlug: "school-supplies", emoji: "backpack", price: 1199, mrp: 1999, ages: ["4-6-years", "6-10-years"], sizes: ["16 inch"], badge: "bestseller" },
  { title: "Leak-Proof Steel Lunch Box, 3 Tier", brand: "SunnyDays", categorySlug: "school-supplies", emoji: "lunchbox", price: 899, mrp: 1399, ages: ["4-6-years", "6-10-years"], sizes: ["900 ml"] },
  { title: "Washable Crayons & Sketch Kit", brand: "Brainy Bots", categorySlug: "school-supplies", emoji: "crayon", price: 399, mrp: 649, ages: ["2-4-years", "4-6-years"], sizes: ["48 Pieces"], badge: "sale" },
  { title: "Convertible Wooden Cot with Storage", brand: "Little Bear", categorySlug: "nursery", emoji: "crib", price: 12999, mrp: 19999, ages: ["0-6-months", "6-24-months"], sizes: ["Standard"], badge: "limited" },
  { title: "Adjustable Wooden High Chair", brand: "Little Bear", categorySlug: "nursery", emoji: "chair", price: 5499, mrp: 8999, ages: ["6-24-months", "2-4-years"], sizes: ["Standard"] },
  { title: "Gentle Massage Oil with Almond, 200 ml", brand: "PureDrop", categorySlug: "baby-care", emoji: "lotion", price: 429, mrp: 699, ages: ["0-6-months"], sizes: ["200 ml"] },
  { title: "Nourishing Baby Lotion, 300 ml", brand: "PureDrop", categorySlug: "baby-care", emoji: "lotion", price: 379, mrp: 599, ages: ["0-6-months", "6-24-months"], badge: "new", sizes: ["300 ml"] },
  { title: "Two-Piece Cotton Sleepwear Set", brand: "TinyTwig", categorySlug: "clothing/t-shirts", emoji: "moon", price: 799, mrp: 1399, ages: ["2-4-years", "4-6-years"] },
  { title: "Denim Dungaree with Tee", brand: "Pumpkin Patch", categorySlug: "clothing/rompers-onesies", emoji: "dungaree", price: 1099, mrp: 1899, ages: ["6-24-months", "2-4-years"], badge: "new" },
  { title: "Unicorn Print Cotton Leggings", brand: "SunnyDays", categorySlug: "clothing/t-shirts", emoji: "bunny", price: 449, mrp: 799, ages: ["2-4-years", "4-6-years"] },
  { title: "Musical Activity Play Gym", brand: "Brainy Bots", categorySlug: "toys/learning-toys", emoji: "robot", price: 2299, mrp: 3999, ages: ["0-6-months", "6-24-months"], sizes: ["Standard"], badge: "bestseller" },
];

const DEFAULT_SIZES = ["0-3M", "3-6M", "6-12M", "1-2Y", "2-3Y", "3-4Y", "4-5Y"];

export const products: Product[] = SEEDS.map((s, i) => {
  const colorCount = 2 + (i % 4);
  const colors = COLORS.slice(i % 3, (i % 3) + colorCount);
  const rating = Number((3.7 + ((i * 7) % 13) / 10).toFixed(1));
  const slug = s.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const leaf = s.categorySlug.split("/").pop()!.replace(/-/g, " ");

  return {
    _id: `p${i + 1}`,
    slug,
    title: s.title,
    brand: s.brand,
    categorySlug: s.categorySlug,
    ageSlugs: s.ages,
    images: [
      img(`${slug}-1`, 800, 1000, s.emoji),
      img(`${slug}-2`, 800, 1000, s.emoji),
      img(`${slug}-3`, 800, 1000, s.emoji),
      img(`${slug}-4`, 800, 1000, s.emoji),
    ],
    price: s.price,
    mrp: s.mrp,
    rating: Math.min(rating, 5),
    reviewCount: 40 + ((i * 137) % 900),
    badge: s.badge,
    colors,
    sizes: s.sizes ?? DEFAULT_SIZES,
    description:
      `${s.title} from ${s.brand}. Designed for little ones and tested for everyday use — ` +
      `soft on skin, easy to clean, and built to survive real play. A dependable pick in ${leaf}.`,
    highlights: [
      "Skin-friendly, certified non-toxic materials",
      "Machine washable and colour-fast",
      "Reinforced stitching for everyday play",
      "Age-graded and safety tested",
    ],
    safety: {
      certification: "BIS / ISO 8124 toy-safety tested",
      ageWarning: s.ages.includes("0-6-months")
        ? "Suitable from birth. Adult supervision advised."
        : "Not suitable for children under 3 — contains small parts.",
      material: "OEKO-TEX certified fabric / BPA-free plastic",
    },
    inStock: i % 11 !== 7,
    createdAt: new Date(2025, 11 - (i % 10), 1 + (i % 27)).toISOString(),
  };
});

/* -------------------------------------------------------------- banners */

export const banners: Banner[] = [
  {
    _id: "bn1",
    title: "The Big Kids Carnival",
    subtitle: "Up to 70% off across clothing, toys and footwear. Two days only.",
    cta: "Shop the Carnival",
    href: "/deals",
    image: img("carnival-banner", 900, 700, "gift"),
    gradient: "from-brand-400 via-brand-500 to-grape-500",
    align: "left",
  },
  {
    _id: "bn2",
    title: "Newborn Essentials Box",
    subtitle: "Everything for the first 6 months, bundled and delivered free.",
    cta: "Build Your Box",
    href: "/category/daily-needs",
    image: img("newborn-banner", 900, 700, "bottle"),
    gradient: "from-mint-400 via-mint-500 to-sky-ks",
    align: "right",
  },
  {
    _id: "bn3",
    title: "Back to School, Sorted",
    subtitle: "Bags, bottles, shoes and stationery from ₹299.",
    cta: "Shop School Store",
    href: "/category/school-supplies",
    image: img("school-banner", 900, 700, "backpack"),
    gradient: "from-sun-400 via-sun-500 to-brand-400",
    align: "left",
  },
  {
    _id: "bn4",
    title: "Playroom Restock",
    subtitle: "STEM kits, puzzles and ride-ons your kid will not outgrow next month.",
    cta: "Explore Toys",
    href: "/category/toys",
    image: img("toys-banner", 900, 700, "teddy"),
    gradient: "from-grape-500 via-grape-600 to-sky-ks",
    align: "right",
  },
];

/* ---------------------------------------------------------------- deals */

/** Deals end at a fixed clock time today so SSR and the client agree. */
const endsAt = (hoursFromMidnight: number) => {
  const d = new Date();
  d.setHours(hoursFromMidnight, 0, 0, 0);
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  return d.toISOString();
};

export const deals: Deal[] = [
  { _id: "d1", title: "Rompers & Onesies", discountLabel: "Flat 60% Off", href: "/category/clothing", image: img("deal-rompers", 500, 500, "bottle"), accent: "bg-brand-100", endsAt: endsAt(22) },
  { _id: "d2", title: "Learning Toys", discountLabel: "Up to 55% Off", href: "/category/toys", image: img("deal-toys", 500, 500, "puzzle"), accent: "bg-sun-100", endsAt: endsAt(22) },
  { _id: "d3", title: "Diapers & Wipes", discountLabel: "Buy 2 Get 1", href: "/category/daily-needs", image: img("deal-diapers", 500, 500, "wipes"), accent: "bg-mint-100", endsAt: endsAt(22) },
  { _id: "d4", title: "School Backpacks", discountLabel: "From ₹599", href: "/category/school-supplies", image: img("deal-bags", 500, 500, "backpack"), accent: "bg-grape-100", endsAt: endsAt(22) },
  { _id: "d5", title: "Soft Toys", discountLabel: "Flat 50% Off", href: "/category/soft-toys", image: img("deal-soft", 500, 500, "teddy"), accent: "bg-brand-100", endsAt: endsAt(22) },
  { _id: "d6", title: "Kids Sneakers", discountLabel: "Up to 45% Off", href: "/category/footwear", image: img("deal-shoes", 500, 500, "sneaker", ), accent: "bg-sun-100", endsAt: endsAt(22) },
];

/* ------------------------------------------------------------- readers */
/* Signatures below are what the Mongoose layer will implement verbatim. */

export async function getTopCategories(): Promise<Category[]> {
  return topCategories;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return categories.find((c) => c.slug === slug) ?? null;
}

export async function getSubcategories(parentSlug: string): Promise<Category[]> {
  return categories.filter((c) => c.parent === parentSlug);
}

export async function getAllCategories(): Promise<Category[]> {
  return categories;
}

export async function getBanners(): Promise<Banner[]> {
  return banners;
}

export async function getDeals(): Promise<Deal[]> {
  return deals;
}

export async function getBrands(): Promise<Brand[]> {
  return brands;
}

export async function getAgeGroups(): Promise<AgeGroup[]> {
  return ageGroups;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return products.find((p) => p.slug === slug) ?? null;
}

export async function getAllProducts(): Promise<Product[]> {
  return products;
}

export type ProductQuery = {
  category?: string;
  age?: string;
  brand?: string[];
  minPrice?: number;
  maxPrice?: number;
  q?: string;
  sort?: "popular" | "new" | "price-asc" | "price-desc" | "rating";
  badge?: Product["badge"];
};

export async function getProducts(query: ProductQuery = {}): Promise<Product[]> {
  let out = [...products];

  if (query.category) {
    // A parent slug ("toys") must also match its children ("toys/puzzles").
    out = out.filter(
      (p) =>
        p.categorySlug === query.category ||
        p.categorySlug.startsWith(`${query.category}/`),
    );
  }
  if (query.age) out = out.filter((p) => p.ageSlugs.includes(query.age!));
  if (query.brand?.length) out = out.filter((p) => query.brand!.includes(p.brand));
  if (query.badge) out = out.filter((p) => p.badge === query.badge);
  if (query.minPrice != null) out = out.filter((p) => p.price >= query.minPrice!);
  if (query.maxPrice != null) out = out.filter((p) => p.price <= query.maxPrice!);

  if (query.q) {
    const needle = query.q.toLowerCase();
    out = out.filter(
      (p) =>
        p.title.toLowerCase().includes(needle) ||
        p.brand.toLowerCase().includes(needle) ||
        p.categorySlug.toLowerCase().includes(needle),
    );
  }

  switch (query.sort) {
    case "price-asc": out.sort((a, b) => a.price - b.price); break;
    case "price-desc": out.sort((a, b) => b.price - a.price); break;
    case "rating": out.sort((a, b) => b.rating - a.rating); break;
    case "new": out.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)); break;
    default: out.sort((a, b) => b.reviewCount - a.reviewCount);
  }
  return out;
}

export async function getRelatedProducts(
  product: Product,
  limit = 6,
): Promise<Product[]> {
  const parent = product.categorySlug.split("/")[0];
  return products
    .filter((p) => p._id !== product._id && p.categorySlug.startsWith(parent))
    .slice(0, limit);
}

export async function getSearchSuggestions(q: string): Promise<string[]> {
  if (!q.trim()) return [];
  const needle = q.toLowerCase();
  const hits = new Set<string>();
  for (const p of products) {
    if (p.title.toLowerCase().includes(needle)) hits.add(p.title);
    if (p.brand.toLowerCase().includes(needle)) hits.add(p.brand);
    if (hits.size >= 8) break;
  }
  return [...hits];
}

/* ------------------------------------------------------------- helpers */

export const discountPct = (mrp: number, price: number) =>
  Math.round(((mrp - price) / mrp) * 100);

export const inr = (n: number) =>
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export function categoryTrail(slug: string): Category[] {
  const parts = slug.split("/");
  const trail: Category[] = [];
  for (let i = 0; i < parts.length; i++) {
    const s = parts.slice(0, i + 1).join("/");
    const found = categories.find((c) => c.slug === s);
    if (found) trail.push(found);
  }
  return trail;
}
