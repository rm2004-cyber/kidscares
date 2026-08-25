import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/response.js";
import { homeSectionService } from "../services/homeSection.service.js";

/** Public: the home page's rows, each with its products already resolved. */
export const publicSections = asyncHandler(async (_req, res) =>
  ok(res, await homeSectionService.getHomeSections()),
);

export const list = asyncHandler(async (_req, res) =>
  ok(res, await homeSectionService.listSections()),
);

export const create = asyncHandler(async (req, res) =>
  created(res, await homeSectionService.createSection(req.body)),
);

export const update = asyncHandler(async (req, res) =>
  ok(res, await homeSectionService.updateSection(req.params.id, req.body)),
);

export const remove = asyncHandler(async (req, res) =>
  ok(res, await homeSectionService.deleteSection(req.params.id)),
);

/** Just the hand-curated rows, for the picker on the product form. */
export const manual = asyncHandler(async (_req, res) =>
  ok(res, await homeSectionService.listManualSections()),
);
