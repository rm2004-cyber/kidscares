import mongoose from "mongoose";
import { imageSchema } from "./_shared.js";

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    cta: { type: String, default: "Shop now" },
    href: { type: String, default: "/deals" },
    image: imageSchema,
    /** Preset key, resolved to Tailwind classes on the client. */
    gradient: { type: String, default: "from-brand-400 via-brand-500 to-grape-500" },
    align: { type: String, enum: ["left", "right"], default: "left" },
    placement: {
      type: String,
      enum: ["hero", "strip", "category"],
      default: "hero",
      index: true,
    },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    /** Optional scheduling window; null means "always". */
    startsAt: Date,
    endsAt: Date,
  },
  { timestamps: true },
);

bannerSchema.index({ placement: 1, order: 1 });

/** True when the banner should render right now. */
bannerSchema.methods.isLive = function isLive(at = new Date()) {
  if (!this.isActive) return false;
  if (this.startsAt && at < this.startsAt) return false;
  if (this.endsAt && at > this.endsAt) return false;
  return true;
};

export const Banner = mongoose.model("Banner", bannerSchema);
