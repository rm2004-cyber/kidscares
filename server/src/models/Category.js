import mongoose from "mongoose";
import { imageSchema, seoSchema } from "./_shared.js";

const categorySchema = new mongoose.Schema(
  {
    /* Nested path, e.g. "clothing/dresses" — mirrors the storefront URL so a
       category page needs one lookup rather than walking a parent chain. */
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    name: { type: String, required: true, trim: true },
    parent: { type: String, default: null, index: true },
    blurb: { type: String, trim: true },
    image: imageSchema,
    glyph: { type: String, default: "star" },
    accent: {
      type: String,
      enum: ["brand", "mint", "sun", "grape", "sky"],
      default: "brand",
    },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    /** Denormalised counter, refreshed when products change. */
    productCount: { type: Number, default: 0 },
    seo: seoSchema,
  },
  { timestamps: true },
);

categorySchema.index({ parent: 1, order: 1 });

export const Category = mongoose.model("Category", categorySchema);
