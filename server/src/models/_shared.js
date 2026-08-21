import mongoose from "mongoose";

/**
 * SEO sub-document, embedded on every document the storefront renders a page
 * for. Blank fields fall back to derived values in the frontend, so an admin
 * only fills in what they want to override.
 */
export const seoSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 500 },
    keywords: [{ type: String, trim: true }],
    ogImage: String,
    canonical: String,
    index: { type: Boolean, default: true },
    follow: { type: Boolean, default: true },
  },
  { _id: false },
);

export const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    /** Cloudinary public_id — needed to delete the asset later. */
    publicId: String,
    alt: String,
    width: Number,
    height: Number,
  },
  { _id: false },
);
