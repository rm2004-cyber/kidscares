import { Router } from "express";
import express from "express";
import * as c from "../controllers/payment.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/* The webhook needs the RAW body for HMAC verification, so it is mounted with
   its own parser BEFORE express.json() would have consumed the stream. */
export const webhookRouter = Router();
webhookRouter.post(
  "/razorpay",
  express.raw({ type: "application/json" }),
  c.webhook,
);

router.post("/order", requireAuth, c.createPaymentOrder);
router.post("/verify", requireAuth, c.verifyPayment);

export default router;
