// /lib/auth.js
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { SignJWT, jwtVerify } from "jose";

/* ---------------- Password utils ---------------- */
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);
const PEPPER = process.env.AUTH_PEPPER || "";

export async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  return bcrypt.hash(String(plain) + PEPPER, salt);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(String(plain) + PEPPER, hash);
}

/* ---------------- JWT utils ---------------- */
function getSecretUint8() {
  const sec = process.env.AUTH_SECRET || process.env.JWT_SECRET;

  if (!sec) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing AUTH_SECRET/JWT_SECRET in production");
    }
    return new TextEncoder().encode("dev-secret-change-me");
  }
  return new TextEncoder().encode(sec);
}
const SECRET = getSecretUint8();

const ISSUER = process.env.AUTH_ISSUER || "9expert-auth";
const AUDIENCE = process.env.AUTH_AUDIENCE || "9expert-admin";

export async function signAuthJWT(
  payload = {},
  { expiresIn = process.env.AUTH_TTL || "2h", scopes = [] } = {},
) {
  const sub = payload.sub || payload.uid;
  if (!sub) throw new Error("signAuthJWT: 'sub' (user id) is required");

  const publicClaims = {
    role: payload.role,
    name: payload.name,
    email: payload.email,
    scopes,
  };

  return await new SignJWT(publicClaims)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(sub))
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setJti(randomUUID())
    .setIssuedAt()
    .setNotBefore("0s")
    .setExpirationTime(expiresIn)
    .sign(SECRET);
}

export async function verifyAuthJWT(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
      clockTolerance: 5,
    });
    return payload;
  } catch {
    return null;
  }
}

/* ---------------- Cookie helpers ---------------- */

const isProd = process.env.NODE_ENV === "production";

// ✅ prod ใช้ __Host-auth (ต้อง Secure + https เท่านั้น)
// ✅ dev ใช้ auth (เพราะ localhost/http ตั้ง __Host-* ไม่ได้)
export const AUTH_COOKIE_NAME = isProd ? "__Host-auth" : "auth";

export function setAuthCookie(res, token, { maxAgeSec } = {}) {
  const fallback = Number(process.env.AUTH_COOKIE_TTL_SEC || 2 * 60 * 60);

  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd, // prod = true (ถูกต้องกับ __Host-), dev = false
    sameSite: "lax",
    path: "/",
    maxAge: typeof maxAgeSec === "number" ? maxAgeSec : fallback,
  });
}

export function clearAuthCookie(res) {
  res.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  // เผื่อเคยมี legacy อีกชื่อค้างไว้
  res.cookies.set(isProd ? "auth" : "__Host-auth", "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}
