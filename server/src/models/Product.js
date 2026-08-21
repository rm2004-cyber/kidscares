import mongoose from "mongoose";
import { imageSchema, seoSchema } from "./_shared.js";

const variantSchema = new mongoose.Schema(
  {
    size: String,
    color: String,
    colorHex: String,
    sku: { type: String, trim: true },
    stock: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    title: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true, index: true },
    categorySlug: { type: String, required: true, lowercase: true, index: true },
    ageSlugs: [{ type: String, lowercase: true, index: true }],

    images: [imageSchema],

    price: { type: Number, required: true, min: 0, index: true },
    mrp: { type: Number, required: true, min: 0 },

    badge: {
      type: String,
      enum: ["new", "bestseller", "sale", "limited", ""],
      default: "",
    },

    colors: [{ name: String, hex: String, _id: false }],
    sizes: [String],
    variants: [variantSchema],

    description: { type: String, trim: true },
    highlights: [String],

    safety: {
      certification: String,
      ageWarning: String,
      material: String,
    },

    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },

    stock: { type: Number, default: 0, min: 0 },
    inStock: { type: Boolean, default: true, index: true },
    isActive: { type: Boolean, default: true, index: true },

    /** Denormalised, kept in sync by a pre-save hook. */
    discountPercent: { type: Number, default: 0 },

    seo: seoSchema,
  },
  { timestamps: true },
);

/* Text index powers /products/search. Weighted so a title hit outranks a
   description hit for the same term. */
productSchema.index(
  { title: "text", description: "text", brand: "text" },
  { weights: { title: 10, brand: 5, description: 1 }, name: "product_text" },
);
productSchema.index({ categorySlug: 1, price: 1 });
productSchema.index({ createdAt: -1 });

productSchema.pre("save", function syncDerived(next) {
  if (this.mrp > 0 && this.price >= 0) {
    this.discountPercent = Math.round(((this.mrp - this.price) / this.mrp) * 100);
  }
  // `stock` is authoritative once variants exist; otherwise trust the flag.
  if (this.variants?.length) {
    this.stock = this.variants.reduce((s, v) => s + (v.stock ?? 0), 0);
    this.inStock = this.stock > 0;
  }
  next();
});

export const Product = mongoose.model("Product", productSchema);
