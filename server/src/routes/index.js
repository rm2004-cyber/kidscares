import { Router } from "express";
import authRoutes from "./auth.routes.js";
import catalogRoutes from "./catalog.routes.js";
import cartRoutes from "./cart.routes.js";
import userRoutes from "./user.routes.js";
import contentRoutes from "./content.routes.js";
import adminRoutes from "./admin.routes.js";
import paymentRoutes from "./payment.routes.js";
import supportRoutes from "./support.routes.js";
import * as fulfil from "../controllers/fulfilment.controller.js";

const router = Router();

router.get("/health", (_req, res) =>
  res.json({ success: true, data: { status: "ok", at: new Date().toISOString() } }),
);

router.use("/auth", authRoutes);
router.use("/cart", cartRoutes);
router.use("/payments", paymentRoutes);
router.use("/support", supportRoutes);

/* Shiprocket posts here on every courier scan. Authenticated with the static
   x-api-key configured in their dashboard — see the handler. */
router.post("/webhooks/shiprocket", fulfil.shiprocketWebhook);
router.use("/me", userRoutes);
router.use("/admin", adminRoutes);
/* Content and catalogue mount at the root so the public URLs stay flat:
   /api/products, /api/categories, /api/banners … */
router.use("/", contentRoutes);
router.use("/", catalogRoutes);

export default router;
