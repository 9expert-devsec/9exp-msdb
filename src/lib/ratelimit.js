// /lib/ratelimit.js
const buckets = new Map();

/**
 * Cleanup expired buckets to prevent unbounded memory growth.
 * Called opportunistically when the map grows large.
 */
function cleanup(now) {
  for (const [k, b] of buckets) {
    if (!b || typeof b.reset !== "number" || now > b.reset) {
      buckets.delete(k);
    }
  }
}

/**
 * Simple in-memory rate limiter (best-effort).
 *
 * ⚠️ Note:
 * - This is NOT a strong rate limit on serverless/multi-instance (e.g. Vercel),
 *   because memory is not shared across instances and can reset on cold starts.
 * - Still useful for local/dev or single-node deployments.
 *
 * Options:
 * - points: max requests per window
 * - duration: window length in seconds
 * - keyFn: optional function to override bucket key
 *   keyFn({ req, ctx, ip, baseKey }) => string
 */
export function withRateLimit({ points = 60, duration = 60, keyFn } = {}) {
  return (handler) => async (req, ctx) => {
    const now = Date.now();

    // prevent Map from growing forever under heavy traffic/scans
    if (buckets.size > 2000) cleanup(now);

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.ip ||
      "local";

    const baseKey = `${ip}:${req.nextUrl.pathname}`;
    const key =
      typeof keyFn === "function" ? keyFn({ req, ctx, ip, baseKey }) : baseKey;

    const bucket = buckets.get(key) || {
      count: 0,
      reset: now + duration * 1000,
    };

    if (now > bucket.reset) {
      bucket.count = 0;
      bucket.reset = now + duration * 1000;
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > points) {
      const retryAfter = Math.max(1, Math.ceil((bucket.reset - now) / 1000));

      return new Response(
        JSON.stringify({ ok: false, error: "Too Many Requests" }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return handler(req, ctx);
  };
}
