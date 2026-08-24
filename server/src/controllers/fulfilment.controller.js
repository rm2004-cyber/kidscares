import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import { fulfilmentService } from "../services/fulfilment.service.js";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";

/* ── admin: the part of the journey we control ── */

export const accept = asyncHandler(async (req, res) =>
  ok(
    res,
    await fulfilmentService.acceptOrder({
      orderId: req.params.id,
      admin: req.admin,
      note: req.body?.note,
    }),
  ),
);

export const pack = asyncHandler(async (req, res) =>
  ok(
    res,
    await fulfilmentService.packOrder({
      orderId: req.params.id,
      admin: req.admin,
      parcel: req.body?.parcel ?? req.body,
      note: req.body?.note,
    }),
  ),
);

export const courierOptions = asyncHandler(async (req, res) =>
  ok(res, await fulfilmentService.getCourierOptions(req.params.id)),
);

export const book = asyncHandler(async (req, res) =>
  ok(
    res,
    await fulfilmentService.bookShipment({
      orderId: req.params.id,
      courierId: req.body?.courierId,
      admin: req.admin,
    }),
  ),
);

export const timeline = asyncHandler(async (req, res) =>
  ok(res, await fulfilmentService.getTimeline(req.params.id)),
);

/* ── inbound tracking ── */

/**
 * Shiprocket's webhook.
 *
 * Answers 200 for anything it can parse, including events for shipments we do
 * not recognise. A non-2xx makes Shiprocket retry, and retrying will not make
 * an unknown AWB known — it only buries the real failures in noise.
 */
export const shiprocketWebhook = asyncHandler(async (req, res) => {
  const expected = env.shiprocket.webhookToken;

  /* Shiprocket authenticates with a static key set in their dashboard. Without
     one configured the endpoint stays shut: an open webhook lets anyone move
     any order to "delivered". */
  if (!expected) {
    logger.error("[webhook] SHIPROCKET_WEBHOOK_TOKEN is not set — rejecting");
    return res.status(503).json({ success: false, error: "Webhook not configured" });
  }

  const provided = req.get("x-api-key") ?? req.get("X-Api-Key");
  if (provided !== expected) {
    logger.warn("[webhook] rejected a Shiprocket callback with a bad x-api-key");
    return res.status(401).json({ success: false, error: "Unauthorised" });
  }

  const result = await fulfilmentService.handleShiprocketWebhook(req.body);

  if (!result.matched) {
    logger.warn(`[webhook] ignored an event: ${result.reason}`);
  }

  return res.json({ success: true, handled: result.matched });
});
