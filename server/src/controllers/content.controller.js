import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/response.js";
import { contentService } from "../services/content.service.js";

/* ─────────────────────────────── public ───────────────────────────────── */

export const getBanners = asyncHandler(async (req, res) =>
  ok(res, await contentService.listLiveBanners(req.query.placement ?? "hero")),
);

export const getDeals = asyncHandler(async (_req, res) =>
  ok(res, await contentService.listLiveDeals()),
);

export const getCoupons = asyncHandler(async (_req, res) =>
  ok(res, await contentService.listPublicCoupons()),
);

export const getSettings = asyncHandler(async (_req, res) =>
  ok(res, await contentService.getSettings()),
);

/* ─────────────────────────────── admin ────────────────────────────────── */

export const adminListBanners = asyncHandler(async (_req, res) =>
  ok(res, await contentService.listAllBanners()),
);
export const createBanner = asyncHandler(async (req, res) =>
  created(res, await contentService.createBanner(req.body)),
);
export const updateBanner = asyncHandler(async (req, res) =>
  ok(res, await contentService.updateBanner(req.params.id, req.body)),
);
export const deleteBanner = asyncHandler(async (req, res) =>
  ok(res, await contentService.deleteBanner(req.params.id)),
);
export const reorderBanners = asyncHandler(async (req, res) =>
  ok(res, await contentService.reorderBanners(req.body.ids ?? [])),
);

export const adminListDeals = asyncHandler(async (_req, res) =>
  ok(res, await contentService.listAllDeals()),
);
export const createDeal = asyncHandler(async (req, res) =>
  created(res, await contentService.createDeal(req.body)),
);
export const updateDeal = asyncHandler(async (req, res) =>
  ok(res, await contentService.updateDeal(req.params.id, req.body)),
);
export const deleteDeal = asyncHandler(async (req, res) =>
  ok(res, await contentService.deleteDeal(req.params.id)),
);
export const setDealsEndsAt = asyncHandler(async (req, res) =>
  ok(res, await contentService.setDealsEndsAt(req.body.endsAt)),
);

export const adminListCoupons = asyncHandler(async (_req, res) =>
  ok(res, await contentService.listAllCoupons()),
);
export const createCoupon = asyncHandler(async (req, res) =>
  created(res, await contentService.createCoupon(req.body)),
);
export const updateCoupon = asyncHandler(async (req, res) =>
  ok(res, await contentService.updateCoupon(req.params.id, req.body)),
);
export const deleteCoupon = asyncHandler(async (req, res) =>
  ok(res, await contentService.deleteCoupon(req.params.id)),
);

export const updateSettings = asyncHandler(async (req, res) =>
  ok(res, await contentService.updateSettings(req.body)),
);
