import { User } from "../models/User.js";
import { Wishlist } from "../models/Wishlist.js";
import { Product } from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";

export async function updateProfile(userId, patch) {
  const allowed = ["name", "phone", "dob", "gender", "avatar", "preferences"];
  const update = {};
  for (const key of allowed) if (patch[key] !== undefined) update[key] = patch[key];

  const user = await User.findByIdAndUpdate(userId, update, {
    new: true,
    runValidators: true,
  });
  if (!user) throw ApiError.notFound("User not found");
  return user.toPublic();
}

/* ────────────────────────────── addresses ─────────────────────────────── */

export async function listAddresses(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User not found");
  return user.addresses;
}

export async function addAddress(userId, data) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User not found");

  // First address is always the default, whatever the payload says.
  const makeDefault = user.addresses.length === 0 || data.isDefault;
  if (makeDefault) user.addresses.forEach((a) => (a.isDefault = false));

  user.addresses.push({ ...data, isDefault: makeDefault });
  await user.save();
  return user.addresses;
}

export async function updateAddress(userId, addressId, data) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User not found");

  const address = user.addresses.id(addressId);
  if (!address) throw ApiError.notFound("Address not found");

  if (data.isDefault) user.addresses.forEach((a) => (a.isDefault = false));
  Object.assign(address, data);

  await user.save();
  return user.addresses;
}

export async function deleteAddress(userId, addressId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User not found");

  const address = user.addresses.id(addressId);
  if (!address) throw ApiError.notFound("Address not found");

  const wasDefault = address.isDefault;
  address.deleteOne();

  // Never leave the book without a default.
  if (wasDefault && user.addresses.length) user.addresses[0].isDefault = true;

  await user.save();
  return user.addresses;
}

export async function setDefaultAddress(userId, addressId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User not found");
  if (!user.addresses.id(addressId)) throw ApiError.notFound("Address not found");

  user.addresses.forEach((a) => (a.isDefault = String(a._id) === String(addressId)));
  await user.save();
  return user.addresses;
}

/* ────────────────────────────── wishlist ──────────────────────────────── */

function wishScope({ user, guestId }) {
  if (user) return { user: user.id ?? user };
  if (guestId) return { guestId };
  throw ApiError.badRequest("No wishlist identity");
}

export async function getWishlist(identity) {
  const where = wishScope(identity);
  const list =
    (await Wishlist.findOne(where)) ?? (await Wishlist.create({ ...where, products: [] }));

  const products = await Product.find({
    _id: { $in: list.products },
    isActive: true,
  }).lean();

  return { productIds: products.map((p) => String(p._id)), products };
}

export async function toggleWishlist(identity, productId) {
  const where = wishScope(identity);
  const list =
    (await Wishlist.findOne(where)) ?? (await Wishlist.create({ ...where, products: [] }));

  const idx = list.products.findIndex((p) => String(p) === String(productId));
  if (idx >= 0) list.products.splice(idx, 1);
  else list.products.push(productId);

  await list.save();
  return getWishlist(identity);
}

export async function clearWishlist(identity) {
  const list = await Wishlist.findOne(wishScope(identity));
  if (list) {
    list.products = [];
    await list.save();
  }
  return { productIds: [], products: [] };
}

/* ─────────────────────────────── admin ────────────────────────────────── */

export async function listCustomers(query, { page, limit, skip }) {
  const filter = {};
  if (query.q) {
    const rx = new RegExp(String(query.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export const userService = {
  updateProfile,
  listAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getWishlist,
  toggleWishlist,
  clearWishlist,
  listCustomers,
};
