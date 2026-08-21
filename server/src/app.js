import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";

import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { webhookRouter } from "./routes/payment.routes.js";
import { attachUser } from "./middleware/auth.js";
import { attachGuestId } from "./middleware/guest.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { errorHandler, notFound } from "./middleware/error.js";

export function createApp() {
  const app = express();

  /* Behind PM2/nginx the client IP arrives in X-Forwarded-For; without this
     the rate limiter would key every request to the proxy's own address. */
  app.set("trust proxy", 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false, // the Next app sets its own
    }),
  );

  app.use(
    cors({
      origin(origin, cb) {
        // Same-origin and server-to-server calls arrive with no Origin header.
        if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`Origin ${origin} is not allowed`));
      },
      credentials: true,
    }),
  );

  app.use(compression());

  /* Razorpay's HMAC is computed over the exact bytes it sent, so this router
     must see the raw stream — mounting it after express.json() would leave
     only a re-encoded object and every signature check would fail. */
  app.use("/api/webhooks", webhookRouter);

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (!env.isProd) app.use(morgan("dev"));

  app.use(attachGuestId);
  app.use(attachUser);

  app.use("/api", apiLimiter, routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
