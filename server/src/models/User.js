import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, enum: ["Home", "Work", "Other"], default: "Home" },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    landmark: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, match: /^\d{6}$/ },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: { type: String, trim: true, index: true },
    // Optional: OTP-only sign-ups never set one.
    passwordHash: { type: String, select: false },

    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },

    avatar: String,
    dob: Date,
    gender: { type: String, enum: ["male", "female", "other", ""], default: "" },

    addresses: [addressSchema],

    preferences: {
      offers: { type: Boolean, default: true },
      restock: { type: Boolean, default: true },
      newsletter: { type: Boolean, default: false },
      channels: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: false },
      },
    },

    status: { type: String, enum: ["active", "blocked"], default: "active" },
    lastLoginAt: Date,
  },
  { timestamps: true },
);

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plain, this.passwordHash);
};

/** Never let the hash escape through res.json. */
userSchema.methods.toPublic = function toPublic() {
  const o = this.toObject({ versionKey: false });
  delete o.passwordHash;
  return o;
};

export const User = mongoose.model("User", userSchema);
