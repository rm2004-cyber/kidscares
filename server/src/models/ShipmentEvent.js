import mongoose from "mongoose";

/**
 * Append-only history of everything that happened to an order and its parcel.
 *
 * Kept as its own collection rather than an array on the order: it is written
 * far more often than it is read, it must never be edited, and it holds raw
 * courier payloads that would bloat every order document if embedded.
 */
const shipmentEventSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    shipment: { type: mongoose.Schema.Types.ObjectId, ref: "Shipment", index: true },
    orderNo: { type: String, index: true },

    /** Our own status vocabulary, not the courier's. */
    status: { type: String, required: true },
    /** What the courier actually said, for when a mapping looks wrong. */
    courierStatus: String,

    /** Who caused it — admin action, courier scan, or our own automation. */
    source: {
      type: String,
      enum: ["admin", "shiprocket", "system", "customer"],
      default: "system",
      index: true,
    },

    note: String,
    location: String,
    actorName: String,

    at: { type: Date, default: Date.now, index: true },

    /** The webhook body verbatim, so a disputed scan can be reconstructed. */
    raw: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

shipmentEventSchema.index({ order: 1, at: -1 });

export const ShipmentEvent = mongoose.model("ShipmentEvent", shipmentEventSchema);
