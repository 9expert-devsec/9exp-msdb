// src/lib/breakScreenAuth.js
// Parallel to ai-auth.js but reads a SEPARATE env allowlist so the break-screen
// service key can be rotated independently and has least-privilege (it can read
// break-screen profiles and nothing else). Do NOT merge with ai-auth.js.
import { NextResponse } from "next/server";

function getValidKeys() {
  const raw = process.env.BREAK_SCREEN_API_KEYS || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Usage in a route:
 *   const authError = checkBreakScreenApiKey(req);
 *   if (authError) return authError;
 */
export function checkBreakScreenApiKey(req) {
  const headerKey = req.headers.get("x-api-key") || "";
  const validKeys = getValidKeys();

  if (!headerKey || !validKeys.length) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized: missing API key" },
      { status: 401 }
    );
  }
  if (!validKeys.includes(headerKey)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized: invalid API key" },
      { status: 401 }
    );
  }
  return null;
}
