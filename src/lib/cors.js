// /lib/cors.js
const ALLOW = (process.env.CORS_ALLOW_ORIGINS || process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function corsHeaders(origin) {
  const ok = origin && ALLOW.includes(origin);

  const headers = {
    Vary: "Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, x-api-key, X-Api-Key, X-Signature, X-Csrf-Token, Idempotency-Key",
    "Access-Control-Max-Age": "600",
  };

  if (ok) {
    headers["Access-Control-Allow-Origin"] = origin;
    // ใส่เฉพาะถ้าคุณต้องใช้ cookie/session ข้าม origin จริง ๆ
    // headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

export function handleOptions(req) {
  const h = corsHeaders(req.headers.get("origin"));
  return new Response(null, { status: 204, headers: h });
}

export function withCors(handler) {
  return async (req, ctx) => {
    const origin = req.headers.get("origin");
    const cors = corsHeaders(origin);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const res = await handler(req, ctx);
    const headers = new Headers(res.headers);

    for (const [k, v] of Object.entries(cors)) {
      headers.set(k, v);
    }

    return new Response(res.body, {
      status: res.status,
      headers,
    });
  };
}
