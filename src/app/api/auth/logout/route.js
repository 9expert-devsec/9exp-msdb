// src/app/api/auth/logout/route.js
import { NextResponse } from "next/server";

const COOKIE_PROD = "__Host-auth";
const COOKIE_DEV = "auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clearCookie(res, name) {
  res.cookies.set(name, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function POST() {
  const res = NextResponse.json({ ok: true });

  // ✅ กัน cache
  res.headers.set("Cache-Control", "no-store");

  // ✅ clear ทั้ง 2 ชื่อ
  clearCookie(res, COOKIE_PROD);
  clearCookie(res, COOKIE_DEV);

  return res;
}
