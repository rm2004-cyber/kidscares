import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import { shiprocketService } from "../services/shiprocket.service.js";
import { Order } from "../models/Order.js";
import { ApiError } from "../utils/ApiError.js";

/** Retry the Shiprocket handoff when it failed during the status change. */
export const createShipment = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate("user", "name email phone");
  if (!order) throw ApiError.notFound("Order not found");
  return ok(res, await shiprocketService.createShipment(order._id, order.user));
});

export const assignAwb = asyncHandler(async (req, res) =>
  ok(res, await shiprocketService.assignAwb(req.body.shipmentId, req.body.courierId)),
);

export const requestPickup = asyncHandler(async (req, res) =>
  ok(res, await shiprocketService.requestPickup(req.body.shipmentId)),
);

export const generateLabel = asyncHandler(async (req, res) =>
  ok(res, await shiprocketService.generateLabel(req.body.shipmentId)),
);

export const syncOne = asyncHandler(async (req, res) =>
  ok(res, await shiprocketService.syncOrderTracking(req.params.id)),
);

export const syncAll = asyncHandler(async (_req, res) =>
  ok(res, await shiprocketService.syncAllActiveShipments()),
);

export const serviceability = asyncHandler(async (req, res) =>
  ok(
    res,
    await shiprocketService.checkServiceability({
      pickupPincode: req.query.from,
      deliveryPincode: req.query.to,
      weight: req.query.weight,
      cod: req.query.cod,
    }),
  ),
);

/**
 * Shiprocket status webhook.
 *
 * Open by design — Shiprocket does not sign its callbacks — so the payload is
 * only used to *trigger* a pull. The authoritative read still goes back to
 * Shiprocket's tracking API, which a spoofed request cannot influence.
 */
export const webhook = asyncHandler(async (req, res) => {
  const awb = req.body?.awb ?? req.body?.awb_code;
  if (!awb) return res.status(200).json({ received: true, matched: false });

  const order = await Order.findOne({ "shipping_details.awb": String(awb) });
  if (!order) return res.status(200).json({ received: true, matched: false });

  const result = await shiprocketService.syncOrderTracking(order._id);
  return res.status(200).json({ received: true, matched: true, ...result });
});
