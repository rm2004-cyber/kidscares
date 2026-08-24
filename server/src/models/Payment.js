import mongoose from "mongoose";

/**
 * Local mirror of every Razorpay money movement.
 *
 * Exists so the admin payments panel never has to call Razorpay to render —
 * and so a webhook that arrives before or after the client callback still
 * lands somewhere idempotent.
 */
const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", index: true },
    orderNo: { type: String, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

    /** Razorpay order id (order_xxx) — created before the customer pays. */
    razorpayOrderId: { type: String, index: true },
    /** Razorpay payment id (pay_xxx) — exists once a payment is attempted. */
    razorpayPaymentId: { type: String, unique: true, sparse: true, index: true },
    razorpaySignature: String,

    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },

    status: {
      type: String,
      enum: ["created", "authorized", "captured", "failed", "refunded", "partially_refunded"],
      default: "created",
      index: true,
    },

    method: String,          // upi | card | netbanking | wallet …
    bank: String,
    wallet: String,
    vpa: String,
    cardLast4: String,
    cardNetwork: String,

    email: String,
    contact: String,

    errorCode: String,
    errorDescription: String,

    refunds: [
      {
        refundId: String,
        amount: Number,
        status: String,
        speed: String,
        reason: String,
        createdAt: { type: Date, default: Date.now },
        notes: mongoose.Schema.Types.Mixed,
        _id: false,
      },
    ],
    refundedAmount: { type: Number, default: 0 },

    /**
     * Razorpay's cut, in rupees. Without these, "collected" and "what actually
     * reaches the bank" differ by 2%-ish and every settlement figure is wrong.
     * Only present once a payment is captured.
     */
    fee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },

    /** Set when a settlement claims this payment. */
    settlementId: { type: String, index: true },
    settledAt: Date,

    capturedAt: Date,
    failedAt: Date,

    /** Raw webhook payload, kept for reconciliation disputes. */
    raw: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

paymentSchema.index({ createdAt: -1 });

export const Payment = mongoose.model("Payment", paymentSchema);
