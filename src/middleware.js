import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || process.env.JWT_SECRET || "dev-secret-change-me"
);

async function isValid(token) {
  try {
    if (!token) return false;
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req) {
  // ไฟล์นี้จะถูกเรียกเฉพาะเส้นทางที่กำหนดใน config.matcher ด้านล่าง
  const token = req.cookies.get("auth")?.value;

  if (!(await isValid(token))) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    const res = NextResponse.redirect(url);
    res.cookies.delete("auth");
    return res;
  }

  return NextResponse.next();
}

// ป้องกันเฉพาะหน้าแอดมินเท่านั้น (ไม่ยุ่งกับ API อื่น ๆ)
export const config = {
  matcher: ["/admin/:path*"],
};
