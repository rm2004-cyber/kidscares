import mongoose from "mongoose";

/**
 * Rolled-up traffic samples. The live dashboard reads from the in-memory
 * presence registry (instant, no writes); this collection keeps the history
 * that survives a restart.
 */
const sampleSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    online: { type: Number, default: 0 },
    byPath: { type: Map, of: Number, default: {} },
    byDevice: {
      mobile: { type: Number, default: 0 },
      desktop: { type: Number, default: 0 },
      tablet: { type: Number, default: 0 },
    },
  },
  { versionKey: false },
);

/* 30-day retention — enough for the dashboard, small enough to stay cheap. */
sampleSchema.index({ at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export const TrafficSample = mongoose.model("TrafficSample", sampleSchema);

const eventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["pageview", "add_to_cart", "wishlist", "search", "checkout", "order"],
      required: true,
      index: true,
    },
    label: String,
    path: String,
    city: String,
    device: String,
    referrer: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

eventSchema.index({ at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export const AnalyticsEvent = mongoose.model("AnalyticsEvent", eventSchema);
