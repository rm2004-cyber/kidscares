import { HomeSection } from "../models/HomeSection.js";
import { Product } from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Home page rows and the products inside them.
 *
 * Each row declares where its products come from, so the storefront asks for
 * "the sections" rather than knowing that Playroom Picks means toys. Renaming
 * a row, repointing it, or adding a new one is then an admin action instead of
 * a deploy.
 */

const SORTS = {
  popular: { reviewCount: -1, rating: -1 },
  new: { createdAt: -1 },
  rating: { rating: -1 },
  "price-asc": { price: 1 },
  "price-desc": { price: -1 },
};

/** Only ever show things a shopper can actually buy into. */
const VISIBLE = { isActive: { $ne: false } };

/**
 * Resolves one section to its products.
 *
 * A manual row keeps the order the admin arranged; every other source is
 * sorted by the row's own `sortBy`.
 */
async function resolveProducts(section) {
  const limit = section.limit ?? 10;

  if (section.source === "manual") {
    const products = await Product.find({ ...VISIBLE, sections: section._id })
      .limit(limit)
      .lean();
    return products;
  }

  const filter = { ...VISIBLE };
  if (section.source === "category") {
    if (!section.categorySlug) return [];
    /* Match the aisle and everything beneath it — "toys" should include
       "toys/puzzles", the same way the category pages behave. */
    filter.$or = [
      { categorySlug: section.categorySlug },
      { categorySlug: new RegExp(`^${section.categorySlug}/`) },
    ];
  } else if (section.source === "badge") {
    if (!section.badge) return [];
    filter.badge = section.badge;
  }

  const sort = SORTS[section.sortBy] ?? SORTS.popular;
  return Product.find(filter).sort(sort).limit(limit).lean();
}

/**
 * Every visible section with its products, ready for the home page.
 *
 * Rows that resolve to nothing are dropped rather than rendered empty — a
 * heading with no products under it reads as a broken page, and it is exactly
 * what happens when a category is renamed out from under a row.
 */
export async function getHomeSections() {
  const sections = await HomeSection.find({ isActive: true })
    .sort({ order: 1, createdAt: 1 })
    .lean();

  const withProducts = await Promise.all(
    sections.map(async (s) => ({ ...s, products: await resolveProducts(s) })),
  );

  return withProducts.filter((s) => s.products.length > 0);
}

/* ─────────────────────────────── admin ────────────────────────────────── */

/** Admin list — inactive rows included, plus a count so empties are visible. */
export async function listSections() {
  const sections = await HomeSection.find().sort({ order: 1, createdAt: 1 }).lean();
  return Promise.all(
    sections.map(async (s) => ({
      ...s,
      productCount: (await resolveProducts(s)).length,
    })),
  );
}

export async function createSection(data) {
  return HomeSection.create(data);
}

export async function updateSection(id, data) {
  const section = await HomeSection.findById(id);
  if (!section) throw ApiError.notFound("Section not found");
  Object.assign(section, data);
  await section.save();
  return section;
}

export async function deleteSection(id) {
  const section = await HomeSection.findById(id);
  if (!section) throw ApiError.notFound("Section not found");

  /* Leaving the id behind on products would make it reappear if the id were
     ever reused, and clutters every product document meanwhile. */
  await Product.updateMany({ sections: section._id }, { $pull: { sections: section._id } });
  await section.deleteOne();
  return { ok: true };
}

/** Sections a product is pinned to — powers the picker in the product form. */
export async function listManualSections() {
  return HomeSection.find({ source: "manual" }).sort({ order: 1 }).select("title").lean();
}

export const homeSectionService = {
  getHomeSections,
  listSections,
  createSection,
  updateSection,
  deleteSection,
  listManualSections,
};
