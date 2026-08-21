import { Router } from "express";
import * as c from "../controllers/cart.controller.js";
import { validate } from "../middleware/validate.js";
import * as s from "../validators/schemas.js";

const router = Router();

router.get("/", c.getCart);
router.post("/items", validate(s.cartAddSchema), c.addItem);
router.patch("/items", validate(s.cartUpdateSchema), c.updateItem);
router.delete("/items", validate(s.cartAddSchema.partial().required({ productId: true })), c.removeItem);
router.delete("/", c.clearCart);

router.post("/coupon", validate(s.couponApplySchema), c.applyCoupon);
router.delete("/coupon", c.removeCoupon);

export default router;
