import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const AdminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: "Admin" },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["owner", "manager", "kitchen"], default: "manager" },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date }
  },
  { timestamps: true }
);

AdminSchema.methods.verify = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

AdminSchema.statics.hash = function (plain) {
  return bcrypt.hash(plain, 10);
};

export const Admin = mongoose.model("Admin", AdminSchema);
