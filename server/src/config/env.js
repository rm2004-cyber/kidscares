import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../.env") });

const bool = (v, fallback = false) =>
  v === undefined || v === "" ? fallback : /^(1|true|yes)$/i.test(v);
const num = (v, fallback) => (v === undefined || v === "" ? fallback : Number(v));

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",
  /* API_PORT is the internal API port (used by the Next rewrite and wait-on).
     Falls back to PORT for a standalone API service, then to a local default. */
  port: num(process.env.API_PORT ?? process.env.PORT, 5001),

  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  mongoUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/kidscares",

  jwtSecret: process.env.JWT_SECRET ?? "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "30d",
  cookieSecure: bool(process.env.COOKIE_SECURE, false),
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,

  otp: {
    length: num(process.env.OTP_LENGTH, 6),
    ttlMinutes: num(process.env.OTP_TTL_MINUTES, 10),
    maxAttempts: num(process.env.OTP_MAX_ATTEMPTS, 5),
    resendCooldownSeconds: num(process.env.OTP_RESEND_COOLDOWN_SECONDS, 30),
  },

  brevo: {
    smtpUser: process.env.BREVO_SMTP_USER ?? "",
    smtpKey: process.env.BREVO_SMTP_KEY ?? "",
    smtpHost: process.env.BREVO_SMTP_HOST ?? "smtp-relay.brevo.com",
    smtpPort: num(process.env.BREVO_SMTP_PORT, 587),
    senderEmail: process.env.EMAIL_FROM ?? process.env.BREVO_SENDER_EMAIL ?? "no-reply@kidscares.example",
    senderName: process.env.BREVO_SENDER_NAME ?? "KidsCares",
    /* Publicly reachable logo URL. When unset, emails embed the logo as an
       inline cid attachment instead — correct, but Gmail lists those under
       the paperclip icon, so production should always set this. */
    logoUrl: process.env.EMAIL_LOGO_URL ?? "",
    otpTemplateId: process.env.BREVO_OTP_TEMPLATE_ID
      ? Number(process.env.BREVO_OTP_TEMPLATE_ID)
      : null,
    get enabled() {
      return Boolean(this.smtpUser && this.smtpKey);
    },
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
    folder: process.env.CLOUDINARY_FOLDER ?? "kidscares",
    get enabled() {
      return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY);
    },
  },

  siteUrl: (process.env.PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? "",
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
    get enabled() {
      return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
    },
  },

  shiprocket: {
    email: process.env.SHIPROCKET_EMAIL ?? "",
    password: process.env.SHIPROCKET_PASSWORD ?? "",
    pickupLocation: process.env.SHIPROCKET_PICKUP_LOCATION ?? "Primary",
    channelId: process.env.SHIPROCKET_CHANNEL_ID ?? "",
    /* Static key Shiprocket sends as x-api-key on every tracking callback.
       Set the same value in their dashboard under the webhook settings. */
    webhookToken: process.env.SHIPROCKET_WEBHOOK_TOKEN ?? "",
    get enabled() {
      return Boolean(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD);
    },
  },

  warehouse: {
    name: process.env.WAREHOUSE_NAME ?? "KidsCares Warehouse",
    phone: process.env.WAREHOUSE_PHONE ?? "",
    email: process.env.WAREHOUSE_EMAIL ?? "",
    address: process.env.WAREHOUSE_ADDRESS ?? "",
    address2: process.env.WAREHOUSE_ADDRESS_2 ?? "",
    city: process.env.WAREHOUSE_CITY ?? "",
    state: process.env.WAREHOUSE_STATE ?? "",
    pincode: process.env.WAREHOUSE_PINCODE ?? "",
    country: process.env.WAREHOUSE_COUNTRY ?? "India",
  },

  tax: {
    gstRate: num(process.env.GST_RATE, 5),
    sellerState: (process.env.SELLER_STATE ?? "Punjab").trim(),
  },

  seedAdmin: {
    email: process.env.SEED_ADMIN_EMAIL ?? "admin@kidscares.example",
    password: process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe@123",
    name: process.env.SEED_ADMIN_NAME ?? "Store Owner",
  },
};

/**
 * Fails fast on misconfiguration rather than 500-ing on the first request that
 * happens to need the missing value.
 */
export function assertEnv() {
  const problems = [];

  if (!env.jwtSecret || env.jwtSecret === "change-me-to-a-long-random-string") {
    problems.push(
      env.isProd
        ? "JWT_SECRET must be set to a real secret in production"
        : "JWT_SECRET is using the placeholder value — fine locally, must change before deploy",
    );
  }
  if (!env.mongoUri) problems.push("MONGODB_URI is required");

  const fatal = problems.filter((p) => p.includes("must be set"));
  if (fatal.length) {
    throw new Error(`Invalid environment:\n  - ${fatal.join("\n  - ")}`);
  }
  return problems;
}
