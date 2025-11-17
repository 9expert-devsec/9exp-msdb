// /src/lib/requireRole.js
import { verifyAuthJWT } from "@/lib/auth";

/* parse cookie header -> { name: value } */
function parseCookieHeader(header = "") {
  const jar = {};
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (!k) continue;
    jar[k] = decodeURIComponent(rest.join("=") || "");
  }
  return jar;
}

/**
 * requireRole(req, ["admin","editor"])
 * - อ่าน token จาก Authorization Bearer หรือ Cookie (__Host-auth|auth)
 * - verify แล้วเช็ค role
 * - คืน payload user หากผ่าน
 * - ไม่ผ่าน -> throw Response(401/403)
 */
export async function requireRole(req, roles = ["admin"]) {
  // 1) Authorization: Bearer <token>
  const authz = req.headers.get("authorization") || req.headers.get("Authorization");
  let token = null;
  if (authz?.startsWith("Bearer ")) token = authz.slice(7).trim();

  // 2) Cookie header
  if (!token) {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = parseCookieHeader(cookieHeader);
    token = cookies["__Host-auth"] || cookies["auth"] || null;
  }

  const user = await verifyAuthJWT(token);
  if (!user) {
    throw new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  if (roles?.length && !roles.includes(String(user.role))) {
    throw new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  return user; // { sub, role, email, name, ... }
}
