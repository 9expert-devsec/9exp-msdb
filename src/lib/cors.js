const ALLOW = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

export function corsHeaders(origin) {
  const ok = origin && ALLOW.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : "null",
    "Vary": "Origin",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// ใช้ใน Route Handlers:
export function handleOptions(req) {
  const h = corsHeaders(req.headers.get("origin"));
  return new Response(null, { status: 204, headers: h });
}