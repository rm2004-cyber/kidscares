import mongoose from "mongoose";

/**
 * One product row on the home page.
 *
 * These used to live in the page component, which meant renaming a row or
 * pointing it at a different aisle was a code change and a deploy. Moving them
 * here lets the shop be merchandised from the admin panel instead.
 */

/** Where a section's products come from. */
export const SECTION_SOURCES = ["manual", "category", "badge", "newest"];

const homeSectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 60 },
    subtitle: { type: String, trim: true, maxlength: 160, default: "" },

    /** Where the row's "View all" arrow goes. */
    viewAllHref: { type: String, trim: true, default: "" },

    /** Name of a lucide icon rendered beside the title, e.g. "Star". */
    icon: { type: String, trim: true, default: "" },
    iconClassName: { type: String, trim: true, default: "" },

    source: { type: String, enum: SECTION_SOURCES, default: "manual" },

    /** Used when source is "category". */
    categorySlug: { type: String, trim: true, default: "" },
    /** Used when source is "badge". */
    badge: { type: String, trim: true, default: "" },

    /** Applied to every source except manual, which keeps the admin's order. */
    sortBy: {
      type: String,
      enum: ["popular", "new", "rating", "price-asc", "price-desc"],
      default: "popular",
    },

    limit: { type: Number, default: 10, min: 1, max: 30 },
    order: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

homeSectionSchema.index({ order: 1, createdAt: 1 });

export const HomeSection = mongoose.model("HomeSection", homeSectionSchema);
