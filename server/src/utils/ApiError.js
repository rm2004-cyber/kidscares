/**
 * An error the API is willing to describe to the caller.
 *
 * Anything thrown that is NOT an ApiError is treated as a bug by the error
 * middleware and reported as a generic 500, so internals never leak.
 */
export class ApiError extends Error {
  constructor(status, message, { code, details } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code ?? httpCode(status);
    this.details = details;
    this.expected = true;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(msg = "Bad request", opts) { return new ApiError(400, msg, opts); }
  static unauthorized(msg = "Please sign in to continue", opts) { return new ApiError(401, msg, opts); }
  static forbidden(msg = "You do not have access to this", opts) { return new ApiError(403, msg, opts); }
  static notFound(msg = "Not found", opts) { return new ApiError(404, msg, opts); }
  static conflict(msg = "Already exists", opts) { return new ApiError(409, msg, opts); }
  static tooMany(msg = "Too many requests", opts) { return new ApiError(429, msg, opts); }
  static internal(msg = "Something went wrong", opts) { return new ApiError(500, msg, opts); }
}

function httpCode(status) {
  return (
    {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      422: "VALIDATION_ERROR",
      429: "RATE_LIMITED",
    }[status] ?? "INTERNAL_ERROR"
  );
}
