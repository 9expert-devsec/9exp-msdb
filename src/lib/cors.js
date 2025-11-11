// /lib/cors.js
const ALLOW = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * สร้าง CORS headers จาก origin
 * - ถ้า origin อยู่ใน allowlist → ใส่ header ให้
 * - ถ้าไม่ใช่ → ไม่ใส่ Access-Control-Allow-Origin เพื่อกัน leak
 */
export function corsHeaders(origin) {
  const ok = origin && ALLOW.includes(origin);
  const headers = {
    Vary: "Origin, Access-Control-Request-Method",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Api-Key, X-Signature, X-Csrf-Token, Idempotency-Key",
    "Access-Control-Max-Age": "600", // cache preflight 10 นาที
    "Access-Control-Allow-Credentials": "true",
  };
  if (ok) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

/**
 * handler สำหรับ OPTIONS requests
 * ใช้ใน route เช่น export const OPTIONS = handleOptions;
 */
export function handleOptions(req) {
  const h = corsHeaders(req.headers.get("origin"));
  return new Response(null, { status: 204, headers: h });
}

/**
 * ครอบ response เพื่อเติม CORS headers อัตโนมัติ
 * เหมาะกับ API ที่มีทั้ง GET/POST
 */
export function withCors(handler) {
  return async (req, ctx) => {
    const origin = req.headers.get("origin");
    const cors = corsHeaders(origin);

    // Preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const res = await handler(req, ctx);
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
    return new Response(res.body, { status: res.status, headers });
  };
}
