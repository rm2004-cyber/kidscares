import { connectDB, disconnectDB } from "../config/db.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

import { AdminUser } from "../models/AdminUser.js";
import { AgeGroup } from "../models/AgeGroup.js";
import { Brand } from "../models/Brand.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { Banner } from "../models/Banner.js";
import { Deal } from "../models/Deal.js";
import { Coupon } from "../models/Coupon.js";
import { Settings } from "../models/Settings.js";
import { refreshCategoryCounts } from "../services/catalog.service.js";

/**
 * Idempotent seed: safe to re-run. Uses upserts keyed on the natural unique
 * field, so it tops up a partially-seeded database instead of duplicating.
 * Pass --fresh to wipe the catalogue first.
 */

const img = (seed, w, h, glyph) =>
  `/api/placeholder?w=${w}&h=${h}&seed=${encodeURIComponent(seed)}&glyph=${glyph}`;

const AGES = [
  ["0-6-months", "0–6 Months", 0, 6, "pacifier"],
  ["6-24-months", "6–24 Months", 6, 24, "bottle"],
  ["2-4-years", "2–4 Years", 24, 48, "teddy"],
  ["4-6-years", "4–6 Years", 48, 72, "block"],
  ["6-10-years", "6–10 Years", 72, 120, "backpack"],
  ["10-plus-years", "10+ Years", 120, 216, "bike"],
];

const BRANDS = [
  ["TinyTwig", "leaf"], ["Pumpkin Patch", "gift"], ["Little Bear", "teddy"],
  ["SunnyDays", "star"], ["Brainy Bots", "robot"], ["CuddleNest", "bunny"],
  ["Roamers", "boot"], ["PureDrop", "droplet"],
];

const TOP_CATEGORIES = [
  ["clothing", "Clothing", "tshirt", "brand", "Soft, skin-friendly everyday wear — rompers, sets, ethnic and party picks for every age."],
  ["footwear", "Footwear", "sneaker", "sky", "First-walker shoes, school shoes, sandals and sneakers with flexible, non-slip soles."],
  ["toys", "Toys", "block", "sun", "Learning toys, ride-ons, puzzles and pretend play — every item age-graded and safety tested."],
  ["soft-toys", "Soft Toys", "teddy", "grape", "Huggable plush friends in hypoallergenic, machine-washable fabrics."],
  ["daily-needs", "Daily Needs", "bottle", "mint", "Diapers, wipes, feeding and bath essentials — the restock run, sorted."],
  ["baby-care", "Baby Care", "lotion", "brand", "Gentle lotions, shampoos and skincare made for newborn skin."],
  ["school-supplies", "School & Stationery", "backpack", "sky", "Backpacks, lunch kits, bottles and art supplies built to survive a school year."],
  ["nursery", "Nursery & Furniture", "crib", "grape", "Cots, high chairs, storage and room décor that grow with your little one."],
];

const SUB_CATEGORIES = [
  ["clothing/rompers-onesies", "Rompers & Onesies", "clothing", "bottle", "brand"],
  ["clothing/t-shirts", "T-Shirts & Tops", "clothing", "tshirt", "mint"],
  ["clothing/dresses", "Dresses & Frocks", "clothing", "dress", "grape"],
  ["clothing/ethnic-wear", "Ethnic Wear", "clothing", "star", "sun"],
  ["clothing/winter-wear", "Winter Wear", "clothing", "jacket", "sky"],
  ["footwear/first-walkers", "First Walkers", "footwear", "sock", "mint"],
  ["footwear/sneakers", "Sneakers", "footwear", "sneaker", "brand"],
  ["footwear/sandals", "Sandals & Floaters", "footwear", "sandal", "sun"],
  ["footwear/school-shoes", "School Shoes", "footwear", "boot", "sky"],
  ["toys/learning-toys", "Learning & STEM", "toys", "puzzle", "sky"],
  ["toys/ride-ons", "Ride-Ons & Outdoor", "toys", "bike", "brand"],
  ["toys/puzzles", "Puzzles & Board Games", "toys", "puzzle", "grape"],
  ["toys/pretend-play", "Pretend Play", "toys", "robot", "sun"],
  ["daily-needs/diapers", "Diapers & Wipes", "daily-needs", "wipes", "mint"],
  ["daily-needs/feeding", "Feeding & Nursing", "daily-needs", "bottle", "brand"],
  ["daily-needs/bath", "Bath & Hygiene", "daily-needs", "droplet", "sky"],
];

