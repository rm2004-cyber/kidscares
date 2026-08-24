import mongoose from "mongoose";

/**
 * A return raised on a delivered order.
 *
 * Scoped to specific line items rather than the whole order — a three-item
 * order where only the shoes did not fit should return the shoes, refund that
 * amount, and leave the rest alone.
 */
const returnSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    orderNo: { type: String, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    /** Snapshot of exactly what is coming back, and what it is worth. */
    items: [
      {
        itemIndex: { type: Number, required: true },
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        title: String,
        image: String,
        size: String,
        color: String,
        qty: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true },
        _id: false,
      },
    ],

    reasonCode: {
      type: String,
      enum: [
        "wrong-size",
        "damaged",
        "wrong-item",
        "not-as-described",
        "quality-issue",
        "changed-mind",
        "other",
      ],
      required: true,
    },
    reasonText: { type: String, trim: true, maxlength: 500 },

    resolution: {
      type: String,
      enum: ["refund", "exchange"],
      default: "refund",
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "picked-up", "refunded", "cancelled"],
      default: "pending",
      index: true,
    },

    /** What the returned lines were worth — the ceiling for any refund. */
    refundAmount: { type: Number, default: 0 },

    /**
     * The actual money movement, tracked as a lifecycle rather than a flag.
     *
     * Razorpay refunds are asynchronous: the API call only creates the refund,
     * and the bank confirms it minutes to days later via webhook. Collapsing
     * that into a single boolean is how refunds get lost — the admin sees
     * "refunded" and never learns the bank rejected it. So "initiated" and
     * "processed" are separate states with separate timestamps.
     *
     * `amount` is set by the admin at the moment they trigger it, never
     * computed: it may be less than `refundAmount` when shipping or a
     * restocking fee is withheld, and the reason goes in `deductionNote`.
     */
    refund: {
      status: {
        type: String,
        enum: ["none", "initiated", "processed", "failed"],
        default: "none",
        index: true,
      },
      amount: { type: Number, default: 0 },
      /** Shown to the customer whenever amount < refundAmount. */
      deductionNote: { type: String, trim: true, maxlength: 300 },
      refundId: { type: String, index: true },
      speed: String,
      initiatedAt: Date,
      initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
      initiatedByName: String,
      processedAt: Date,
      failedAt: Date,
      failureReason: String,
    },

    /**
     * Where to send the money when it cannot go back to source.
     *
     * Required for cash-on-delivery — there is no original payment to reverse.
     * Optional for prepaid, where Razorpay refunds to the card or UPI that
     * paid; only captured when the customer asks for a different account.
     *
     * Deliberately minimal: account number, IFSC and holder name. Nothing here
     * lets anyone move money, but it is still personal data — never logged,
     * never returned to the storefront after it is saved.
     */
    bankDetails: {
      accountName: { type: String, trim: true, maxlength: 100 },
      accountNumber: { type: String, trim: true, maxlength: 24 },
      ifsc: { type: String, trim: true, uppercase: true, maxlength: 11 },
      bankName: { type: String, trim: true, maxlength: 100 },
      upiId: { type: String, trim: true, maxlength: 100 },
    },
    refundMode: {
      type: String,
      enum: ["source", "bank", "upi"],
      default: "source",
    },
    refundReference: String,
    refundedAt: Date,

    /**
     * Reverse shipment.
     *
     * `status` starts at "not-booked": the pickup is only booked when an admin
     * approves, never at request time — otherwise a rejected return would have
     * already sent a courier to the customer's door.
     */
    pickup: {
      status: {
        type: String,
        enum: ["not-booked", "booked", "failed", "picked-up", "cancelled"],
        default: "not-booked",
      },
      shiprocketOrderId: String,
      shipmentId: String,
      awb: String,
      courier: String,
      courierId: Number,
      /** What the reverse leg cost — the cheapest serviceable option. */
      rate: Number,
      estimatedDays: String,
      labelUrl: String,
      scheduledAt: Date,
      bookedAt: Date,
      failureReason: String,
    },

    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },
    handledAt: Date,
    adminNote: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

returnSchema.index({ createdAt: -1 });

export const ReturnRequest = mongoose.model("ReturnRequest", returnSchema);

/** Shared with the storefront so both sides use the same wording. */
export const RETURN_REASONS = [
  { code: "wrong-size", label: "Size or fit is wrong" },
  { code: "damaged", label: "Arrived damaged or broken" },
  { code: "wrong-item", label: "I received the wrong item" },
  { code: "not-as-described", label: "Not as described on the site" },
  { code: "quality-issue", label: "Quality is not what I expected" },
  { code: "changed-mind", label: "I changed my mind" },
  { code: "other", label: "Something else" },
];
