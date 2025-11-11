// /lib/auth.js
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { SignJWT, jwtVerify } from "jose";

/* ---------------- Password utils ---------------- */
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);
// optional: pepper ช่วยเสริมความปลอดภัย หาก DB รั่ว
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
  const sec =
    process.env.AUTH_SECRET ||
    process.env.JWT_SECRET ||
    "dev-secret-change-me";
  return new TextEncoder().encode(sec);
}
const SECRET = getSecretUint8();

const ISSUER = process.env.AUTH_ISSUER || "9expert-auth";
const AUDIENCE = process.env.AUTH_AUDIENCE || "9expert-admin";

/**
 * สร้าง JWT สำหรับ session (access token)
 * - ควรส่ง payload ที่มี sub (user id) และ role เป็นหลัก
 * - expiresIn: รูปแบบ "1h", "4h", "7d" (ของ jose รองรับ)
 */
export async function signAuthJWT(
  payload = {},
  { expiresIn = process.env.AUTH_TTL || "2h", scopes = [] } = {}
) {
  const sub = payload.sub || payload.uid;
  if (!sub) throw new Error("signAuthJWT: 'sub' (user id) is required");

  // เลือกเฉพาะ claims ที่จำเป็น หลีกเลี่ยงข้อมูลอ่อนไหว
  const publicClaims = {
    role: payload.role,
    name: payload.name,
    email: payload.email, // ถ้าไม่จำเป็น แนะนำตัดออกได้
    scopes,               // ["courses.read", "courses.write"] เป็นต้น
  };

  return await new SignJWT(publicClaims)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(sub))
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setJti(randomUUID())    // เผื่อทำ revoke list ในอนาคต
    .setIssuedAt()
    .setNotBefore("0s")
    .setExpirationTime(expiresIn)
    .sign(SECRET);
}

/**
 * ตรวจสอบ JWT
 * - คืน payload หากถูกต้อง, คืน null หากไม่ถูกต้อง/หมดอายุ
 */
export async function verifyAuthJWT(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
      clockTolerance: 5, // ยอมคลาดเคลื่อนเวลา 5 วินาที
    });
    return payload; // { sub, role, scopes, name, email, iat, exp, jti, iss, aud }
  } catch {
    return null;
  }
}

/* ---------------- Cookie helpers ---------------- */
/** 
 * ใช้ prefix __Host- ช่วยบังคับ secure+path=/
 * ต้องทำงานบน HTTPS เท่านั้น (production)
 */
export const AUTH_COOKIE_NAME = "__Host-auth";

export function setAuthCookie(res, token, { maxAgeSec } = {}) {
  // ถ้าไม่ส่ง maxAge ใช้อายุจาก env หรือ 2 ชั่วโมง
  const fallback = Number(process.env.AUTH_COOKIE_TTL_SEC || 2 * 60 * 60);
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: typeof maxAgeSec === "number" ? maxAgeSec : fallback,
  });
}

export function clearAuthCookie(res) {
  res.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
