export type Address = {
  _id: string;
  label: "Home" | "Work" | "Other";
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

export type Coupon = {
  _id: string;
  code: string;
  title: string;
  description: string;
  /** "percent" takes `value`% off, capped at `maxDiscount`; "flat" takes ₹value. */
  type: "percent" | "flat" | "shipping";
  value: number;
  maxDiscount?: number;
  minOrder: number;
  expiresAt: string;
  category?: string;
  featured?: boolean;
};

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "packed"
  | "shipped"
  | "out-for-delivery"
  | "delivered"
  | "cancelled";

export type AccountOrder = {
  _id: string;
  orderNo: string;
  placedAt: string;
  status: OrderStatus;
  payment: "prepaid" | "cod";
  items: {
    slug: string;
    title: string;
    brand: string;
    image: string;
    size: string;
    color: string;
    qty: number;
    price: number;
  }[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  address: Address;
  /** ISO date the courier expects to deliver. */
  eta: string;
};
