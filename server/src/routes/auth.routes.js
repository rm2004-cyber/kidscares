import { Router } from "express";
import * as c from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { otpLimiter, authLimiter } from "../middleware/rateLimit.js";
import * as s from "../validators/schemas.js";

const router = Router();

/* ── customer ─────────────────────────────────────────────────────────── */
router.post("/signup/request", otpLimiter, validate(s.signupRequestSchema), c.requestSignupOtp);
router.post("/signup/verify", authLimiter, validate(s.signupVerifySchema), c.verifySignupOtp);

router.post("/login", authLimiter, validate(s.loginSchema), c.login);
router.post("/login/otp/request", otpLimiter, validate(s.otpRequestSchema), c.requestLoginOtp);
router.post("/login/otp/verify", authLimiter, validate(s.otpVerifySchema), c.verifyLoginOtp);

router.post("/forgot-password", otpLimiter, validate(s.otpRequestSchema), c.forgotPassword);
router.post("/reset-password", authLimiter, validate(s.resetPasswordSchema), c.resetPassword);
router.post("/change-password", requireAuth, validate(s.changePasswordSchema), c.changePassword);

router.get("/me", c.me);
router.post("/logout", c.logout);

/* ── admin ────────────────────────────────────────────────────────────── */
router.post("/admin/login", authLimiter, validate(s.adminLoginSchema), c.adminLogin);
router.get("/admin/me", requireAdmin, c.adminMe);

export default router;
