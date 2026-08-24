import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";
import { Coupon } from "../models/Coupon.js";
import { Settings } from "../models/Settings.js";
import { Order } from "../models/Order.js";
import { ApiError } from "../utils/ApiError.js";

/** One cart per identity. `user` wins whenever the caller is signed in. */
function scope({ user, guestId }) {
  if (user) return { user: user.id ?? user };
  if (guestId) return { guestId };
  throw ApiError.badRequest("No cart identity");
}

async function loadCart(identity) {
  const where = scope(identity);
  return (await Cart.findOne(where)) ?? (await Cart.create({ ...where, lines: [] }));
}

const sameLine = (l, { productId, size, color }) =>
  String(l.product) === String(productId) && l.size === (size ?? "") && l.color === (color ?? "");

/**
 * Re-prices every line against the live product and computes totals.
 *
 * Prices are never trusted from the client, and a line whose product has since
 * been deactivated is dropped rather than silently charged.
 */
/** How many completed orders this customer already used a coupon on. */
async function couponUseCount(userId, code) {
  if (!userId || !code) return 0;
  return Order.countDocuments({
    user: userId,
    couponCode: code,
    status: { $nin: ["cancelled"] },
  });
}

export async function summarise(cart) {
  const ids = cart.lines.map((l) => l.product);
  const products = await Product.find({ _id: { $in: ids } }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const settings = await Settings.getSite();

  const lines = [];
  let removed = 0;

  for (const line of cart.lines) {
    const p = byId.get(String(line.product));
    if (!p || !p.isActive) {
      removed += 1;
      continue;
    }
    lines.push({
      productId: String(p._id),
      slug: p.slug,
      title: p.title,
      brand: p.brand,
      image: p.images?.[0]?.url ?? line.image,
      size: line.size,
      color: line.color,
      qty: line.qty,
      price: p.price,
      mrp: p.mrp,
      inStock: p.inStock,
      lineTotal: p.price * line.qty,
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const mrpTotal = lines.reduce((s, l) => s + l.mrp * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  let shipping =
    subtotal === 0 || subtotal >= settings.freeDeliveryThreshold
      ? 0
      : settings.shippingFlatRate;

  let discount = 0;
  let couponCode = cart.couponCode ?? "";
  let couponReason;

  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode });
    if (!coupon) {
      couponCode = "";
    } else {
      const result = coupon.evaluate({
        subtotal,
        shipping,
        userUseCount: await couponUseCount(cart.user, coupon.code),
      });
      if (result.reason) {
        couponReason = result.reason;
        couponCode = "";
      } else {
        discount = result.discount;
        if (result.shippingWaived) shipping = 0;
      }
    }
  }

  return {
    lines,
    couponCode,
    couponReason,
    removed,
    totals: {
      count,
      subtotal,
      mrpTotal,
      savings: mrpTotal - subtotal,
      discount,
      shipping,
      total: Math.max(0, subtotal + shipping - discount),
      freeDeliveryThreshold: settings.freeDeliveryThreshold,
    },
  };
}

export async function getCart(identity) {
  return summarise(await loadCart(identity));
}

export async function addItem(identity, { productId, size = "", color = "", qty = 1 }) {
  const product = await Product.findById(productId);
  if (!product || !product.isActive) throw ApiError.notFound("Product not found");
  if (!product.inStock) throw ApiError.badRequest("That product is out of stock");

  const cart = await loadCart(identity);
  const existing = cart.lines.find((l) => sameLine(l, { productId, size, color }));

  /* Cap against real stock, not just the inStock flag — otherwise a shopper
     can add 10 of something with 2 left and only find out at checkout. */
  const wanted = (existing?.qty ?? 0) + qty;
  const ceiling = Math.min(10, product.stock > 0 ? product.stock : 10);

  if (wanted > ceiling) {
    throw ApiError.badRequest(
      product.stock > 0 && product.stock < 10
        ? `Only ${product.stock} left in stock.`
        : "You can order up to 10 of this item.",
    );
  }

  if (existing) {
    existing.qty = wanted;
  } else {
    cart.lines.push({
      product: product._id,
      slug: product.slug,
      title: product.title,
      brand: product.brand,
      image: product.images?.[0]?.url,
      size,
      color,
      qty: wanted,
      price: product.price,
      mrp: product.mrp,
    });
  }

  await cart.save();
  return summarise(cart);
}

export async function updateItem(identity, { productId, size = "", color = "", qty }) {
  const cart = await loadCart(identity);
  const line = cart.lines.find((l) => sameLine(l, { productId, size, color }));
  if (!line) throw ApiError.notFound("That item is not in your bag");

  if (qty <= 0) {
    cart.lines = cart.lines.filter((l) => !sameLine(l, { productId, size, color }));
  } else {
    const product = await Product.findById(productId).select("stock");
    const ceiling = Math.min(10, (product?.stock ?? 0) > 0 ? product.stock : 10);
    if (qty > ceiling) {
      throw ApiError.badRequest(
        (product?.stock ?? 0) > 0 && product.stock < 10
          ? `Only ${product.stock} left in stock.`
          : "You can order up to 10 of this item.",
      );
    }
    line.qty = qty;
  }

  await cart.save();
  return summarise(cart);
}

export async function removeItem(identity, { productId, size = "", color = "" }) {
  const cart = await loadCart(identity);
  cart.lines = cart.lines.filter((l) => !sameLine(l, { productId, size, color }));
  await cart.save();
  return summarise(cart);
}

export async function clearCart(identity) {
  const cart = await loadCart(identity);
  cart.lines = [];
  cart.couponCode = "";
  await cart.save();
  return summarise(cart);
}

export async function applyCoupon(identity, code) {
  const cart = await loadCart(identity);
  const coupon = await Coupon.findOne({ code: String(code).toUpperCase(), isActive: true });
  if (!coupon) throw ApiError.notFound("That code is not valid");

  const preview = await summarise(cart);
  const result = coupon.evaluate({
    subtotal: preview.totals.subtotal,
    shipping: preview.totals.shipping,
    userUseCount: await couponUseCount(cart.user, coupon.code),
  });
  if (result.reason) throw ApiError.badRequest(result.reason);

  cart.couponCode = coupon.code;
  await cart.save();
  return summarise(cart);
}

export async function removeCoupon(identity) {
  const cart = await loadCart(identity);
  cart.couponCode = "";
  await cart.save();
  return summarise(cart);
}

export const cartService = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  applyCoupon,
  removeCoupon,
  summarise,
};
