/**
 * Admin-side domain types.
 *
 * These mirror the MongoDB documents the backend phase will create. Anything
 * the admin can change lives in a document field, never in code — that is what
 * makes the storefront's banners, deals, delivery threshold and SEO tags
 * editable without a deploy.
 */

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "packed"
  | "shipped"
  | "in-transit"
  | "out-for-delivery"
  | "delivered"
  | "cancelled"
  | "returned"
  | "rto";

/** Mirrors the API's Order document, not the old local mock. */
export type Order = {
  _id: string;
  orderNo: string;
  /** Populated by the API; absent if the account was removed. */
  user?: { _id?: string; name: string; email: string; phone?: string };
  items: {
    title: string;
    brand?: string;
    qty: number;
    price: number;
    image?: string;
    size?: string;
    color?: string;
  }[];
  address?: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  status: OrderStatus;
  payment: { method: "upi" | "card" | "cod"; status: string };
  shipping_details?: { courier?: string; awb?: string; trackingUrl?: string };
  createdAt: string;
  eta?: string;
};

export type AdminUser = {
  _id: string;
  name: string;
  email: string;
  role: "owner" | "manager" | "editor";
  lastActive: string;
};

/**
 * Site-wide settings. Every value here is read by the storefront at render
 * time, so changing one in the admin changes the live site.
 */
export type SiteSettings = {
  storeName: string;
  supportEmail: string;
  supportPhone: string;

  /** Free delivery threshold in rupees — drives the cart progress bar. */
  freeDeliveryThreshold: number;
  shippingFlatRate: number;
  codEnabled: boolean;
  codMaxOrderValue: number;

  /** Scrolling messages in the top announcement bar. */
  announcements: string[];
  announcementEnabled: boolean;

  /** Global SEO defaults, overridable per product/category. */
  seo: {
    titleTemplate: string;
    defaultTitle: string;
    defaultDescription: string;
    keywords: string[];
    ogImage: string;
    googleSiteVerification: string;
    bingSiteVerification: string;
    gaMeasurementId: string;
    robotsIndex: boolean;
  };

  social: { instagram: string; facebook: string; youtube: string };
};

/** A live visitor, as the socket server will report them. */
export type LiveVisitor = {
  id: string;
  path: string;
  title: string;
  device: "mobile" | "desktop" | "tablet";
  city: string;
  referrer: string;
  enteredAt: number;
};

export type LiveEvent = {
  id: string;
  type: "pageview" | "add_to_cart" | "wishlist" | "search" | "checkout" | "order";
  label: string;
  path: string;
  city: string;
  at: number;
};
