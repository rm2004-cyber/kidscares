import mongoose from "mongoose";

const lineSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    slug: String,
    title: String,
    brand: String,
    image: String,
    size: { type: String, default: "" },
    color: { type: String, default: "" },
    qty: { type: Number, default: 1, min: 1, max: 10 },
    /** Snapshot at add-time; re-priced against the product on read. */
    price: Number,
    mrp: Number,
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    /* Exactly one of these is set: `user` for a signed-in shopper, `guestId`
       for an anonymous one. The guest cart is merged into the user cart on
       sign-in so nothing is lost at the moment of conversion. */
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    guestId: { type: String, index: true },

    lines: [lineSchema],
    couponCode: { type: String, default: "" },
  },
  { timestamps: true },
);

cartSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 60 });

export const Cart = mongoose.model("Cart", cartSchema);
