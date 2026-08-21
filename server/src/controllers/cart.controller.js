import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import { cartService } from "../services/cart.service.js";

/** Signed-in shoppers get their user cart; everyone else gets the guest cart. */
const identity = (req) => ({ user: req.user, guestId: req.guestId });

export const getCart = asyncHandler(async (req, res) =>
  ok(res, await cartService.getCart(identity(req))),
);

export const addItem = asyncHandler(async (req, res) =>
  ok(res, await cartService.addItem(identity(req), req.body)),
);

export const updateItem = asyncHandler(async (req, res) =>
  ok(res, await cartService.updateItem(identity(req), req.body)),
);

export const removeItem = asyncHandler(async (req, res) =>
  ok(res, await cartService.removeItem(identity(req), req.body)),
);

export const clearCart = asyncHandler(async (req, res) =>
  ok(res, await cartService.clearCart(identity(req))),
);

export const applyCoupon = asyncHandler(async (req, res) =>
  ok(res, await cartService.applyCoupon(identity(req), req.body.code)),
);

export const removeCoupon = asyncHandler(async (req, res) =>
  ok(res, await cartService.removeCoupon(identity(req))),
);
