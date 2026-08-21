import { Router } from "express";
import * as c from "../controllers/support.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/* Every support action is tied to an order, so all of it needs a session. */
router.use(requireAuth);

router.get("/chat/context", c.chatContext);
router.get("/orders/:orderId/status", c.orderStatusLine);
router.get("/orders/:orderId/cancellation", c.cancellationContext);
router.post("/orders/:orderId/cancellation", c.requestCancellation);

export default router;
