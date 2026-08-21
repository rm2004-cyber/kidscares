import { User } from "../models/User.js";
import { AdminUser } from "../models/AdminUser.js";
import { Cart } from "../models/Cart.js";
import { Wishlist } from "../models/Wishlist.js";
import { ApiError } from "../utils/ApiError.js";
import { signToken } from "../utils/token.js";
import { issueOtp, verifyOtp } from "./otp.service.js";

const userToken = (user) => signToken({ sub: user.id, kind: "user" });
const adminToken = (admin) => signToken({ sub: admin.id, kind: "admin", role: admin.role });

/**
 * Folds an anonymous cart and wishlist into the account at the moment of
 * sign-in. Without this, anything added before signing in silently disappears
 * — the single most common way to lose a sale.
 */
export async function mergeGuestData({ userId, guestId }) {
  if (!guestId) return;

  const [guestCart, userCart] = await Promise.all([
    Cart.findOne({ guestId }),
    Cart.findOne({ user: userId }),
  ]);

  if (guestCart?.lines?.length) {
    if (!userCart) {
      guestCart.user = userId;
      guestCart.guestId = undefined;
      await guestCart.save();
    } else {
      for (const line of guestCart.lines) {
        const match = userCart.lines.find(
          (l) =>
            String(l.product) === String(line.product) &&
            l.size === line.size &&
            l.color === line.color,
        );
        if (match) match.qty = Math.min(10, match.qty + line.qty);
        else userCart.lines.push(line);
      }
      await userCart.save();
      await guestCart.deleteOne();
    }
  }

  const [guestWish, userWish] = await Promise.all([
    Wishlist.findOne({ guestId }),
    Wishlist.findOne({ user: userId }),
  ]);

  if (guestWish?.products?.length) {
    if (!userWish) {
      guestWish.user = userId;
      guestWish.guestId = undefined;
      await guestWish.save();
    } else {
      const merged = new Set([
        ...userWish.products.map(String),
        ...guestWish.products.map(String),
      ]);
      userWish.products = [...merged];
      await userWish.save();
      await guestWish.deleteOne();
    }
  }
}

/* ─────────────────────────────── customer ─────────────────────────────── */

export async function requestSignupOtp({ name, email, phone }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw ApiError.conflict("An account with that email already exists. Try signing in.");
  }
  return issueOtp({
    identifier: email,
    purpose: "signup",
    payload: { name, email: email.toLowerCase(), phone },
  });
}

export async function verifySignupOtp({ email, code, password, guestId }) {
  const { payload } = await verifyOtp({ identifier: email, purpose: "signup", code });

  let user = await User.findOne({ email: email.toLowerCase() });
  if (user) throw ApiError.conflict("That account already exists. Please sign in.");

  user = new User({
    name: payload.name ?? "Customer",
    email: (payload.email ?? email).toLowerCase(),
    phone: payload.phone,
    emailVerified: true,
    lastLoginAt: new Date(),
  });
  if (password) await user.setPassword(password);
  await user.save();

  await mergeGuestData({ userId: user.id, guestId });

  return { user: user.toPublic(), token: userToken(user) };
}

export async function loginWithPassword({ identifier, password, guestId }) {
  const id = identifier.trim().toLowerCase();
  const user = await User.findOne({
    $or: [{ email: id }, { phone: identifier.trim() }],
  }).select("+passwordHash");

  // Same message for "no such user" and "wrong password" so the endpoint
  // cannot be used to discover which emails are registered.
  const invalid = ApiError.unauthorized("Incorrect email or password.");
  if (!user) throw invalid;
  if (user.status !== "active") throw ApiError.forbidden("This account has been disabled.");
  if (!user.passwordHash) {
    throw ApiError.badRequest("This account uses email OTP. Request a code instead.");
  }
  if (!(await user.verifyPassword(password))) throw invalid;

  user.lastLoginAt = new Date();
  await user.save();

  await mergeGuestData({ userId: user.id, guestId });

  return { user: user.toPublic(), token: userToken(user) };
}

export async function requestLoginOtp({ email }) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw ApiError.notFound("No account found with that email.");
  return issueOtp({ identifier: email, purpose: "login" });
}

export async function verifyLoginOtp({ email, code, guestId }) {
  await verifyOtp({ identifier: email, purpose: "login", code });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw ApiError.notFound("No account found with that email.");

  user.emailVerified = true;
  user.lastLoginAt = new Date();
  await user.save();

  await mergeGuestData({ userId: user.id, guestId });

  return { user: user.toPublic(), token: userToken(user) };
}

export async function requestPasswordReset({ email }) {
  const user = await User.findOne({ email: email.toLowerCase() });
  // Always report success: revealing which emails exist is an enumeration leak.
  if (!user) {
    return { expiresInMinutes: 10, resendInSeconds: 30, sent: true };
  }
  return { ...(await issueOtp({ identifier: email, purpose: "reset" })), sent: true };
}

export async function resetPassword({ email, code, password }) {
  await verifyOtp({ identifier: email, purpose: "reset", code });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw ApiError.notFound("No account found with that email.");

  await user.setPassword(password);
  await user.save();

  return { user: user.toPublic(), token: userToken(user) };
}

export async function changePassword({ user, currentPassword, newPassword }) {
  const fresh = await User.findById(user.id).select("+passwordHash");
  if (fresh.passwordHash && !(await fresh.verifyPassword(currentPassword))) {
    throw ApiError.badRequest("Your current password is incorrect.");
  }
  await fresh.setPassword(newPassword);
  await fresh.save();
  return { ok: true };
}

/* ──────────────────────────────── admin ───────────────────────────────── */

export async function adminLogin({ email, password }) {
  const admin = await AdminUser.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  const invalid = ApiError.unauthorized("Incorrect email or password.");
  if (!admin) throw invalid;
  if (admin.status !== "active") throw ApiError.forbidden("This admin account is disabled.");
  if (!(await admin.verifyPassword(password))) throw invalid;

  admin.lastLoginAt = new Date();
  await admin.save();

  return { admin: admin.toPublic(), token: adminToken(admin) };
}

export const authService = {
  mergeGuestData,
  requestSignupOtp,
  verifySignupOtp,
  loginWithPassword,
  requestLoginOtp,
  verifyLoginOtp,
  requestPasswordReset,
  resetPassword,
  changePassword,
  adminLogin,
};
