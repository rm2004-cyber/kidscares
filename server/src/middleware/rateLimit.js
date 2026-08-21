import rateLimit from "express-rate-limit";

const base = {
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "RATE_LIMITED", message: "Too many requests. Please wait a moment." },
  },
};

export const apiLimiter = rateLimit({ ...base, windowMs: 60_000, limit: 300 });

/* OTP endpoints are the expensive, abusable ones — each send costs an email
   and each verify is a brute-force opportunity. */
export const otpLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60_000,
  limit: 8,
  keyGenerator: (req) =>
    `${req.ip}:${(req.body?.email ?? req.body?.identifier ?? "").toLowerCase()}`,
});

export const authLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 25 });
