import { headers } from "next/headers";

/** สร้าง Absolute URL ที่ใช้ได้ทั้ง dev/prod/localhost */
export function absoluteUrl(path = "") {
  const h = headers();
  const envBase =
    process.env.NEXT_PUBLIC_SITE_URL || // ใช้ตัวที่คุณตั้งไว้
    process.env.NEXT_PUBLIC_BASE_URL || // เผื่อเคยใช้ชื่อนี้
    process.env.NEXT_PUBLIC_VERCEL_URL; // เผื่อรันบน Vercel (ต้องเติมโปรโตคอลเอง)

  // ถ้าเป็น Vercel URL มักไม่มีโปรโตคอล
  const envBaseFixed = envBase
    ? (/^https?:\/\//i.test(envBase) ? envBase : `https://${envBase}`)
    : null;

  const host =
    h.get("x-forwarded-host") ||
    h.get("host") ||
    (envBaseFixed ? new URL(envBaseFixed).host : "localhost:3000");

  const proto =
    h.get("x-forwarded-proto") ||
    (envBaseFixed ? new URL(envBaseFixed).protocol.replace(":", "") : (host.includes("localhost") ? "http" : "https"));

  const base = `${proto}://${host}`;
  const p = path?.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
