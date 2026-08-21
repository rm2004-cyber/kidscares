import type { SiteSettings } from "./types";

/**
 * Placeholder admin data.
 *
 * Deterministic on purpose — no Math.random or Date.now at module scope, so
 * server and client render identical markup. Replaced wholesale by Mongo
 * queries in the backend phase; the shapes are already final.
 */

export const defaultSettings: SiteSettings = {
  storeName: "KidsCares",
  supportEmail: "care@kidscares.example",
  supportPhone: "1800-123-4567",

  freeDeliveryThreshold: 999,
  shippingFlatRate: 49,
  codEnabled: true,
  codMaxOrderValue: 10000,

  announcements: [
    "Free delivery on orders above ₹999",
    "Extra 10% off your first order — code HELLOKIDS",
    "Easy 30-day returns, no questions asked",
    "Every toy age-graded & safety tested",
    "COD available across 24,000+ pincodes",
  ],
  announcementEnabled: true,

  seo: {
    titleTemplate: "%s | KidsCares",
    defaultTitle: "KidsCares — Everything for Kids, in One Place",
    defaultDescription:
      "Shop clothing, footwear, toys, soft toys and daily essentials for kids of every age. Age-graded, safety tested and parent approved.",
    keywords: ["kids online shopping", "baby products", "kids clothing", "toys for kids"],
    ogImage: "",
    googleSiteVerification: "",
    bingSiteVerification: "",
    gaMeasurementId: "",
    robotsIndex: true,
  },

  social: {
    instagram: "https://instagram.com/kidscare",
    facebook: "https://facebook.com/kidscare",
    youtube: "https://youtube.com/@kidscare",
  },
};
