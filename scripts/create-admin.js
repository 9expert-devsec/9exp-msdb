// scripts/create-admin.js
import "dotenv/config.js";
import dbConnect from "../src/lib/mongoose.js";
import AdminUser from "../src/models/AdminUser.js";
import { hashPassword } from "../src/lib/auth.js";

async function main() {
  const [name, email, password] = process.argv.slice(2);

  if (!name || !email || !password) {
    console.log('Usage: node scripts/create-admin.js "Name" email@example.com "password123"');
    process.exit(1);
  }

  await dbConnect();

  const normalizedEmail = email.trim().toLowerCase();
  const exists = await AdminUser.findOne({ email: normalizedEmail });
  if (exists) {
    console.log("❌ Email already exists:", normalizedEmail);
    process.exit(1);
  }

  // ใช้ hashPassword() ที่รองรับ AUTH_PEPPER และ BCRYPT_ROUNDS
  const passwordHash = await hashPassword(password);

  const admin = await AdminUser.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: "admin",
    isActive: true, // ✅ เพิ่มสถานะ active ไว้เลย
  });

  console.log("✅ Admin created successfully:");
  console.log({
    id: admin._id.toString(),
    email: admin.email,
    role: admin.role,
  });

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error creating admin:", err);
  process.exit(1);
});
