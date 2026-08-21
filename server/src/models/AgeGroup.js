import mongoose from "mongoose";

const ageGroupSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    label: { type: String, required: true, trim: true },
    minMonths: { type: Number, required: true },
    maxMonths: { type: Number, required: true },
    glyph: { type: String, default: "teddy" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

ageGroupSchema.index({ order: 1 });

export const AgeGroup = mongoose.model("AgeGroup", ageGroupSchema);
