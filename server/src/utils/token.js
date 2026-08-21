import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const signToken = (payload) =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export const verifyToken = (token) => jwt.verify(token, env.jwtSecret);

export const AUTH_COOKIE = "kc_token";

/**
 * httpOnly so client JS can never read it, sameSite=lax so ordinary top-level
 * navigations still carry it while cross-site POSTs do not.
 */
export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax",
    domain: env.cookieDomain,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax",
    domain: env.cookieDomain,
    path: "/",
  });
}
