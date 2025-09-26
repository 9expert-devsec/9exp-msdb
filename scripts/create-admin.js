// node scripts/create-admin.js "ชื่อแอดมิน" admin@example.com "password123"
import "dotenv/config.js";
import dbConnect from "../src/lib/mongoose.js";
import AdminUser from "../src/models/AdminUser.js";
import { hashPassword } from "../src/lib/auth.js";

const [name, email, password] = process.argv.slice(2);
if (!name || !email || !password) {
  console.log('Usage: node scripts/create-admin.js "Name" email@example.com "password"');
  process.exit(1);
}

await dbConnect();
const exists = await AdminUser.findOne({ email: email.toLowerCase() });
if (exists) {
  console.log("Email already exists.");
  process.exit(1);
}
const passwordHash = await hashPassword(password);
await AdminUser.create({ name, email: email.toLowerCase(), passwordHash, role: "admin" });
console.log("Admin created:", email);
process.exit(0);
