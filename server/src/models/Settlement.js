import mongoose from "mongoose";

/**
 * Local mirror of Razorpay settlements — the payouts Razorpay makes to the
 * business bank account.
 *
 * Kept locally so the admin finance screen renders instantly and still works
 * when Razorpay is unreachable. Razorpay stays the source of truth; a sync
 * pulls new settlements in and never edits what it already stored.
 */
const settlementSchema = new mongoose.Schema(
  {
    /** Razorpay settlement id (setl_xxx). */
    settlementId: { type: String, required: true, unique: true, index: true },

    /** Rupees actually credited to the bank account. */
    amount: { type: Number, required: true },
    fees: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },

    status: {
      type: String,
      enum: ["created", "processed", "failed"],
      default: "processed",
      index: true,
    },

    /** Bank reference (UTR) — what shows on the bank statement. */
    utr: { type: String, index: true },

    /** When Razorpay created the settlement, from its own timestamp. */
    settledAt: { type: Date, index: true },

    raw: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

settlementSchema.index({ settledAt: -1 });

export const Settlement = mongoose.model("Settlement", settlementSchema);
