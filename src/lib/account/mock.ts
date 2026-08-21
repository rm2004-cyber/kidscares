import { products } from "@/lib/data";
import type { AccountOrder, Address } from "./types";

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

/* Coupons now come from the API — see contentApi.getCoupons(). */

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

export { INDIAN_STATES } from "@/lib/constants";
