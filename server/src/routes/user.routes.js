import { Router } from "express";
import * as c from "../controllers/user.controller.js";
import * as orders from "../controllers/order.controller.js";
import * as reviews from "../controllers/review.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import * as s from "../validators/schemas.js";

const router = Router();

/* Wishlist works for guests too, so it sits above requireAuth. */
router.get("/wishlist", c.getWishlist);
router.post("/wishlist/toggle", c.toggleWishlist);
router.delete("/wishlist", c.clearWishlist);

router.use(requireAuth);

router.patch("/profile", validate(s.profileSchema), c.updateProfile);

router.get("/addresses", c.listAddresses);
router.post("/addresses", validate(s.addressSchema), c.addAddress);
router.patch("/addresses/:id", validate(s.addressSchema.partial()), c.updateAddress);
router.delete("/addresses/:id", c.deleteAddress);
router.post("/addresses/:id/default", c.setDefaultAddress);

router.get("/reviews", reviews.myReviews);
router.get("/reviews/pending", reviews.reviewable);
router.post("/reviews", validate(s.reviewWriteSchema), reviews.submit);
router.delete("/reviews/:id", reviews.removeMine);

router.get("/orders", orders.listMyOrders);
router.post("/orders", validate(s.placeOrderSchema), orders.placeOrder);
router.get("/orders/:id", orders.getMyOrder);
router.get("/orders/:id/invoice", orders.invoice);
router.post("/orders/:id/cancel", orders.cancelMyOrder);

export default router;
