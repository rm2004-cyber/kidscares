import mongoose from "mongoose";

/**
 * Single-document collection holding everything the storefront reads at render
 * time. Changing a value here changes the live site with no deploy — that is
 * the whole point of keeping it in the database rather than in code.
 */
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "site", unique: true, index: true },

    storeName: { type: String, default: "KidsCares" },
    supportEmail: { type: String, default: "care@kidscares.example" },
    supportPhone: { type: String, default: "1800-123-4567" },

    freeDeliveryThreshold: { type: Number, default: 999 },
    shippingFlatRate: { type: Number, default: 49 },
    expressDeliveryFee: { type: Number, default: 99 },
    codEnabled: { type: Boolean, default: true },
    codMaxOrderValue: { type: Number, default: 10000 },

    announcementEnabled: { type: Boolean, default: true },
    announcements: {
      type: [String],
      default: [
        "Free delivery on orders above ₹999",
        "Extra 10% off your first order — code HELLOKIDS",
        "Easy 30-day returns, no questions asked",
      ],
    },

    seo: {
      titleTemplate: { type: String, default: "%s | KidsCares" },
      defaultTitle: {
        type: String,
        default: "KidsCares — Everything Kids Need, All in One Place",
      },
      defaultDescription: { type: String, default: "" },
      keywords: { type: [String], default: [] },
      ogImage: { type: String, default: "" },
      googleSiteVerification: { type: String, default: "" },
      bingSiteVerification: { type: String, default: "" },
      gaMeasurementId: { type: String, default: "" },
      robotsIndex: { type: Boolean, default: true },
    },

    social: {
      instagram: { type: String, default: "" },
      facebook: { type: String, default: "" },
      youtube: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

/** Always returns the singleton, creating it on first call. */
settingsSchema.statics.getSite = async function getSite() {
  return (
    (await this.findOne({ key: "site" })) ??
    (await this.create({ key: "site" }))
  );
};

export const Settings = mongoose.model("Settings", settingsSchema);
