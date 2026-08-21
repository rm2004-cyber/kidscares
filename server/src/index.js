import http from "node:http";

import { createApp } from "./app.js";
import { env, assertEnv } from "./config/env.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { initSockets } from "./sockets/index.js";
import { logger } from "./config/logger.js";
import { shiprocketService } from "./services/shiprocket.service.js";

async function main() {
  for (const warning of assertEnv()) logger.warn(warning);

  /* Mongo connects BEFORE the port opens. The frontend waits on this port, so
     by the time Next starts the API is genuinely ready — not just listening. */
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);
  const io = initSockets(server);

  server.listen(env.port, () => {
    logger.success(`API listening on http://localhost:${env.port}/api`);
  });

  /* Courier scans arrive on Shiprocket's webhook, but webhooks get missed.
     This sweep is the safety net: every in-flight shipment is re-checked on a
     timer so a dropped callback cannot leave an order stuck on a stale status. */
  const trackingSweep = env.shiprocket.enabled
    ? setInterval(
        () =>
          shiprocketService
            .syncAllActiveShipments()
            .catch((e) => logger.error("[tracking] sweep failed:", e.message)),
        15 * 60_000,
      )
    : null;

  if (!env.shiprocket.enabled) {
    logger.warn("Shiprocket not configured — tracking sync disabled");
  }
  if (!env.razorpay.enabled) {
    logger.warn("Razorpay not configured — online payments and refunds disabled");
  }
  if (!env.brevo.enabled) {
    logger.warn("Brevo not configured — emails are logged, not delivered");
  }

  const shutdown = async (signal) => {
    logger.warn(`${signal} received — shutting down`);
    if (trackingSweep) clearInterval(trackingSweep);
    io.close();
    server.close();
    await disconnectDB();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection:", reason);
  });
}

main().catch((err) => {
  logger.error("Failed to start:", err);
  process.exit(1);
});
