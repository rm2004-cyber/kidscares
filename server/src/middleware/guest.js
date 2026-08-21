import crypto from "node:crypto";

export const GUEST_COOKIE = "kc_guest";

/**
 * Gives every visitor a stable id so a cart can exist before they sign in.
 * Not httpOnly-critical, but kept httpOnly anyway — the client never needs it.
 */
export function attachGuestId(req, res, next) {
  let id = req.cookies?.[GUEST_COOKIE];

  if (!id) {
    id = crypto.randomUUID();
    res.cookie(GUEST_COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 24 * 60 * 60 * 1000,
      path: "/",
    });
  }

  req.guestId = id;
  next();
}
