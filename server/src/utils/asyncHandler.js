/**
 * Wraps an async route handler so a rejected promise reaches Express's error
 * middleware. Without this, an `await` that throws inside a handler becomes an
 * unhandled rejection and the request hangs until the client times out.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
