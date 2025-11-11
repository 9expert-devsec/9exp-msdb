// /src/app/api/auth/me/route.js
import { NextResponse } from "next/server";
import { verifyAuthJWT } from "@/lib/auth";

export async function GET(req) {
  const token = req.cookies.get("auth")?.value || null;
  const user = await verifyAuthJWT(token);
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({
    ok: true,
    user: { id: user.sub, name: user.name || "", email: user.email || "", role: user.role || "" },
  });
}
