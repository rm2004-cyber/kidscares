import mongoose from "mongoose";

export const ORDER_STATUSES = [
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "in-transit",
  "out-for-delivery",
  "delivered",
  "cancelled",
  "returned",
  "rto",
];

/**
 * Statuses the admin may still move an order OUT of by hand.
 *
 * Note "shipped" is deliberately absent: marking an order shipped is the last
 * admin action, and once it holds that status the courier owns it. Including
 * it here would let the dashboard overwrite a live Shiprocket scan.
 */
export const ADMIN_CONTROLLED = ["placed", "confirmed", "packed"];

/** A customer may cancel only before the parcel is handed to the courier. */
export const CANCELLABLE = ["placed", "confirmed", "packed"];

const itemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    slug: String,
    title: String,
    brand: String,
    image: String,
    size: String,
    color: String,
    qty: { type: Number, required: true, min: 1 },
    /* Prices are copied, never referenced: an order must not change because
       someone edited the product afterwards. */
    price: { type: Number, required: true },
    mrp: { type: Number, required: true },
  },
  { _id: false },
);

const addressSnapshot = new mongoose.Schema(
  {
    label: String,
    fullName: String,
    phone: String,
    line1: String,
    line2: String,
    landmark: String,
    city: String,
    state: String,
    pincode: String,
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    items: [itemSchema],
    address: addressSnapshot,

    subtotal: { type: Number, required: true },
    shipping: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    couponCode: { type: String, default: "" },
    total: { type: Number, required: true },

    /* GST is extracted from the inclusive subtotal at order time and frozen
       here — a later change to the rate must not rewrite an issued invoice. */
    tax: {
      rate: Number,
      taxableValue: Number,
      cgst: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },
      igst: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      placeOfSupply: String,
      intraState: Boolean,
    },

    deliverySpeed: { type: String, enum: ["standard", "express"], default: "standard" },
    payment: {
      method: { type: String, enum: ["upi", "card", "cod"], required: true },
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
      },
      reference: String,
      paidAt: Date,
    },

    status: { type: String, enum: ORDER_STATUSES, default: "placed", index: true },
    /** Append-only audit trail; the storefront tracker reads this. */
    timeline: [
      {
        status: { type: String, enum: ORDER_STATUSES },
        at: { type: Date, default: Date.now },
        note: String,
        _id: false,
      },
    ],

    /* ── Shipping ──────────────────────────────────────────────────────
       Everything up to "shipped" is driven by the admin. Once Shiprocket has
       an AWB, tracking becomes the source of truth and `trackingStatus` is
       what the storefront shows as its one-line status. */
    shipping_details: {
      provider: { type: String, default: "shiprocket" },
      shiprocketOrderId: String,
      shipmentId: String,
      awb: String,
      courier: String,
      trackingUrl: String,
      labelUrl: String,
      pickupScheduledAt: Date,
      /** Latest scan, normalised to our own status vocabulary. */
      trackingStatus: String,
      trackingStatusRaw: String,
      trackingUpdatedAt: Date,
      /** Full scan history from the courier, newest last. */
      scans: [
        {
          status: String,
          location: String,
          at: Date,
          note: String,
          _id: false,
        },
      ],
    },

    eta: Date,
    cancelledReason: String,
    cancelledBy: { type: String, enum: ["customer", "admin", "system", ""], default: "" },
    cancelledAt: Date,

    refund: {
      status: {
        type: String,
        enum: ["none", "pending", "processed", "failed"],
        default: "none",
      },
      amount: { type: Number, default: 0 },
      reference: String,
      processedAt: Date,
      failureReason: String,
    },
  },
  { timestamps: true },
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ "shipping_details.awb": 1 });
orderSchema.index({ "shipping_details.shipmentId": 1 });

/** True while the customer is still allowed to cancel from the storefront. */
orderSchema.methods.isCancellable = function isCancellable() {
  return CANCELLABLE.includes(this.status);
};

/** One-line status for the storefront, Flipkart-style. */
orderSchema.methods.statusLine = function statusLine() {
  const d = this.shipping_details ?? {};
  const when = (v) =>
    v ? new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";

  switch (this.status) {
    case "placed":
      return { label: "Order placed", detail: `We are getting it ready · ${when(this.createdAt)}` };
    case "confirmed":
      return { label: "Order confirmed", detail: "Packing starts shortly" };
    case "packed":
      return { label: "Packed", detail: "Waiting for courier pickup" };
    case "shipped":
      return {
        label: "Shipped",
        detail: d.courier ? `Handed to ${d.courier}${d.awb ? ` · ${d.awb}` : ""}` : "On its way",
      };
    case "in-transit":
      return {
        label: "In transit",
        detail: d.scans?.length
          ? `${d.scans.at(-1).status}${d.scans.at(-1).location ? ` · ${d.scans.at(-1).location}` : ""}`
          : "Moving through the network",
      };
    case "out-for-delivery":
      return { label: "Out for delivery", detail: "Arriving today" };
    case "delivered":
      return { label: "Delivered", detail: `Delivered on ${when(d.trackingUpdatedAt ?? this.updatedAt)}` };
    case "cancelled":
      return { label: "Cancelled", detail: this.cancelledReason || "Order cancelled" };
    case "returned":
      return { label: "Returned", detail: "Return completed" };
    case "rto":
      return { label: "Returning to us", detail: "Delivery could not be completed" };
    default:
      return { label: this.status, detail: "" };
  }
};

export const Order = mongoose.model("Order", orderSchema);
