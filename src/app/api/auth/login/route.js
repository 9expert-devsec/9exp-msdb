import dbConnect from "@/lib/mongoose";
import AdminUser from "@/models/AdminUser";
import { verifyPassword, signAuthJWT } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req) {
  await dbConnect();
  const { email, password } = await req.json();

  const user = await AdminUser.findOne({ email: (email || "").toLowerCase(), isActive: true });
  if (!user) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  const ok = await verifyPassword(password || "", user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  const token = await signAuthJWT({
    uid: String(user._id),
    email: user.email,
    name: user.name || "",
    role: user.role || "admin",
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("auth", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 วัน
  });
  return res;
}
