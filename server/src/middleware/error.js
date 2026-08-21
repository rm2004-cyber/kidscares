import mongoose from "mongoose";
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

export function notFound(req, _res, next) {
  next(ApiError.notFound(`No route for ${req.method} ${req.originalUrl}`));
}

/**
 * Single exit point for every failure.
 *
 * Anything that is not an ApiError is treated as a bug: it is logged in full
 * and reported to the caller as a generic 500, so stack traces and driver
 * messages never reach the client.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = 500;
  let code = "INTERNAL_ERROR";
  let message = "Something went wrong. Please try again.";
  let details;

  if (err instanceof ApiError) {
    ({ status, code, message, details } = err);
  } else if (err instanceof ZodError) {
    status = 422;
    code = "VALIDATION_ERROR";
    message = "Some fields need attention";
    details = err.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 422;
    code = "VALIDATION_ERROR";
    message = "Some fields need attention";
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    code = "BAD_REQUEST";
    message = `Invalid ${err.path}`;
  } else if (err?.code === 11000) {
    status = 409;
    code = "CONFLICT";
    const field = Object.keys(err.keyPattern ?? {})[0] ?? "value";
    message = `That ${field} is already taken`;
  } else if (err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError") {
    status = 401;
    code = "UNAUTHORIZED";
    message = "Your session has expired. Please sign in again.";
  }

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl}`, err.stack ?? err);
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(env.isProd || status < 500 ? {} : { stack: err.stack }),
    },
  });
}
