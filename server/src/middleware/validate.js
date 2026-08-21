import { ZodError } from "zod";

/**
 * Validates and REPLACES the request part with the parsed result, so handlers
 * receive coerced, trimmed, defaulted values rather than raw strings.
 */
export const validate =
  (schema, source = "body") =>
  (req, _res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      if (source === "query") req.validatedQuery = parsed;
      else req[source] = parsed;
      next();
    } catch (err) {
      next(err instanceof ZodError ? err : err);
    }
  };
