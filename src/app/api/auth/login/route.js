// /app/api/auth/login/route.js
import dbConnect from "@/lib/mongoose";
import AdminUser from "@/models/AdminUser";
import { verifyPassword, signAuthJWT, setAuthCookie } from "@/lib/auth";
import { withRateLimit } from "@/lib/ratelimit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const INVALID = { ok: false, error: "Invalid email or password" };

// ✅ ทำ bcrypt hash ไว้ค่าเดียว แล้วใส่ env เช่น:
// DUMMY_PASSWORD_HASH=$2b$10$.........
const DUMMY_HASH = process.env.DUMMY_PASSWORD_HASH || "";

export const POST = withRateLimit({ points: 10, duration: 60 })(async (req) => {
  await dbConnect();

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "")
    .trim()
    .toLowerCase();
  const password = String(body?.password || "");

  // ✅ length caps กัน payload แปลก ๆ
  if (!email || !password) return NextResponse.json(INVALID, { status: 401 });
  if (email.length > 254 || password.length > 200) {
    // ยังตอบ generic เหมือนเดิม
    return NextResponse.json(INVALID, { status: 401 });
  }

  const user = await AdminUser.findOne({ email, isActive: true }).lean();

  // ✅ timing hardening: ถ้าไม่เจอ user ให้ทำ dummy verify เพื่อลด timing diff
  if (!user) {
    if (DUMMY_HASH) {
      try {
        await verifyPassword(password, DUMMY_HASH);
      } catch {
        // ignore
      }
    }
    return NextResponse.json(INVALID, { status: 401 });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return NextResponse.json(INVALID, { status: 401 });

  const token = await signAuthJWT(
    {
      sub: String(user._id),
      email: user.email,
      name: user.name || "",
      role: user.role || "admin",
    },
    { expiresIn: process.env.AUTH_TTL || "7d" },
  );

  const res = NextResponse.json({
    ok: true,
    user: {
      id: String(user._id),
      name: user.name || "",
      role: user.role || "admin",
    },
  });

  // ✅ กัน cache
  res.headers.set("Cache-Control", "no-store");

  setAuthCookie(res, token, {
    maxAgeSec: Number(process.env.AUTH_COOKIE_TTL_SEC || 604800),
  });

  return res;
});
