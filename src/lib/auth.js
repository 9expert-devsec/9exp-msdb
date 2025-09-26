import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}
export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function getJwtSecret() {
  const sec = process.env.AUTH_SECRET || process.env.JWT_SECRET || "dev-secret-change-me";
  return new TextEncoder().encode(sec);
}

export async function signAuthJWT(payload, { expiresIn = "7d" } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const exp =
    typeof expiresIn === "string" && expiresIn.endsWith("d")
      ? now + parseInt(expiresIn) * 86400
      : now + 7 * 86400;
  return await new SignJWT({ ...payload, iat: now })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(exp)
    .sign(getJwtSecret());
}

export async function verifyAuthJWT(token) {
  const { payload } = await jwtVerify(token, getJwtSecret());
  return payload;
}
