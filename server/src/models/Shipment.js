import mongoose from "mongoose";

/**
 * One parcel handed to a courier.
 *
 * Separate from Order because the two have genuinely different lifecycles and
 * different owners: an order is ours until it is packed, a shipment belongs to
 * the courier from pickup onwards. Keeping them apart also means a re-ship
 * after an RTO is a second Shipment row rather than a destructive overwrite of
 * the first one's AWB and history.
 */

/** Where a parcel is, in courier terms. */
export const SHIPMENT_STATUSES = [
  "booking",
  "booked",
  "pickup-scheduled",
  "picked-up",
  "in-transit",
  "out-for-delivery",
  "delivered",
  "delivery-failed",
  "rto-initiated",
  "rto-in-transit",
  "rto-delivered",
  "cancelled",
  "failed",
];

const shipmentSchema = new mongoose.Schema(
  {
    /* Indexed by the partial-unique index below, not here — declaring both
       makes Mongoose warn about a duplicate. */
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    orderNo: { type: String, index: true },

    status: {
      type: String,
      enum: SHIPMENT_STATUSES,
      default: "booking",
      index: true,
    },

    /* ── Shiprocket identifiers ── */
    provider: { type: String, default: "shiprocket" },
    shiprocketOrderId: { type: String, index: true },
    shipmentId: { type: String, index: true },
    /**
     * Unique when present, so two concurrent bookings cannot both persist an
     * AWB for the same parcel — the second write fails at the database rather
     * than silently creating a duplicate consignment.
     */
    awb: { type: String, unique: true, sparse: true, index: true },

    courierId: Number,
    courierName: String,
    trackingUrl: String,
    labelUrl: String,
    manifestUrl: String,

    /* ── what it costs and weighs ── */
    shippingCharge: { type: Number, default: 0 },
    codCharge: { type: Number, default: 0 },
    codAmount: { type: Number, default: 0 },
    weightKg: { type: Number, default: 0.5 },
    lengthCm: { type: Number, default: 15 },
    breadthCm: { type: Number, default: 12 },
    heightCm: { type: Number, default: 8 },

    /** What the courier promised when it was booked. */
    estimatedDays: String,
    estimatedDeliveryAt: Date,

    pickup: {
      requested: { type: Boolean, default: false },
      scheduledAt: Date,
      token: String,
      failureReason: String,
    },

    bookedAt: Date,
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    bookedByName: String,

    pickedUpAt: Date,
    deliveredAt: Date,
    rtoAt: Date,

    /** Set once RTO stock has been counted back in, so it happens only once. */
    rtoRestockedAt: Date,

    /** Last error from Shiprocket, kept so the admin sees why a booking failed. */
    failureReason: String,

    /** Raw courier wording, before it is mapped onto our vocabulary. */
    lastCourierStatus: String,
    lastSyncedAt: Date,
  },
  { timestamps: true },
);

shipmentSchema.index({ createdAt: -1 });
/* Only one live shipment per order — a cancelled or failed one may be retried. */
shipmentSchema.index(
  { order: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $nin: ["cancelled", "failed"] } },
  },
);

export const Shipment = mongoose.model("Shipment", shipmentSchema);
