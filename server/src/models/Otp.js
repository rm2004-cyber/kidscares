import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const otpSchema = new mongoose.Schema(
  {
    // Email or phone the code was sent to.
    identifier: { type: String, required: true, lowercase: true, trim: true, index: true },
    purpose: {
      type: String,
      enum: ["signup", "login", "reset", "verify"],
      required: true,
    },
    // Hashed: a leaked DB dump must not hand out live codes.
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    consumedAt: Date,
    /** Identity captured at request time, applied once the code is verified. */
    payload: {
      name: String,
      email: String,
      phone: String,
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

/* TTL index: Mongo removes expired codes on its own, so nothing accumulates. */
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

otpSchema.methods.setCode = async function setCode(code) {
  this.codeHash = await bcrypt.hash(code, 10);
};

otpSchema.methods.verifyCode = function verifyCode(code) {
  return bcrypt.compare(code, this.codeHash);
};

export const Otp = mongoose.model("Otp", otpSchema);
