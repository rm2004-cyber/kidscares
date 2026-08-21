import { Banner } from "../models/Banner.js";
import { Deal } from "../models/Deal.js";
import { Coupon } from "../models/Coupon.js";
import { Settings } from "../models/Settings.js";
import { ApiError } from "../utils/ApiError.js";

/* ─────────────────────────────── banners ──────────────────────────────── */

export async function listLiveBanners(placement = "hero") {
  const now = new Date();
  const rows = await Banner.find({
    placement,
    isActive: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  })
    .sort({ order: 1 })
    .lean();
  return rows;
}

export const listAllBanners = () => Banner.find().sort({ placement: 1, order: 1 }).lean();
export const createBanner = (data) => Banner.create(data);

export async function updateBanner(id, data) {
  const doc = await Banner.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!doc) throw ApiError.notFound("Banner not found");
  return doc;
}

export async function deleteBanner(id) {
  const doc = await Banner.findByIdAndDelete(id);
  if (!doc) throw ApiError.notFound("Banner not found");
  return { ok: true };
}

/** Persists a drag-reorder in one round trip. */
export async function reorderBanners(ids) {
  await Promise.all(ids.map((id, i) => Banner.updateOne({ _id: id }, { order: i })));
  return { ok: true };
}

/* ──────────────────────────────── deals ───────────────────────────────── */

export const listLiveDeals = () =>
  Deal.find({ isActive: true, endsAt: { $gte: new Date() } })
    .sort({ order: 1 })
    .lean();

export const listAllDeals = () => Deal.find().sort({ order: 1 }).lean();
export const createDeal = (data) => Deal.create(data);

export async function updateDeal(id, data) {
  const doc = await Deal.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!doc) throw ApiError.notFound("Deal not found");
  return doc;
}

export async function deleteDeal(id) {
  const doc = await Deal.findByIdAndDelete(id);
  if (!doc) throw ApiError.notFound("Deal not found");
  return { ok: true };
}

/** The "sale ends tonight" bulk action from the admin deals screen. */
export async function setDealsEndsAt(endsAt) {
  await Deal.updateMany({}, { endsAt: new Date(endsAt) });
  return { ok: true };
}

/* ─────────────────────────────── coupons ──────────────────────────────── */

export const listPublicCoupons = () =>
  Coupon.find({ isActive: true, expiresAt: { $gte: new Date() } })
    .sort({ expiresAt: 1 })
    .lean();

export const listAllCoupons = () => Coupon.find().sort({ createdAt: -1 }).lean();

export async function createCoupon(data) {
  const exists = await Coupon.findOne({ code: String(data.code).toUpperCase() });
  if (exists) throw ApiError.conflict("That coupon code already exists");
  return Coupon.create({ ...data, code: String(data.code).toUpperCase() });
}

export async function updateCoupon(id, data) {
  if (data.code) data.code = String(data.code).toUpperCase();
  const doc = await Coupon.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!doc) throw ApiError.notFound("Coupon not found");
  return doc;
}

export async function deleteCoupon(id) {
  const doc = await Coupon.findByIdAndDelete(id);
  if (!doc) throw ApiError.notFound("Coupon not found");
  return { ok: true };
}

/* ─────────────────────────────── settings ─────────────────────────────── */

export const getSettings = () => Settings.getSite();

export async function updateSettings(patch) {
  const settings = await Settings.getSite();
  // Deep-merge the nested groups so a partial save cannot wipe siblings.
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      settings[key] = { ...(settings[key]?.toObject?.() ?? settings[key] ?? {}), ...value };
    } else {
      settings[key] = value;
    }
  }
  await settings.save();
  return settings;
}

export const contentService = {
  listLiveBanners,
  listAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
  listLiveDeals,
  listAllDeals,
  createDeal,
  updateDeal,
  deleteDeal,
  setDealsEndsAt,
  listPublicCoupons,
  listAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getSettings,
  updateSettings,
};
