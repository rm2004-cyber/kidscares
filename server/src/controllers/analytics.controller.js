import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import { analyticsService } from "../services/analytics.service.js";

export const dashboard = asyncHandler(async (_req, res) =>
  ok(res, await analyticsService.dashboardStats()),
);

/** Immediate snapshot — the socket pushes updates after this first paint. */
export const liveSnapshot = asyncHandler(async (_req, res) =>
  ok(res, analyticsService.presence.snapshot()),
);

export const history = asyncHandler(async (req, res) =>
  ok(res, await analyticsService.trafficHistory(Number(req.query.minutes) || 120)),
);

export const events = asyncHandler(async (req, res) =>
  ok(res, await analyticsService.recentEvents(Number(req.query.limit) || 60)),
);

/** Beacon endpoint for clients that cannot hold a socket open. */
export const track = asyncHandler(async (req, res) => {
  await analyticsService.recordEvent({
    type: req.body.type ?? "pageview",
    label: req.body.label,
    path: req.body.path,
    city: req.body.city,
    device: req.body.device,
    referrer: req.body.referrer,
    user: req.user?.id,
  });
  return ok(res, { ok: true });
});
