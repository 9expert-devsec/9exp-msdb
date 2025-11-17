// scripts/reset-admin-password.js
import "dotenv/config";
import mongoose from "mongoose";
import { hashPassword } from "../src/lib/auth.js";
import AdminUser from "../src/models/AdminUser.js";

const MONGODB_URI = process.env.MONGODB_URI;
await mongoose.connect(MONGODB_URI, { dbName: process.env.MONGODB_DBNAME });

const email = "support@9expert.co.th";
const newPass = "9ExpertTraining007#"; // หรือกำหนดใหม่

const user = await AdminUser.findOne({ email });
if (!user) {
  console.log("User not found");
  process.exit(1);
}
user.passwordHash = await hashPassword(newPass);
await user.save();
console.log("Password updated");
process.exit(0);
