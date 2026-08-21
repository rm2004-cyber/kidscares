import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/response.js";
import { authService } from "../services/auth.service.js";
import { setAuthCookie, clearAuthCookie, signToken } from "../utils/token.js";

/* Controllers stay thin: validate-in (middleware), call the service, shape the
   response. All business rules live in the service layer. */

export const requestSignupOtp = asyncHandler(async (req, res) => {
  const result = await authService.requestSignupOtp(req.body);
  return ok(res, result);
});

export const verifySignupOtp = asyncHandler(async (req, res) => {
  const { user, token } = await authService.verifySignupOtp({
    ...req.body,
    guestId: req.guestId,
  });
  setAuthCookie(res, token);
  return created(res, { user, token });
});

export const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.loginWithPassword({
    ...req.body,
    guestId: req.guestId,
  });
  setAuthCookie(res, token);
  return ok(res, { user, token });
});

export const requestLoginOtp = asyncHandler(async (req, res) =>
  ok(res, await authService.requestLoginOtp(req.body)),
);

export const verifyLoginOtp = asyncHandler(async (req, res) => {
  const { user, token } = await authService.verifyLoginOtp({
    ...req.body,
    guestId: req.guestId,
  });
  setAuthCookie(res, token);
  return ok(res, { user, token });
});

export const forgotPassword = asyncHandler(async (req, res) =>
  ok(res, await authService.requestPasswordReset(req.body)),
);

export const resetPassword = asyncHandler(async (req, res) => {
  const { user, token } = await authService.resetPassword(req.body);
  setAuthCookie(res, token);
  return ok(res, { user, token });
});

export const changePassword = asyncHandler(async (req, res) =>
  ok(res, await authService.changePassword({ user: req.user, ...req.body })),
);

export const me = asyncHandler(async (req, res) =>
  ok(res, { user: req.user ? req.user.toPublic() : null }),
);

export const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  return ok(res, { ok: true });
});

export const adminLogin = asyncHandler(async (req, res) => {
  const { admin, token } = await authService.adminLogin(req.body);
  setAuthCookie(res, token);
  return ok(res, { admin, token });
});

export const adminMe = asyncHandler(async (req, res) =>
  ok(res, {
    admin: req.admin.toPublic(),
    /* Short-lived token for the socket handshake. The session itself lives in
       an httpOnly cookie the browser cannot read, and socket.io cannot send
       cookies cross-origin reliably — so the server mints a separate, 
       narrowly-scoped credential the client may hold in memory. */
    socketToken: signToken({ sub: req.admin.id, kind: "admin", role: req.admin.role }),
  }),
);
