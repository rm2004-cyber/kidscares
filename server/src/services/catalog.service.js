import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";
import { Brand } from "../models/Brand.js";
import { AgeGroup } from "../models/AgeGroup.js";
import { ApiError } from "../utils/ApiError.js";
import { uniqueSlug } from "../utils/slugify.js";

const SORTS = {
  popular: { reviewCount: -1, rating: -1 },
  new: { createdAt: -1 },
  "price-asc": { price: 1 },
  "price-desc": { price: -1 },
  rating: { rating: -1 },
};

/**
 * Builds the Mongo filter for a product listing.
 *
 * A parent category must also match its children, so "toys" returns
 * "toys/puzzles" too — done with an anchored regex against the indexed
 * `categorySlug` rather than a lookup on the category tree.
 */
function buildFilter(q = {}) {
  const filter = { isActive: true };

  if (q.category) {
    filter.categorySlug = {
      $in: [q.category],
      $regex: `^${escapeRe(q.category)}(/|$)`,
    };
    delete filter.categorySlug.$in;
  }
  if (q.age) filter.ageSlugs = q.age;
  if (q.brand?.length) filter.brand = { $in: [].concat(q.brand) };
  if (q.badge) filter.badge = q.badge;
  if (q.inStock === true) filter.inStock = true;

  if (q.minPrice != null || q.maxPrice != null) {
    filter.price = {};
    if (q.minPrice != null) filter.price.$gte = Number(q.minPrice);
    if (q.maxPrice != null) filter.price.$lte = Number(q.maxPrice);
  }

  if (q.q) filter.$text = { $search: q.q };

  return filter;
}

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function listProducts(query, { page, limit, skip }) {
  const filter = buildFilter(query);
  const sort = SORTS[query.sort] ?? SORTS.popular;

  const [items, total] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  return { items, total, page, limit };
}

export async function getProductBySlug(slug) {
  const product = await Product.findOne({ slug, isActive: true }).lean();
  if (!product) throw ApiError.notFound("Product not found");
  return product;
}

export async function getRelatedProducts(product, limit = 10) {
  const parent = product.categorySlug.split("/")[0];
  return Product.find({
    _id: { $ne: product._id },
    isActive: true,
    categorySlug: { $regex: `^${escapeRe(parent)}(/|$)` },
  })
    .sort({ reviewCount: -1 })
    .limit(limit)
    .lean();
}

export async function searchSuggestions(term, limit = 8) {
  if (!term?.trim()) return [];
  const rx = new RegExp(escapeRe(term.trim()), "i");
  const rows = await Product.find(
    { isActive: true, $or: [{ title: rx }, { brand: rx }] },
    { title: 1, slug: 1, brand: 1, images: { $slice: 1 } },
  )
    .limit(limit)
    .lean();
  return rows;
}

export async function createProduct(data) {
  const slug = await uniqueSlug(Product, data.slug || data.title);
  return Product.create({ ...data, slug });
}

export async function updateProduct(id, data) {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound("Product not found");

  if (data.slug && data.slug !== product.slug) {
    data.slug = await uniqueSlug(Product, data.slug, product._id);
  }
  Object.assign(product, data);
  await product.save();
  return product;
}

export async function deleteProduct(id) {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound("Product not found");
  // Soft delete: an order references this document, and the URL should 410
  // rather than 404 into a broken link.
  product.isActive = false;
  await product.save();
  return { ok: true };
}

/* ─────────────────────────────── categories ───────────────────────────── */

export async function listCategories({ parent, activeOnly = true } = {}) {
  const filter = {};
  if (activeOnly) filter.isActive = true;
  if (parent !== undefined) filter.parent = parent;
  return Category.find(filter).sort({ order: 1, name: 1 }).lean();
}

export async function getCategoryBySlug(slug) {
  const category = await Category.findOne({ slug, isActive: true }).lean();
  if (!category) throw ApiError.notFound("Category not found");
  return category;
}

export async function createCategory(data) {
  const base = data.parent ? `${data.parent}/${data.slug || data.name}` : data.slug || data.name;
  const slug = await uniqueSlug(Category, base);
  return Category.create({ ...data, slug });
}

export async function updateCategory(id, data) {
  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound("Category not found");
  if (data.slug && data.slug !== category.slug) {
    data.slug = await uniqueSlug(Category, data.slug, category._id);
  }
  Object.assign(category, data);
  await category.save();
  return category;
}

export async function deleteCategory(id) {
  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound("Category not found");

  const childCount = await Category.countDocuments({ parent: category.slug });
  if (childCount) {
    throw ApiError.badRequest("Move or delete the subcategories first.");
  }
  const productCount = await Product.countDocuments({ categorySlug: category.slug });
  if (productCount) {
    throw ApiError.badRequest(`${productCount} products still use this category.`);
  }

  await category.deleteOne();
  return { ok: true };
}

/** Recomputes the denormalised counters after a bulk catalogue change. */
export async function refreshCategoryCounts() {
  const categories = await Category.find({}, { slug: 1 }).lean();
  await Promise.all(
    categories.map(async (c) => {
      const count = await Product.countDocuments({
        isActive: true,
        categorySlug: { $regex: `^${escapeRe(c.slug)}(/|$)` },
      });
      await Category.updateOne({ _id: c._id }, { productCount: count });
    }),
  );
  return { updated: categories.length };
}

/* ───────────────────────────── brands & ages ──────────────────────────── */

export const listBrands = () => Brand.find({ isActive: true }).sort({ order: 1, name: 1 }).lean();

export async function createBrand(data) {
  const slug = await uniqueSlug(Brand, data.slug || data.name);
  return Brand.create({ ...data, slug });
}

export async function updateBrand(id, data) {
  const brand = await Brand.findById(id);
  if (!brand) throw ApiError.notFound("Brand not found");
  if (data.slug && data.slug !== brand.slug) {
    data.slug = await uniqueSlug(Brand, data.slug, brand._id);
  }
  Object.assign(brand, data);
  await brand.save();
  return brand;
}

export async function deleteBrand(id) {
  const brand = await Brand.findById(id);
  if (!brand) throw ApiError.notFound("Brand not found");
  const inUse = await Product.countDocuments({ brand: brand.name, isActive: true });
  if (inUse) throw ApiError.badRequest(`${inUse} products still use this brand.`);
  await brand.deleteOne();
  return { ok: true };
}

export const listAgeGroups = () =>
  AgeGroup.find({ isActive: true }).sort({ order: 1, minMonths: 1 }).lean();

export const catalogService = {
  listProducts,
  getProductBySlug,
  getRelatedProducts,
  searchSuggestions,
  createProduct,
  updateProduct,
  deleteProduct,
  listCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  refreshCategoryCounts,
  listBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  listAgeGroups,
};
