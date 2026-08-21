import { Router } from "express";
import * as c from "../controllers/content.controller.js";
import * as analytics from "../controllers/analytics.controller.js";

const router = Router();

router.get("/banners", c.getBanners);
router.get("/deals", c.getDeals);
router.get("/coupons", c.getCoupons);
router.get("/settings", c.getSettings);

/** Open beacon: analytics must work for signed-out visitors too. */
router.post("/track", analytics.track);

export default router;
