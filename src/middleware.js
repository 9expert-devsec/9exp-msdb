// src/middleware.js
import { NextResponse } from "next/server";
import { verifyAuthJWT } from "@/lib/auth";

const COOKIE_PROD = "__Host-auth";
const COOKIE_DEV = "auth";

const ADMIN_PAGE = /^\/admin(\/|$)/;
const ADMIN_API = /^\/api\/admin(\/|$)/;

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // ✅ fallback: อ่านได้ทั้ง 2 ชื่อ (ช่วง transition)
  const token =
    req.cookies.get(COOKIE_PROD)?.value ||
    req.cookies.get(COOKIE_DEV)?.value ||
    null;

  const user = await verifyAuthJWT(token);

  // 🔒 สำหรับหน้า /admin/**
  if (ADMIN_PAGE.test(pathname)) {
    if (!user) {
      const wantsHTML = req.headers.get("accept")?.includes("text/html");
      if (wantsHTML) {
        const url = new URL("/login", req.url);
        url.searchParams.set("next", pathname);
        const res = NextResponse.redirect(url);

        // ลบทั้ง 2 ชื่อ เผื่อค้าง
        res.cookies.delete(COOKIE_PROD);
        res.cookies.delete(COOKIE_DEV);
        return res;
      }
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
  }

  // 🔐 สำหรับ API /api/admin/**
  if (ADMIN_API.test(pathname)) {
    if (!user)
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    if (!["admin", "editor"].includes(String(user.role)))
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 },
      );
  }

  // 🧱 Security Headers
  const res = NextResponse.next();
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload",
  );
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
