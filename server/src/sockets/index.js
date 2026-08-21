import { Server } from "socket.io";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { presence, persistSample, recordEvent } from "../services/analytics.service.js";
import { verifyToken } from "../utils/token.js";

const ADMIN_ROOM = "admin";

/**
 * Realtime layer.
 *
 * Storefront visitors join anonymously and report their page; admins
 * authenticate with their JWT and join a private room that receives presence
 * snapshots. Snapshots are pushed on a timer rather than on every event, so a
 * traffic spike cannot turn into a broadcast storm.
 */
export function initSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigins, credentials: true },
    path: "/socket.io",
  });

  io.on("connection", (socket) => {
    /* ---------------------------- storefront ---------------------------- */

    socket.on("presence:join", (data = {}) => {
      presence.join(socket.id, {
        path: data.path ?? "/",
        title: data.title ?? "Home",
        device: data.device ?? "desktop",
        city: data.city ?? "Unknown",
        referrer: data.referrer ?? "Direct",
      });
    });

    socket.on("presence:move", (data = {}) => {
      presence.move(socket.id, { path: data.path, title: data.title });
      recordEvent({
        type: "pageview",
        label: `Viewing ${data.title ?? data.path}`,
        path: data.path,
        city: data.city,
        device: data.device,
      });
      io.to(ADMIN_ROOM).emit("event", {
        id: `${socket.id}-${Date.now()}`,
        type: "pageview",
        label: `Viewing ${data.title ?? data.path}`,
        path: data.path,
        city: data.city ?? "Unknown",
        at: Date.now(),
      });
    });

    /** Shopper actions worth showing live: add to cart, wishlist, order… */
    socket.on("event", (data = {}) => {
      const payload = {
        id: `${socket.id}-${Date.now()}`,
        type: data.type ?? "pageview",
        label: data.label ?? "",
        path: data.path ?? "/",
        city: data.city ?? "Unknown",
        at: Date.now(),
      };
      recordEvent({ ...payload, device: data.device });
      io.to(ADMIN_ROOM).emit("event", payload);
    });

    /* ------------------------------ admin ------------------------------- */

    socket.on("admin:subscribe", ({ token } = {}, ack) => {
      try {
        const claims = verifyToken(token);
        if (claims.kind !== "admin") throw new Error("not an admin token");
        socket.join(ADMIN_ROOM);
        socket.emit("presence:update", presence.snapshot());
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false, error: "Not authorised" });
      }
    });

    socket.on("disconnect", () => presence.leave(socket.id));
  });

  /* One snapshot per second to admins only — cheap, and the dashboard reads
     as genuinely live without every visitor event triggering a fan-out. */
  const pushInterval = setInterval(() => {
    if (io.sockets.adapter.rooms.get(ADMIN_ROOM)?.size) {
      io.to(ADMIN_ROOM).emit("presence:update", presence.snapshot());
    }
  }, 1000);

  /* Durable history, once a minute. */
  const sampleInterval = setInterval(() => {
    persistSample().catch((e) => logger.error("[socket] sample failed:", e.message));
  }, 60_000);

  io.close = ((original) =>
    function close(...args) {
      clearInterval(pushInterval);
      clearInterval(sampleInterval);
      return original.apply(this, args);
    })(io.close);

  logger.success("Socket.io ready on /socket.io");
  return io;
}
