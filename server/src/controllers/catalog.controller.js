import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created, paginated } from "../utils/response.js";
import { readPaging } from "../utils/pagination.js";
import { catalogService } from "../services/catalog.service.js";

export const listProducts = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? req.query;
  const paging = readPaging(query);
  const { items, total } = await catalogService.listProducts(query, paging);
  return paginated(res, items, { ...paging, total });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await catalogService.getProductBySlug(req.params.slug);
  const related = await catalogService.getRelatedProducts(product, 10);
  return ok(res, { product, related });
});

export const suggestions = asyncHandler(async (req, res) =>
  ok(res, await catalogService.searchSuggestions(req.query.q)),
);

export const createProduct = asyncHandler(async (req, res) =>
  created(res, await catalogService.createProduct(req.body)),
);

export const updateProduct = asyncHandler(async (req, res) =>
  ok(res, await catalogService.updateProduct(req.params.id, req.body)),
);

export const deleteProduct = asyncHandler(async (req, res) =>
  ok(res, await catalogService.deleteProduct(req.params.id)),
);

/* ─────────────────────────────── categories ───────────────────────────── */

export const listCategories = asyncHandler(async (req, res) => {
  const parent = req.query.parent === "root" ? null : req.query.parent;
  return ok(res, await catalogService.listCategories({ parent }));
});

export const getCategory = asyncHandler(async (req, res) => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug.join("/") : req.params[0];
  const category = await catalogService.getCategoryBySlug(slug);
  const children = await catalogService.listCategories({ parent: category.slug });
  return ok(res, { category, children });
});

/* Admin sees inactive groups too, so they can be turned back on. */
export const listAgeGroupsAdmin = asyncHandler(async (_req, res) =>
  ok(res, await catalogService.listAgeGroups({ activeOnly: false })),
);

export const createAgeGroup = asyncHandler(async (req, res) =>
  created(res, await catalogService.createAgeGroup(req.body)),
);

export const updateAgeGroup = asyncHandler(async (req, res) =>
  ok(res, await catalogService.updateAgeGroup(req.params.id, req.body)),
);

export const deleteAgeGroup = asyncHandler(async (req, res) =>
  ok(res, await catalogService.deleteAgeGroup(req.params.id)),
);

export const createCategory = asyncHandler(async (req, res) =>
  created(res, await catalogService.createCategory(req.body)),
);

export const updateCategory = asyncHandler(async (req, res) =>
  ok(res, await catalogService.updateCategory(req.params.id, req.body)),
);

export const deleteCategory = asyncHandler(async (req, res) =>
  ok(res, await catalogService.deleteCategory(req.params.id)),
);

export const refreshCounts = asyncHandler(async (_req, res) =>
  ok(res, await catalogService.refreshCategoryCounts()),
);

/* ───────────────────────────── brands & ages ──────────────────────────── */

export const listBrands = asyncHandler(async (_req, res) =>
  ok(res, await catalogService.listBrands()),
);

export const createBrand = asyncHandler(async (req, res) =>
  created(res, await catalogService.createBrand(req.body)),
);

export const updateBrand = asyncHandler(async (req, res) =>
  ok(res, await catalogService.updateBrand(req.params.id, req.body)),
);

export const deleteBrand = asyncHandler(async (req, res) =>
  ok(res, await catalogService.deleteBrand(req.params.id)),
);

export const listAgeGroups = asyncHandler(async (_req, res) =>
  ok(res, await catalogService.listAgeGroups()),
);
