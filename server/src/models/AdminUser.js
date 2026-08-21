import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const adminSchema = new mongoose.Schema(
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
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["owner", "manager", "editor"],
      default: "editor",
    },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    lastLoginAt: Date,
  },
  { timestamps: true },
);

adminSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};

adminSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

adminSchema.methods.toPublic = function toPublic() {
  const o = this.toObject({ versionKey: false });
  delete o.passwordHash;
  return o;
};

export const AdminUser = mongoose.model("AdminUser", adminSchema);
