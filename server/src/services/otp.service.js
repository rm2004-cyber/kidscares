import crypto from "node:crypto";
import { Otp } from "../models/Otp.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { sendOtpEmail } from "./mailer.js";
import { logger } from "../config/logger.js";

/** Uniform random digits — Math.random is not acceptable for a security code. */
function generateCode(length = env.otp.length) {
  const max = 10 ** length;
  return String(crypto.randomInt(0, max)).padStart(length, "0");
}

export async function issueOtp({ identifier, purpose, payload = {} }) {
  const id = identifier.trim().toLowerCase();

  /* Cooldown: stops someone hammering "resend" and burning email quota. */
  const recent = await Otp.findOne({
    identifier: id,
    purpose,
    consumedAt: { $exists: false },
  }).sort({ createdAt: -1 });

  if (recent) {
    const elapsed = (Date.now() - recent.createdAt.getTime()) / 1000;
    if (elapsed < env.otp.resendCooldownSeconds) {
      throw ApiError.tooMany(
        `Please wait ${Math.ceil(env.otp.resendCooldownSeconds - elapsed)}s before requesting another code`,
      );
    }
    // Only one live code per identifier+purpose.
    await Otp.deleteMany({ identifier: id, purpose, consumedAt: { $exists: false } });
  }

  const code = generateCode();
  const record = new Otp({
    identifier: id,
    purpose,
    payload,
    expiresAt: new Date(Date.now() + env.otp.ttlMinutes * 60_000),
  });
  await record.setCode(code);
  await record.save();

  const delivery = await sendOtpEmail({
    to: id,
    code,
    purpose,
    minutes: env.otp.ttlMinutes,
  });

  if (!delivery.delivered) {
    logger.warn(`[otp] code for ${id} is ${code} (email not delivered)`);
  }

  return {
    expiresInMinutes: env.otp.ttlMinutes,
    resendInSeconds: env.otp.resendCooldownSeconds,
    // Only ever exposed outside production, so local testing does not need email.
    ...(env.isProd || delivery.delivered ? {} : { devCode: code }),
  };
}

export async function verifyOtp({ identifier, purpose, code }) {
  const id = identifier.trim().toLowerCase();

  const record = await Otp.findOne({
    identifier: id,
    purpose,
    consumedAt: { $exists: false },
  }).sort({ createdAt: -1 });

  if (!record) throw ApiError.badRequest("No active code. Please request a new one.");
  if (record.expiresAt < new Date()) {
    throw ApiError.badRequest("That code has expired. Please request a new one.");
  }
  if (record.attempts >= env.otp.maxAttempts) {
    throw ApiError.tooMany("Too many incorrect attempts. Please request a new code.");
  }

  const matches = await record.verifyCode(String(code));
  if (!matches) {
    record.attempts += 1;
    await record.save();
    const left = Math.max(0, env.otp.maxAttempts - record.attempts);
    throw ApiError.badRequest(
      left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Incorrect code.",
    );
  }

  record.consumedAt = new Date();
  await record.save();

  return { payload: record.payload ?? {} };
}

export const otpService = { issueOtp, verifyOtp };
