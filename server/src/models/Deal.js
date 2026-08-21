import mongoose from "mongoose";
import { imageSchema } from "./_shared.js";

const dealSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    discountLabel: { type: String, required: true, trim: true },
    href: { type: String, default: "/deals" },
    image: imageSchema,
    accent: { type: String, default: "bg-brand-100" },
    /** Drives the storefront countdown. */
    endsAt: { type: Date, required: true, index: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const Deal = mongoose.model("Deal", dealSchema);
