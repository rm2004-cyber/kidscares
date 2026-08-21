import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created, paginated } from "../utils/response.js";
import { readPaging } from "../utils/pagination.js";
import { userService } from "../services/user.service.js";

const identity = (req) => ({ user: req.user, guestId: req.guestId });

export const updateProfile = asyncHandler(async (req, res) =>
  ok(res, await userService.updateProfile(req.user.id, req.body)),
);

export const listAddresses = asyncHandler(async (req, res) =>
  ok(res, await userService.listAddresses(req.user.id)),
);

export const addAddress = asyncHandler(async (req, res) =>
  created(res, await userService.addAddress(req.user.id, req.body)),
);

export const updateAddress = asyncHandler(async (req, res) =>
  ok(res, await userService.updateAddress(req.user.id, req.params.id, req.body)),
);

export const deleteAddress = asyncHandler(async (req, res) =>
  ok(res, await userService.deleteAddress(req.user.id, req.params.id)),
);

export const setDefaultAddress = asyncHandler(async (req, res) =>
  ok(res, await userService.setDefaultAddress(req.user.id, req.params.id)),
);

export const getWishlist = asyncHandler(async (req, res) =>
  ok(res, await userService.getWishlist(identity(req))),
);

export const toggleWishlist = asyncHandler(async (req, res) =>
  ok(res, await userService.toggleWishlist(identity(req), req.body.productId)),
);

export const clearWishlist = asyncHandler(async (req, res) =>
  ok(res, await userService.clearWishlist(identity(req))),
);

export const listCustomers = asyncHandler(async (req, res) => {
  const paging = readPaging(req.query, { defaultLimit: 25 });
  const { items, total } = await userService.listCustomers(req.query, paging);
  return paginated(res, items, { ...paging, total });
});
