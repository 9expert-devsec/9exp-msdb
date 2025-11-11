// /src/lib/requireRole.js
import { verifyAuthJWT } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireRole(req, roles = ["admin"]) {
  const token = req.cookies.get("auth")?.value || null;
  const user = await verifyAuthJWT(token);
  if (!user) throw NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!roles.includes(String(user.role))) {
    throw NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  return user; // { sub, role, ... }
}