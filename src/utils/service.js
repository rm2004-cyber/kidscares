/**
 * Single source of truth for every API call the frontend makes.
 *
 * Nothing else in the app should build a URL or call fetch directly — import
 * the function you need from here. That keeps the base URL, credentials,
 * error shape and response unwrapping consistent everywhere, and means a
 * change to the API surface is a change to this file alone.
 *
 * `utils/socket.ts` imports BASE_URL and SOCKET_URL from here too, so the
 * realtime layer can never drift from the REST layer.
 */

/* ─────────────────────────────── config ───────────────────────────────── */

const RAW_API =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

/** Origin without the /api suffix — what socket.io connects to. */
export const SOCKET_URL = RAW_API;

/** Base for every REST call. */
export const BASE_URL = `${RAW_API}/api`;

/* ─────────────────────────────── core ─────────────────────────────────── */

export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * `credentials: "include"` on every call — the session and guest-cart cookies
 * are httpOnly, so they only travel if we ask for them explicitly.
 */
async function request(path, { method = "GET", body, params, headers, signal, raw } = {}) {
  const url = new URL(`${BASE_URL}${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) value.forEach((v) => url.searchParams.append(key, v));
      else url.searchParams.set(key, String(value));
    }
  }

  const isForm = typeof FormData !== "undefined" && body instanceof FormData;

  let res;
  try {
    res = await fetch(url.toString(), {
      method,
      credentials: "include",
      signal,
      headers: {
        ...(isForm || body === undefined ? {} : { "Content-Type": "application/json" }),
        ...headers,
      },
      body: isForm ? body : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new ApiError("Cannot reach the server. Check your connection.", { status: 0 });
  }

  if (res.status === 204) return null;

  const payload = await res.json().catch(() => null);

  if (!res.ok || payload?.success === false) {
    const e = payload?.error ?? {};
    throw new ApiError(e.message ?? `Request failed (${res.status})`, {
      status: res.status,
      code: e.code,
      details: e.details,
    });
  }

  // Callers that need pagination `meta` pass raw:true; everyone else gets data.
  return raw ? payload : payload?.data;
}

const get = (path, opts) => request(path, { ...opts, method: "GET" });
const post = (path, body, opts) => request(path, { ...opts, method: "POST", body });
const patch = (path, body, opts) => request(path, { ...opts, method: "PATCH", body });
const del = (path, body, opts) => request(path, { ...opts, method: "DELETE", body });

export const api = { request, get, post, patch, del };

/* ──────────────────────────────── auth ────────────────────────────────── */

export const authApi = {
  /** Step 1 of signup — emails a code via Brevo. */
  requestSignupOtp: (payload) => post("/auth/signup/request", payload),
  /** Step 2 — verifying the code creates the account and signs the user in. */
  verifySignupOtp: (payload) => post("/auth/signup/verify", payload),

  login: (payload) => post("/auth/login", payload),
  requestLoginOtp: (email) => post("/auth/login/otp/request", { email }),
  verifyLoginOtp: (payload) => post("/auth/login/otp/verify", payload),

  forgotPassword: (email) => post("/auth/forgot-password", { email }),
  resetPassword: (payload) => post("/auth/reset-password", payload),
  changePassword: (payload) => post("/auth/change-password", payload),

  me: () => get("/auth/me"),
  logout: () => post("/auth/logout"),
};

export const adminAuthApi = {
  login: (payload) => post("/auth/admin/login", payload),
  me: () => get("/auth/admin/me"),
  logout: () => post("/auth/logout"),
};

/* ───────────────────────────── catalogue ──────────────────────────────── */

export const catalogApi = {
  /** Returns `{ data, meta }` so a grid can render pagination. */
  listProducts: (query = {}) => get("/products", { params: query, raw: true }),
  getProduct: (slug) => get(`/products/${slug}`),
  suggestions: (q) => get("/products/suggestions", { params: { q } }),

  listCategories: (parent) => get("/categories", { params: { parent } }),
  getCategory: (slug) => get(`/categories/${slug}`),

  listBrands: () => get("/brands"),
  listAgeGroups: () => get("/age-groups"),
};

/* ─────────────────────────── content & config ─────────────────────────── */

export const contentApi = {
  getBanners: (placement = "hero") => get("/banners", { params: { placement } }),
  getDeals: () => get("/deals"),
  getCoupons: () => get("/coupons"),
  getSettings: () => get("/settings"),
  /** Analytics beacon; safe to call for signed-out visitors. */
  track: (event) => post("/track", event),
};

/* ──────────────────────────────── cart ────────────────────────────────── */

export const cartApi = {
  get: () => get("/cart"),
  addItem: ({ productId, size, color, qty = 1 }) =>
    post("/cart/items", { productId, size, color, qty }),
  updateItem: ({ productId, size, color, qty }) =>
    patch("/cart/items", { productId, size, color, qty }),
  removeItem: ({ productId, size, color }) =>
    del("/cart/items", { productId, size, color }),
  clear: () => del("/cart"),
  applyCoupon: (code) => post("/cart/coupon", { code }),
  removeCoupon: () => del("/cart/coupon"),
};

/* ─────────────────────────── account & orders ─────────────────────────── */

export const accountApi = {
  updateProfile: (payload) => patch("/me/profile", payload),

  listAddresses: () => get("/me/addresses"),
  addAddress: (payload) => post("/me/addresses", payload),
  updateAddress: (id, payload) => patch(`/me/addresses/${id}`, payload),
  deleteAddress: (id) => del(`/me/addresses/${id}`),
  setDefaultAddress: (id) => post(`/me/addresses/${id}/default`),

  listOrders: (params) => get("/me/orders", { params, raw: true }),
  getOrder: (id) => get(`/me/orders/${id}`),
  placeOrder: (payload) => post("/me/orders", payload),
  cancelOrder: (id, reason) => post(`/me/orders/${id}/cancel`, { reason }),
  /** Printable invoice — opened in a new tab, not fetched. */
  invoiceUrl: (id) => `${BASE_URL}/me/orders/${id}/invoice`,
};

/* ─────────────────────────────── reviews ──────────────────────────────── */

export const reviewApi = {
  /** Approved reviews for a product, plus the star breakdown in `meta`. */
  forProduct: (slug, { page = 1, limit = 10, sort = "recent" } = {}) =>
    get(`/products/${slug}/reviews`, { params: { page, limit, sort }, raw: true }),

  /** Delivered items the signed-in customer has not reviewed yet. */
  pending: () => get("/me/reviews/pending"),
  mine: () => get("/me/reviews"),
  submit: ({ productId, orderId, rating, title, comment }) =>
    post("/me/reviews", { productId, orderId, rating, title, comment }),
  remove: (id) => del(`/me/reviews/${id}`),
};

/* ───────────────────────── payments (Razorpay) ────────────────────────── */

export const paymentApi = {
  /** Creates the Razorpay order the checkout widget opens against. */
  createOrder: (orderId) => post("/payments/order", { orderId }),
  /** Confirms a browser-reported success; the signature is verified server-side. */
  verify: ({ orderId, razorpayOrderId, razorpayPaymentId, signature }) =>
    post("/payments/verify", { orderId, razorpayOrderId, razorpayPaymentId, signature }),
};

/* ──────────────────── support: chatbot & cancellation ─────────────────── */

export const supportApi = {
  /** Recent open orders plus the preset cancellation reasons. */
  chatContext: () => get("/support/chat/context"),
  /** One-line Flipkart-style status, refreshed from the courier when stale. */
  orderStatus: (orderId) => get(`/support/orders/${orderId}/status`),
  /** Whether cancelling is still allowed, and what a refund would be worth. */
  cancellationContext: (orderId) => get(`/support/orders/${orderId}/cancellation`),
  requestCancellation: (orderId, { reasonCode, reasonText, transcript }) =>
    post(`/support/orders/${orderId}/cancellation`, { reasonCode, reasonText, transcript }),
};

export const wishlistApi = {
  get: () => get("/me/wishlist"),
  toggle: (productId) => post("/me/wishlist/toggle", { productId }),
  clear: () => del("/me/wishlist"),
};

/* ─────────────────────────────── admin ────────────────────────────────── */

export const adminApi = {
  stats: () => get("/admin/stats"),
  liveSnapshot: () => get("/admin/live"),
  liveHistory: (minutes = 120) => get("/admin/live/history", { params: { minutes } }),
  liveEvents: (limit = 60) => get("/admin/live/events", { params: { limit } }),

  listProducts: (query = {}) => get("/admin/products", { params: query, raw: true }),
  createProduct: (payload) => post("/admin/products", payload),
  updateProduct: (id, payload) => patch(`/admin/products/${id}`, payload),
  deleteProduct: (id) => del(`/admin/products/${id}`),

  listCategories: () => get("/admin/categories"),
  createCategory: (payload) => post("/admin/categories", payload),
  updateCategory: (id, payload) => patch(`/admin/categories/${id}`, payload),
  deleteCategory: (id) => del(`/admin/categories/${id}`),
  refreshCategoryCounts: () => post("/admin/categories/refresh-counts"),

  listBrands: () => get("/admin/brands"),
  createBrand: (payload) => post("/admin/brands", payload),
  updateBrand: (id, payload) => patch(`/admin/brands/${id}`, payload),
  deleteBrand: (id) => del(`/admin/brands/${id}`),

  listBanners: () => get("/admin/banners"),
  createBanner: (payload) => post("/admin/banners", payload),
  updateBanner: (id, payload) => patch(`/admin/banners/${id}`, payload),
  deleteBanner: (id) => del(`/admin/banners/${id}`),
  reorderBanners: (ids) => post("/admin/banners/reorder", { ids }),

  listDeals: () => get("/admin/deals"),
  createDeal: (payload) => post("/admin/deals", payload),
  updateDeal: (id, payload) => patch(`/admin/deals/${id}`, payload),
  deleteDeal: (id) => del(`/admin/deals/${id}`),
  setDealsEndsAt: (endsAt) => post("/admin/deals/ends-at", { endsAt }),

  listCoupons: () => get("/admin/coupons"),
  createCoupon: (payload) => post("/admin/coupons", payload),
  updateCoupon: (id, payload) => patch(`/admin/coupons/${id}`, payload),
  deleteCoupon: (id) => del(`/admin/coupons/${id}`),

  listOrders: (query = {}) => get("/admin/orders", { params: query, raw: true }),
  updateOrderStatus: (id, status, note) =>
    patch(`/admin/orders/${id}/status`, { status, note }),

  listCustomers: (query = {}) => get("/admin/customers", { params: query, raw: true }),

  getSettings: () => get("/admin/settings"),
  updateSettings: (payload) => patch("/admin/settings", payload),

  /* ── review moderation ── */
  listReviews: (query = {}) => get("/admin/reviews", { params: query, raw: true }),
  moderateReview: (id, { approve, note }) =>
    post(`/admin/reviews/${id}/moderate`, { approve, note }),
  deleteReview: (id) => del(`/admin/reviews/${id}`),

  /* ── payments panel ── */
  paymentsSummary: (params) => get("/admin/payments/summary", { params }),
  paymentsSeries: (days = 14) => get("/admin/payments/series", { params: { days } }),
  listPayments: (query = {}) => get("/admin/payments", { params: query, raw: true }),
  refundPayment: ({ orderId, amount, reason }) =>
    post("/admin/payments/refund", { orderId, amount, reason }),

  /* ── cancellation review queue ── */
  listCancellations: (query = {}) => get("/admin/cancellations", { params: query, raw: true }),
  resolveCancellation: (id, { approve, note }) =>
    post(`/admin/cancellations/${id}/resolve`, { approve, note }),
  retryRefund: (orderId) => post("/admin/cancellations/retry-refund", { orderId }),

  /* ── shipments (Shiprocket) ── */
  shipOrder: (orderId) => post(`/admin/orders/${orderId}/ship`),
  syncOrderTracking: (orderId) => post(`/admin/orders/${orderId}/sync`),
  syncAllShipments: () => post("/admin/shipments/sync-all"),
  assignAwb: ({ shipmentId, courierId }) => post("/admin/shipments/awb", { shipmentId, courierId }),
  requestPickup: (shipmentId) => post("/admin/shipments/pickup", { shipmentId }),
  generateLabel: (shipmentId) => post("/admin/shipments/label", { shipmentId }),
  serviceability: (params) => get("/admin/shipments/serviceability", { params }),

  /** Cloudinary upload — send a FormData with one or more `files` entries. */
  uploadImages: (files) => {
    const form = new FormData();
    for (const f of files) form.append("files", f);
    return post("/admin/upload", form);
  },
  deleteImage: (publicId) => del("/admin/upload", { publicId }),
};

export const health = () => get("/health");

export default {
  BASE_URL,
  SOCKET_URL,
  api,
  authApi,
  adminAuthApi,
  catalogApi,
  contentApi,
  cartApi,
  accountApi,
  wishlistApi,
  reviewApi,
  paymentApi,
  supportApi,
  adminApi,
  health,
};
