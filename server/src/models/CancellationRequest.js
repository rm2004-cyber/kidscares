import mongoose from "mongoose";

/**
 * A cancellation raised from the storefront chatbot.
 *
 * Pre-shipping requests are auto-approved (the parcel has not moved).
 * Anything after that becomes a review item for the admin, because it needs a
 * courier RTO rather than a simple cancel.
 */
const cancellationSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    orderNo: { type: String, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    /** Chosen from the chatbot's preset list. */
    reasonCode: {
      type: String,
      enum: [
        "ordered-by-mistake",
        "found-cheaper",
        "delivery-too-slow",
        "wrong-item-selected",
        "changed-mind",
        "duplicate-order",
        "other",
      ],
      required: true,
    },
    reasonText: { type: String, trim: true, maxlength: 500 },

    /** Order status at the moment the request was raised. */
    orderStatusAtRequest: String,
    /** True when the parcel had already left us — needs a manual decision. */
    afterShipping: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "auto-approved"],
      default: "pending",
      index: true,
    },

    refundRequired: { type: Boolean, default: false },
    refundAmount: { type: Number, default: 0 },

    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },
    handledAt: Date,
    adminNote: { type: String, trim: true, maxlength: 500 },

    /** Full chatbot exchange, so the admin sees exactly what was said. */
    transcript: [
      {
        from: { type: String, enum: ["bot", "user"] },
        text: String,
        at: { type: Date, default: Date.now },
        _id: false,
      },
    ],
  },
  { timestamps: true },
);

cancellationSchema.index({ createdAt: -1 });

export const CancellationRequest = mongoose.model(
  "CancellationRequest",
  cancellationSchema,
);

/** Labels shared with the chatbot UI so both sides agree on the wording. */
export const CANCEL_REASONS = [
  { code: "ordered-by-mistake", label: "I ordered this by mistake" },
  { code: "found-cheaper", label: "Found it cheaper somewhere else" },
  { code: "delivery-too-slow", label: "Delivery is taking too long" },
  { code: "wrong-item-selected", label: "I picked the wrong size or colour" },
  { code: "changed-mind", label: "I changed my mind" },
  { code: "duplicate-order", label: "I ordered this twice by accident" },
  { code: "other", label: "Something else" },
];
