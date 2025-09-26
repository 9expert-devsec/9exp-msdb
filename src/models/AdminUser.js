import mongoose, { Schema } from "mongoose";

const AdminUserSchema = new Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "admin" }, // future: superadmin, editor ฯลฯ
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.AdminUser || mongoose.model("AdminUser", AdminUserSchema);
