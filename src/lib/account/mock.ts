import { products } from "@/lib/data";
import type { AccountOrder, Address, Coupon } from "./types";

/**
 * Placeholder account data.
 *
 * Deterministic — no Math.random or Date.now at module scope, so server and
 * client render identical markup. Replaced by Mongo queries later; shapes are
 * already final.
 */

const BASE = Date.UTC(2026, 7, 18, 10, 30, 0);
const DAY = 86_400_000;

export const seedAddresses: Address[] = [
  {
    _id: "ad1",
    label: "Home",
    fullName: "Rahul Agarwal",
    phone: "+91 98765 43210",
    line1: "Flat 402, Silver Oak Residency",
    line2: "Sector 74A",
    landmark: "Opposite DAV School",
    city: "Mohali",
    state: "Punjab",
    pincode: "160055",
    isDefault: true,
  },
  {
    _id: "ad2",
    label: "Work",
    fullName: "Rahul Agarwal",
    phone: "+91 98765 43210",
    line1: "3rd Floor, Tower B, Quark City",
    line2: "Industrial Area Phase 8B",
    city: "Mohali",
    state: "Punjab",
    pincode: "160059",
    isDefault: false,
  },
];

export const coupons: Coupon[] = [
  {
    _id: "cp1",
    code: "HELLOKIDS",
    title: "10% off your first order",
    description: "Valid on your first KidsCares order. Applies to the full cart.",
    type: "percent",
    value: 10,
    maxDiscount: 500,
    minOrder: 499,
    expiresAt: new Date(BASE + 30 * DAY).toISOString(),
    isNew: true,
  },
  {
    _id: "cp2",
    code: "TOYS300",
    title: "Flat ₹300 off on toys",
    description: "Applies to any order from the Toys aisle above ₹1,499.",
    type: "flat",
    value: 300,
    minOrder: 1499,
    category: "toys",
    expiresAt: new Date(BASE + 12 * DAY).toISOString(),
  },
  {
    _id: "cp3",
    code: "FREESHIP",
    title: "Free delivery, no minimum",
    description: "Waives the ₹49 delivery charge on any order.",
    type: "shipping",
    value: 0,
    minOrder: 0,
    expiresAt: new Date(BASE + 6 * DAY).toISOString(),
  },
  {
    _id: "cp4",
    code: "WINTER20",
    title: "20% off winter wear",
    description: "Jackets, sweaters and thermals. Up to ₹800 off.",
    type: "percent",
    value: 20,
    maxDiscount: 800,
    minOrder: 999,
    category: "clothing",
    expiresAt: new Date(BASE + 21 * DAY).toISOString(),
  },
  {
    _id: "cp5",
    code: "BULK15",
    title: "15% off on 4+ items",
    description: "Stocking up? Save when your bag has four or more items.",
    type: "percent",
    value: 15,
    maxDiscount: 1200,
    minOrder: 2499,
    expiresAt: new Date(BASE + 45 * DAY).toISOString(),
  },
  {
    _id: "cp6",
    code: "NEWBORN250",
    title: "₹250 off newborn essentials",
    description: "Diapers, wipes and feeding, for orders above ₹1,299.",
    type: "flat",
    value: 250,
    minOrder: 1299,
    category: "daily-needs",
    expiresAt: new Date(BASE + 9 * DAY).toISOString(),
  },
];

const STATUSES: AccountOrder["status"][] = [
  "delivered", "out-for-delivery", "shipped", "packed", "confirmed", "cancelled",
];

export const accountOrders: AccountOrder[] = Array.from({ length: 6 }, (_, i) => {
  const items = Array.from({ length: 1 + (i % 3) }, (_, j) => {
    const p = products[(i * 4 + j) % products.length];
    return {
      slug: p.slug,
      title: p.title,
      brand: p.brand,
      image: p.images[0],
      size: p.sizes[0],
      color: p.colors[0]?.name ?? "Default",
      qty: 1 + ((i + j) % 2),
      price: p.price,
    };
  });

  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const shipping = subtotal >= 999 ? 0 : 49;
  const discount = i % 2 === 0 ? Math.round(subtotal * 0.1) : 0;

  return {
    _id: `ord${i + 1}`,
    orderNo: `KC${24010 + i * 7}`,
    placedAt: new Date(BASE - i * 6 * DAY).toISOString(),
    status: STATUSES[i % STATUSES.length],
    payment: i % 3 === 0 ? "cod" : "prepaid",
    items,
    subtotal,
    shipping,
    discount,
    total: subtotal + shipping - discount,
    address: seedAddresses[i % seedAddresses.length],
    eta: new Date(BASE - i * 6 * DAY + 4 * DAY).toISOString(),
  };
});

/** Ordered pipeline used by the tracker; "cancelled" sits outside it. */
export const ORDER_STEPS: { key: AccountOrder["status"]; label: string }[] = [
  { key: "placed", label: "Order placed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "packed", label: "Packed" },
  { key: "shipped", label: "Shipped" },
  { key: "out-for-delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
];

export const INDIAN_STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu",
  "Telangana", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];
