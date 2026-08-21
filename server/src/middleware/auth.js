import { ApiError } from "../utils/ApiError.js";
import { AUTH_COOKIE, verifyToken } from "../utils/token.js";
import { User } from "../models/User.js";
import { AdminUser } from "../models/AdminUser.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/** Reads the JWT from the httpOnly cookie, falling back to a Bearer header. */
function readToken(req) {
  const fromCookie = req.cookies?.[AUTH_COOKIE];
  if (fromCookie) return fromCookie;

  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);

  return null;
}

/** Attaches req.user when a valid customer token is present; never throws. */
export const attachUser = asyncHandler(async (req, _res, next) => {
  const token = readToken(req);
  if (!token) return next();

  try {
    const payload = verifyToken(token);
    if (payload.kind !== "user") return next();
    const user = await User.findById(payload.sub);
    if (user && user.status === "active") req.user = user;
  } catch {
    // An invalid token is treated as "signed out" rather than an error, so a
    // stale cookie cannot lock a visitor out of public pages.
  }
  return next();
});

export const requireAuth = (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  return next();
};

/** Admin tokens are a separate `kind`, so a customer token can never pass. */
export const requireAdmin = asyncHandler(async (req, _res, next) => {
  const token = readToken(req);
  if (!token) return next(ApiError.unauthorized());

  const payload = verifyToken(token);
  if (payload.kind !== "admin") return next(ApiError.forbidden());

  const admin = await AdminUser.findById(payload.sub);
  if (!admin || admin.status !== "active") return next(ApiError.forbidden());

  req.admin = admin;
  return next();
});

/** Route-level role check, e.g. requireRole("owner", "manager"). */
export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.admin) return next(ApiError.unauthorized());
    if (!roles.includes(req.admin.role)) return next(ApiError.forbidden());
    return next();
  };
