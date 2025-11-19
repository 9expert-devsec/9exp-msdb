// src/lib/ai-auth.js
import { NextResponse } from "next/server";

function getValidKeys() {
  const raw = process.env.AI_EXPORT_API_KEYS || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * ใช้ใน route: 
 *   const authError = checkAiApiKey(req);
 *   if (authError) return authError;
 */
export function checkAiApiKey(req) {
  const headerKey = req.headers.get("x-api-key") || "";
  const validKeys = getValidKeys();

  if (!headerKey || !validKeys.length) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized: missing API key" },
      { status: 401 }
    );
  }

  const match = validKeys.includes(headerKey);
  if (!match) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized: invalid API key" },
      { status: 401 }
    );
  }

  // ผ่านตรวจ
  return null;
}
