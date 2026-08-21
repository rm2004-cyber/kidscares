import mongoose from "mongoose";
import { imageSchema, seoSchema } from "./_shared.js";

const brandSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    logo: imageSchema,
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    seo: seoSchema,
  },
  { timestamps: true },
);

export const Brand = mongoose.model("Brand", brandSchema);
