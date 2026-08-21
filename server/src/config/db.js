import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";

mongoose.set("strictQuery", true);

/**
 * Connects once and keeps the handle. `bufferCommands: false` makes a query
 * issued before the connection is ready fail loudly instead of hanging until
 * the default 10s buffer timeout.
 */
export async function connectDB() {
  mongoose.connection.on("connected", () =>
    logger.info(`MongoDB connected → ${redact(env.mongoUri)}`),
  );
  mongoose.connection.on("error", (err) =>
    logger.error("MongoDB connection error:", err.message),
  );
  mongoose.connection.on("disconnected", () =>
    logger.warn("MongoDB disconnected"),
  );

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 8000,
    bufferCommands: false,
    autoIndex: !env.isProd,
  });

  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.connection.close();
}

/** Keeps credentials out of the logs. */
function redact(uri) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@");
}