const PRODUCTS = [
  ["Organic Cotton Full-Sleeve Romper", "TinyTwig", "clothing/rompers-onesies", "bottle", 649, 1099, ["0-6-months", "6-24-months"], "bestseller"],
  ["Rainbow Stripe Cotton T-Shirt", "Pumpkin Patch", "clothing/t-shirts", "tshirt", 399, 799, ["2-4-years", "4-6-years"], "sale"],
  ["Floral Tiered Party Frock", "SunnyDays", "clothing/dresses", "dress", 1249, 2199, ["2-4-years", "4-6-years"], "new"],
  ["Festive Kurta Pyjama Set", "Little Bear", "clothing/ethnic-wear", "star", 1499, 2499, ["4-6-years", "6-10-years"], ""],
  ["Hooded Fleece Winter Jacket", "Roamers", "clothing/winter-wear", "jacket", 1799, 2999, ["4-6-years", "6-10-years"], "limited"],
  ["Anti-Slip First Walker Booties", "TinyTwig", "footwear/first-walkers", "sock", 749, 1299, ["6-24-months"], "bestseller"],
  ["Lightweight Everyday Sneakers", "Roamers", "footwear/sneakers", "sneaker", 1299, 2199, ["4-6-years", "6-10-years"], ""],
  ["Quick-Dry Beach Floaters", "SunnyDays", "footwear/sandals", "sandal", 599, 999, ["2-4-years", "4-6-years"], "sale"],
  ["Scuff-Proof Velcro School Shoes", "Roamers", "footwear/school-shoes", "boot", 1099, 1699, ["6-10-years"], ""],
  ["Wooden Alphabet Puzzle Board", "Brainy Bots", "toys/learning-toys", "puzzle", 899, 1499, ["2-4-years"], "bestseller"],
  ["STEM Magnetic Building Tiles, 60 Pc", "Brainy Bots", "toys/learning-toys", "block", 1999, 3499, ["4-6-years", "6-10-years"], "new"],
  ["Balance Bike with Adjustable Seat", "Roamers", "toys/ride-ons", "bike", 3499, 5999, ["2-4-years", "4-6-years"], "limited"],
  ["100-Piece Jungle Jigsaw Puzzle", "Brainy Bots", "toys/puzzles", "puzzle", 549, 899, ["4-6-years", "6-10-years"], ""],
  ["Little Chef Wooden Kitchen Set", "Pumpkin Patch", "toys/pretend-play", "cup", 2799, 4499, ["2-4-years", "4-6-years"], "bestseller"],
  ["Cuddly Teddy Bear, 45 cm", "CuddleNest", "soft-toys", "teddy", 999, 1799, ["0-6-months", "6-24-months", "2-4-years"], "bestseller"],
  ["Plush Bunny Sleep Companion", "CuddleNest", "soft-toys", "bunny", 749, 1299, ["0-6-months", "6-24-months"], ""],
  ["Ultra-Soft Pants Diapers, Pack of 62", "PureDrop", "daily-needs/diapers", "wipes", 899, 1249, ["6-24-months"], "bestseller"],
  ["Fragrance-Free Water Wipes, 3 x 72", "PureDrop", "daily-needs/diapers", "wipes", 449, 699, ["0-6-months", "6-24-months"], "sale"],
  ["Anti-Colic Feeding Bottle, 250 ml", "PureDrop", "daily-needs/feeding", "bottle", 549, 899, ["0-6-months", "6-24-months"], ""],
  ["Spill-Proof Insulated Sipper, 400 ml", "SunnyDays", "daily-needs/feeding", "cup", 699, 1099, ["2-4-years", "4-6-years"], "new"],
  ["Tear-Free Baby Shampoo, 400 ml", "PureDrop", "daily-needs/bath", "lotion", 349, 549, ["0-6-months", "6-24-months"], ""],
  ["Dinosaur Ergonomic School Backpack", "Pumpkin Patch", "school-supplies", "backpack", 1199, 1999, ["4-6-years", "6-10-years"], "bestseller"],
  ["Leak-Proof Steel Lunch Box, 3 Tier", "SunnyDays", "school-supplies", "lunchbox", 899, 1399, ["4-6-years", "6-10-years"], ""],
  ["Washable Crayons & Sketch Kit", "Brainy Bots", "school-supplies", "crayon", 399, 649, ["2-4-years", "4-6-years"], "sale"],
  ["Convertible Wooden Cot with Storage", "Little Bear", "nursery", "crib", 12999, 19999, ["0-6-months", "6-24-months"], "limited"],
  ["Adjustable Wooden High Chair", "Little Bear", "nursery", "chair", 5499, 8999, ["6-24-months", "2-4-years"], ""],
  ["Gentle Massage Oil with Almond, 200 ml", "PureDrop", "baby-care", "lotion", 429, 699, ["0-6-months"], ""],
  ["Nourishing Baby Lotion, 300 ml", "PureDrop", "baby-care", "lotion", 379, 599, ["0-6-months", "6-24-months"], "new"],
  ["Two-Piece Cotton Sleepwear Set", "TinyTwig", "clothing/t-shirts", "moon", 799, 1399, ["2-4-years", "4-6-years"], ""],
  ["Denim Dungaree with Tee", "Pumpkin Patch", "clothing/rompers-onesies", "dungaree", 1099, 1899, ["6-24-months", "2-4-years"], "new"],
  ["Musical Activity Play Gym", "Brainy Bots", "toys/learning-toys", "robot", 2299, 3999, ["0-6-months", "6-24-months"], "bestseller"],
];

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const DEFAULT_SIZES = ["0-3M", "3-6M", "6-12M", "1-2Y", "2-3Y", "3-4Y", "4-5Y"];
const COLORS = [
  { name: "Coral", hex: "#f74d3f" }, { name: "Mint", hex: "#38d391" },
  { name: "Sunshine", hex: "#ffc531" }, { name: "Grape", hex: "#7c53f5" },
  { name: "Sky", hex: "#34a6e8" }, { name: "Blush", hex: "#ff9cc0" },
];

