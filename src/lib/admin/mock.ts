import { products } from "@/lib/data";
import type { AdminUser, Order, OrderStatus, SiteSettings } from "./types";

/**
 * Placeholder admin data.
 *
 * Deterministic on purpose — no Math.random or Date.now at module scope, so
 * server and client render identical markup. Replaced wholesale by Mongo
 * queries in the backend phase; the shapes are already final.
 */

const CITIES = ["Mumbai", "Delhi", "Bengaluru", "Pune", "Hyderabad", "Chennai", "Jaipur", "Kolkata", "Mohali", "Indore"];
const NAMES = ["Aarti Sharma", "Rahul Mehta", "Priya Nair", "Vikram Singh", "Sneha Iyer", "Imran Khan", "Divya Rao", "Karan Patel", "Meera Joshi", "Anil Kumar"];
const STATUSES: OrderStatus[] = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled", "returned"];

/** Fixed clock so SSR and client agree; the real app reads createdAt from Mongo. */
const BASE = Date.UTC(2026, 7, 19, 9, 0, 0);

export const orders: Order[] = Array.from({ length: 42 }, (_, i) => {
  const itemCount = 1 + (i % 3);
  const items = Array.from({ length: itemCount }, (_, j) => {
    const p = products[(i * 3 + j) % products.length];
    return { title: p.title, qty: 1 + ((i + j) % 2), price: p.price, image: p.images[0] };
  });
  const total = items.reduce((s, it) => s + it.price * it.qty, 0);

  return {
    _id: `o${i + 1}`,
    orderNo: `KC${String(24010 + i)}`,
    customer: {
      name: NAMES[i % NAMES.length],
      email: `${NAMES[i % NAMES.length].split(" ")[0].toLowerCase()}@example.com`,
      phone: `+91 98${String(10000000 + i * 3571).slice(0, 8)}`,
    },
    items,
    total,
    status: STATUSES[i % STATUSES.length],
    payment: i % 3 === 0 ? "cod" : "prepaid",
    placedAt: new Date(BASE - i * 5_400_000).toISOString(),
    city: CITIES[i % CITIES.length],
  };
});

export const adminUsers: AdminUser[] = [
  { _id: "u1", name: "Rahul Agarwal", email: "rahul@kidscares.example", role: "owner", lastActive: new Date(BASE).toISOString() },
  { _id: "u2", name: "Sneha Gupta", email: "sneha@kidscares.example", role: "manager", lastActive: new Date(BASE - 3_600_000).toISOString() },
  { _id: "u3", name: "Imran Khan", email: "imran@kidscares.example", role: "editor", lastActive: new Date(BASE - 86_400_000).toISOString() },
];

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

/* ------------------------------------------------------- dashboard stats */

export const revenueSeries = [
  { label: "Mon", value: 128400 },
  { label: "Tue", value: 152900 },
  { label: "Wed", value: 141200 },
  { label: "Thu", value: 189600 },
  { label: "Fri", value: 224300 },
  { label: "Sat", value: 271800 },
  { label: "Sun", value: 243100 },
];

export const trafficSeries = [
  { label: "00", value: 210 }, { label: "03", value: 120 },
  { label: "06", value: 260 }, { label: "09", value: 640 },
  { label: "12", value: 880 }, { label: "15", value: 760 },
  { label: "18", value: 1140 }, { label: "21", value: 920 },
];

export const topCategoriesStat = [
  { label: "Clothing", value: 34, color: "var(--color-brand-500)" },
  { label: "Toys", value: 26, color: "var(--color-sun-400)" },
  { label: "Daily Needs", value: 18, color: "var(--color-mint-400)" },
  { label: "Footwear", value: 13, color: "var(--color-sky-ks)" },
  { label: "Others", value: 9, color: "var(--color-grape-500)" },
];

export const lowStock = products.filter((p) => !p.inStock).slice(0, 6);

/* ------------------------------------------------------------ live feed */

export const LIVE_CITIES = CITIES;

export const LIVE_PATHS: { path: string; title: string }[] = [
  { path: "/", title: "Home" },
  { path: "/deals", title: "Today's Deals" },
  { path: "/category/toys", title: "Kids Toys" },
  { path: "/category/clothing", title: "Kids Clothing" },
  { path: "/category/footwear", title: "Kids Footwear" },
  { path: "/category/daily-needs", title: "Daily Needs" },
  { path: "/age/2-4-years", title: "Age 2–4 Years" },
  { path: "/age/0-6-months", title: "Age 0–6 Months" },
  { path: "/cart", title: "Shopping Bag" },
  { path: "/search", title: "Search" },
  ...products.slice(0, 8).map((p) => ({
    path: `/product/${p.slug}`,
    title: p.title,
  })),
];

export const REFERRERS = [
  "google.com",
  "instagram.com",
  "Direct",
  "facebook.com",
  "youtube.com",
  "bing.com",
];
