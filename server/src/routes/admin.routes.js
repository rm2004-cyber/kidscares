import { Router } from "express";
import multer from "multer";

import * as catalog from "../controllers/catalog.controller.js";
import * as content from "../controllers/content.controller.js";
import * as orders from "../controllers/order.controller.js";
import * as users from "../controllers/user.controller.js";
import * as analytics from "../controllers/analytics.controller.js";
import * as upload from "../controllers/upload.controller.js";
import * as payments from "../controllers/payment.controller.js";
import * as support from "../controllers/support.controller.js";
import * as shipments from "../controllers/shipment.controller.js";
import * as reviews from "../controllers/review.controller.js";
import * as returns from "../controllers/return.controller.js";

import { requireAdmin, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import * as s from "../validators/schemas.js";

const router = Router();

/* Every route below this line requires a valid admin token. */
router.use(requireAdmin);

/* ── dashboard & live traffic ─────────────────────────────────────────── */
router.get("/stats", analytics.dashboard);
router.get("/live", analytics.liveSnapshot);
router.get("/live/history", analytics.history);
router.get("/live/events", analytics.events);

/* ── catalogue ────────────────────────────────────────────────────────── */
router.get("/products", validate(s.productQuerySchema, "query"), catalog.listProducts);
router.post("/products", validate(s.productWriteSchema), catalog.createProduct);
router.patch("/products/:id", validate(s.productPatchSchema), catalog.updateProduct);
router.delete("/products/:id", requireRole("owner", "manager"), catalog.deleteProduct);

router.get("/categories", catalog.listCategories);
router.post("/categories", validate(s.categoryWriteSchema), catalog.createCategory);
router.patch("/categories/:id", validate(s.categoryWriteSchema.partial()), catalog.updateCategory);
router.delete("/categories/:id", requireRole("owner", "manager"), catalog.deleteCategory);
router.post("/categories/refresh-counts", catalog.refreshCounts);

router.get("/brands", catalog.listBrands);
router.post("/brands", validate(s.brandWriteSchema), catalog.createBrand);
router.patch("/brands/:id", validate(s.brandWriteSchema.partial()), catalog.updateBrand);
router.delete("/brands/:id", requireRole("owner", "manager"), catalog.deleteBrand);

/* ── merchandising ────────────────────────────────────────────────────── */
router.get("/banners", content.adminListBanners);
router.post("/banners", validate(s.bannerWriteSchema), content.createBanner);
router.patch("/banners/:id", validate(s.bannerWriteSchema.partial()), content.updateBanner);
router.delete("/banners/:id", content.deleteBanner);
router.post("/banners/reorder", content.reorderBanners);

router.get("/deals", content.adminListDeals);
router.post("/deals", validate(s.dealWriteSchema), content.createDeal);
router.patch("/deals/:id", validate(s.dealWriteSchema.partial()), content.updateDeal);
router.delete("/deals/:id", content.deleteDeal);
router.post("/deals/ends-at", content.setDealsEndsAt);

router.get("/coupons", content.adminListCoupons);
router.post("/coupons", validate(s.couponWriteSchema), content.createCoupon);
router.patch("/coupons/:id", validate(s.couponWriteSchema.partial()), content.updateCoupon);
router.delete("/coupons/:id", content.deleteCoupon);

/* ── operations ───────────────────────────────────────────────────────── */
router.get("/orders", orders.listOrders);
router.get("/orders/:id/invoice", orders.adminInvoice);
router.patch("/orders/:id/status", validate(s.orderStatusSchema), orders.updateStatus);
router.get("/customers", users.listCustomers);

router.get("/settings", content.getSettings);
router.patch("/settings", requireRole("owner", "manager"), content.updateSettings);

/* ── returns ──────────────────────────────────────────────────────────── */
router.get("/returns", returns.list);
router.post("/returns/:id/resolve", requireRole("owner", "manager"), validate(s.returnResolveSchema), returns.resolve);
router.post(
  "/returns/:id/complete",
  requireRole("owner", "manager"),
  validate(s.returnCompleteSchema),
  returns.complete,
);
router.post(
  "/returns/:id/retry-refund",
  requireRole("owner", "manager"),
  validate(s.returnCompleteSchema),
  returns.retryRefund,
);
router.post(
  "/returns/:id/mark-refund-paid",
  requireRole("owner", "manager"),
  validate(s.markRefundPaidSchema),
  returns.markRefundPaid,
);
router.post("/returns/:id/retry-pickup", requireRole("owner", "manager"), returns.retryPickup);

/* ── reviews ──────────────────────────────────────────────────────────── */
router.get("/reviews", reviews.list);
router.post("/reviews/:id/moderate", validate(s.reviewModerateSchema), reviews.moderate);
router.delete("/reviews/:id", requireRole("owner", "manager"), reviews.remove);

/* ── payments panel ───────────────────────────────────────────────────── */
router.get("/payments/summary", payments.summary);
router.get("/payments/series", payments.series);
router.get("/payments", payments.list);
router.post("/payments/refund", requireRole("owner", "manager"), payments.refund);

/* ── cancellation requests ────────────────────────────────────────────── */
router.get("/cancellations", support.listCancellations);
router.post("/cancellations/:id/resolve", requireRole("owner", "manager"), support.resolveCancellation);
router.post("/cancellations/retry-refund", requireRole("owner", "manager"), support.retryRefund);

/* ── shipments (Shiprocket) ───────────────────────────────────────────── */
router.post("/orders/:id/ship", shipments.createShipment);
router.post("/orders/:id/sync", shipments.syncOne);
router.post("/shipments/awb", shipments.assignAwb);
router.post("/shipments/pickup", shipments.requestPickup);
router.post("/shipments/label", shipments.generateLabel);
router.post("/shipments/sync-all", shipments.syncAll);
router.get("/shipments/serviceability", shipments.serviceability);

/* ── media ────────────────────────────────────────────────────────────── */
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) =>
    file.mimetype.startsWith("image/")
      ? cb(null, true)
      : cb(new Error("Only image uploads are allowed")),
});

router.post("/upload", memoryUpload.array("files", 10), upload.uploadImages);
router.delete("/upload", upload.deleteImage);

export default router;
