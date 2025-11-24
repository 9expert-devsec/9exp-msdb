// /app/api/auth/login/route.js
import dbConnect from "@/lib/mongoose";
import AdminUser from "@/models/AdminUser";
import { verifyPassword, signAuthJWT, setAuthCookie } from "@/lib/auth";
import { withRateLimit } from "@/lib/ratelimit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const INVALID = { ok: false, error: "Invalid email or password" };

export const POST = withRateLimit({ points: 10, duration: 60 })(async (req) => {
  await dbConnect();

  // 1) รับและตรวจค่า input
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "")
    .trim()
    .toLowerCase();
  const password = String(body?.password || "");
  if (!email || !password) {
    return NextResponse.json(INVALID, { status: 401 });
  }

  // 2) หา user ที่ active
  const user = await AdminUser.findOne({ email, isActive: true }).lean();
  if (!user) return NextResponse.json(INVALID, { status: 401 });

  // 3) ตรวจรหัสผ่าน
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return NextResponse.json(INVALID, { status: 401 });

  // 4) สร้าง JWT
  const token = await signAuthJWT(
    {
      sub: String(user._id),
      email: user.email,
      name: user.name || "",
      role: user.role || "admin",
    },
    { expiresIn: process.env.AUTH_TTL || "7d" }
  );

  // 5) สร้าง Response + ตั้ง cookie ปลอดภัย
  const res = NextResponse.json({
    ok: true,
    user: {
      id: String(user._id),
      name: user.name || "",
      role: user.role || "admin",
    },
  });

  // ใช้ helper จาก lib/auth.js → __Host-auth
  setAuthCookie(res, token, {
    maxAgeSec: Number(process.env.AUTH_COOKIE_TTL_SEC || 604800),
  });

  return res;
});