async function run() {
  const fresh = process.argv.includes("--fresh");
  await connectDB();

  if (fresh) {
    logger.warn("--fresh: clearing catalogue collections");
    await Promise.all([
      Product.deleteMany({}), Category.deleteMany({}), Brand.deleteMany({}),
      AgeGroup.deleteMany({}), Banner.deleteMany({}), Deal.deleteMany({}),
      Coupon.deleteMany({}),
    ]);
  }

  /* ── admin ── */
  let admin = await AdminUser.findOne({ email: env.seedAdmin.email.toLowerCase() });
  if (!admin) {
    admin = new AdminUser({
      name: env.seedAdmin.name,
      email: env.seedAdmin.email.toLowerCase(),
      role: "owner",
    });
    await admin.setPassword(env.seedAdmin.password);
    await admin.save();
    logger.success(`Admin created → ${admin.email} / ${env.seedAdmin.password}`);
  } else {
    logger.info(`Admin already exists → ${admin.email}`);
  }

  /* ── taxonomy ── */
  await Promise.all(
    AGES.map(([slug, label, minMonths, maxMonths, glyph], order) =>
      AgeGroup.updateOne({ slug }, { slug, label, minMonths, maxMonths, glyph, order }, { upsert: true }),
    ),
  );

  await Promise.all(
    BRANDS.map(([name, glyph], order) =>
      Brand.updateOne(
        { slug: slugify(name) },
        { slug: slugify(name), name, order, logo: { url: img(slugify(name), 200, 120, glyph) } },
        { upsert: true },
      ),
    ),
  );

  await Promise.all(
    TOP_CATEGORIES.map(([slug, name, glyph, accent, blurb], order) =>
      Category.updateOne(
        { slug },
        { slug, name, parent: null, glyph, accent, blurb, order, image: { url: img(slug, 400, 400, glyph) } },
        { upsert: true },
      ),
    ),
  );

  await Promise.all(
    SUB_CATEGORIES.map(([slug, name, parent, glyph, accent], order) =>
      Category.updateOne(
        { slug },
        { slug, name, parent, glyph, accent, order, image: { url: img(slug, 400, 400, glyph) } },
        { upsert: true },
      ),
    ),
  );

  /* ── products ── */
  for (const [i, [title, brand, categorySlug, glyph, price, mrp, ages, badge]] of PRODUCTS.entries()) {
    const slug = slugify(title);
    const colors = COLORS.slice(i % 3, (i % 3) + 2 + (i % 3));
    const leaf = categorySlug.split("/").pop().replace(/-/g, " ");

    await Product.updateOne(
      { slug },
      {
        slug, title, brand, categorySlug, ageSlugs: ages, badge,
        price, mrp,
        images: [1, 2, 3, 4].map((n) => ({ url: img(`${slug}-${n}`, 800, 1000, glyph) })),
        colors,
        sizes: DEFAULT_SIZES,
        description:
          `${title} from ${brand}. Designed for little ones and tested for everyday use — ` +
          `soft on skin, easy to clean, and built to survive real play. A dependable pick in ${leaf}.`,
        highlights: [
          "Skin-friendly, certified non-toxic materials",
          "Machine washable and colour-fast",
          "Reinforced stitching for everyday play",
          "Age-graded and safety tested",
        ],
        safety: {
          certification: "BIS / ISO 8124 toy-safety tested",
          ageWarning: ages.includes("0-6-months")
            ? "Suitable from birth. Adult supervision advised."
            : "Not suitable for children under 3 — contains small parts.",
          material: "OEKO-TEX certified fabric / BPA-free plastic",
        },
        /* Seeded with no rating on purpose. A fake average would be
           overwritten by the first real review anyway, and showing invented
           social proof on a live store is worse than showing none. */
        rating: 0,
        reviewCount: 0,
        stock: i % 11 === 7 ? 0 : 25 + (i % 40),
        inStock: i % 11 !== 7,
      },
      { upsert: true },
    );
  }

  /* ── merchandising ── */
  const BANNERS = [
    ["The Big Kids Carnival", "Up to 70% off across clothing, toys and footwear. Two days only.", "Shop the Carnival", "/deals", "from-brand-400 via-brand-500 to-grape-500", "left", "gift"],
    ["Newborn Essentials Box", "Everything for the first 6 months, bundled and delivered free.", "Build Your Box", "/category/daily-needs", "from-mint-400 via-mint-500 to-sky-ks", "right", "bottle"],
    ["Back to School, Sorted", "Bags, bottles, shoes and stationery from ₹299.", "Shop School Store", "/category/school-supplies", "from-sun-400 via-sun-500 to-brand-400", "left", "backpack"],
    ["Playroom Restock", "STEM kits, puzzles and ride-ons your kid will not outgrow next month.", "Explore Toys", "/category/toys", "from-grape-500 via-grape-600 to-sky-ks", "right", "teddy"],
  ];
  for (const [order, [title, subtitle, cta, href, gradient, align, glyph]] of BANNERS.entries()) {
    await Banner.updateOne(
      { title },
      { title, subtitle, cta, href, gradient, align, order, placement: "hero", image: { url: img(`banner-${order}`, 900, 700, glyph) } },
      { upsert: true },
    );
  }

  const endOfDay = new Date();
  endOfDay.setHours(22, 0, 0, 0);
  if (endOfDay < new Date()) endOfDay.setDate(endOfDay.getDate() + 1);

  const DEALS = [
    ["Rompers & Onesies", "Flat 60% Off", "/category/clothing", "bg-brand-100", "bottle"],
    ["Learning Toys", "Up to 55% Off", "/category/toys", "bg-sun-100", "puzzle"],
    ["Diapers & Wipes", "Buy 2 Get 1", "/category/daily-needs", "bg-mint-100", "wipes"],
    ["School Backpacks", "From ₹599", "/category/school-supplies", "bg-grape-100", "backpack"],
    ["Soft Toys", "Flat 50% Off", "/category/soft-toys", "bg-brand-100", "teddy"],
    ["Kids Sneakers", "Up to 45% Off", "/category/footwear", "bg-sun-100", "sneaker"],
  ];
  for (const [order, [title, discountLabel, href, accent, glyph]] of DEALS.entries()) {
    await Deal.updateOne(
      { title },
      { title, discountLabel, href, accent, order, endsAt: endOfDay, image: { url: img(`deal-${order}`, 500, 500, glyph) } },
      { upsert: true },
    );
  }

  const day = 86_400_000;
  const COUPONS = [
    ["HELLOKIDS", "10% off your first order", "Valid on your first KidsCares order.", "percent", 10, 500, 499, "", 30, true],
    ["TOYS300", "Flat ₹300 off on toys", "Applies to any order from the Toys aisle above ₹1,499.", "flat", 300, 0, 1499, "toys", 12, false],
    ["FREESHIP", "Free delivery, no minimum", "Waives the delivery charge on any order.", "shipping", 0, 0, 0, "", 6, false],
    ["WINTER20", "20% off winter wear", "Jackets, sweaters and thermals. Up to ₹800 off.", "percent", 20, 800, 999, "clothing", 21, false],
    ["BULK15", "15% off on 4+ items", "Save when your bag has four or more items.", "percent", 15, 1200, 2499, "", 45, false],
    ["NEWBORN250", "₹250 off newborn essentials", "Diapers, wipes and feeding, above ₹1,299.", "flat", 250, 0, 1299, "daily-needs", 9, false],
  ];
  for (const [code, title, description, type, value, maxDiscount, minOrder, category, days, featured] of COUPONS) {
    await Coupon.updateOne(
      { code },
      { code, title, description, type, value, maxDiscount, minOrder, category, featured, expiresAt: new Date(Date.now() + days * day) },
      { upsert: true },
    );
  }

  await Settings.getSite();
  const counts = await refreshCategoryCounts();

  logger.success(
    `Seed complete — ${PRODUCTS.length} products, ${TOP_CATEGORIES.length + SUB_CATEGORIES.length} categories, ${counts.updated} counters refreshed`,
  );

  await disconnectDB();
  process.exit(0);
}

run().catch(async (err) => {
  logger.error("Seed failed:", err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
