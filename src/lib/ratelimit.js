// /lib/ratelimit.js
const buckets = new Map();

export function withRateLimit({ points = 60, duration = 60 } = {}) {
  return (handler) => async (req, ctx) => {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.ip ||
      "local";
    const key = `${ip}:${req.nextUrl.pathname}`;
    const now = Date.now();

    const bucket = buckets.get(key) || { count: 0, reset: now + duration * 1000 };
    if (now > bucket.reset) {
      bucket.count = 0;
      bucket.reset = now + duration * 1000;
    }
    bucket.count++;
    buckets.set(key, bucket);

    if (bucket.count > points) {
      return new Response(
        JSON.stringify({ ok: false, error: "Too Many Requests" }),
        { status: 429, headers: { "Retry-After": String(Math.ceil((bucket.reset - now) / 1000)) } }
      );
    }
    return handler(req, ctx);
  };
}
