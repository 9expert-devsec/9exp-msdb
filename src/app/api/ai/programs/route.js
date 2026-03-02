// src/app/api/ai/programs/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Program from "@/models/Program";
import PublicCourse from "@/models/PublicCourse";
import OnlineCourse from "@/models/OnlineCourse";

import { checkAiApiKey } from "@/lib/ai-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= CORS helpers ================= */

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "https://9experttraining.com",
  "https://www.9experttraining.com",
  "https://exam-admin.9experttraining.com"
]);

function buildCorsHeaders(req) {
  const origin = req.headers.get("origin");

  // server-to-server จะไม่มี Origin -> ไม่ต้องใส่ CORS
  if (!origin) return {};

  // ไม่อยู่ใน allowlist -> ไม่ส่ง ACAO (ให้ browser บล็อกเอง)
  if (!ALLOWED_ORIGINS.has(origin)) return { Vary: "Origin" };

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function withCors(req, res) {
  const h = buildCorsHeaders(req);
  for (const [k, v] of Object.entries(h)) res.headers.set(k, v);
  return res;
}

/* ================= Preflight ================= */

export async function OPTIONS(req) {
  const res = new NextResponse(null, { status: 204 });
  return withCors(req, res);
}

/* ================= Handlers ================= */

export async function GET(req) {
  // 1) ตรวจ API Key ก่อน (แต่ต้อง wrap CORS ด้วยเสมอ)
  const authError = checkAiApiKey(req);
  if (authError) return withCors(req, authError);

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const withCounts = searchParams.get("withCounts");

    // ดึงข้อมูล Programs ทั้งหมด
    const items = await Program.find()
      .select(
        "program_id program_name programiconurl programcolor sort_order createdAt updatedAt",
      )
      .sort({ program_name: 1 })
      .lean();

    // ถ้าต้องการจำนวนคอร์ส (public/online)
    if (withCounts) {
      const ids = items.map((p) => p._id);

      const [pubCounts, onCounts] = await Promise.all([
        PublicCourse.aggregate([
          { $match: { program: { $in: ids } } },
          { $group: { _id: "$program", n: { $sum: 1 } } },
        ]),
        OnlineCourse.aggregate([
          { $match: { program: { $in: ids } } },
          { $group: { _id: "$program", n: { $sum: 1 } } },
        ]),
      ]);

      const pubMap = Object.fromEntries(
        pubCounts.map((i) => [String(i._id), i.n]),
      );
      const onMap = Object.fromEntries(
        onCounts.map((i) => [String(i._id), i.n]),
      );

      const enriched = items.map((p) => ({
        ...p,
        counts: {
          public: pubMap[String(p._id)] || 0,
          online: onMap[String(p._id)] || 0,
        },
      }));

      const res = NextResponse.json(
        { ok: true, items: enriched },
        { status: 200 },
      );
      return withCors(req, res);
    }

    const res = NextResponse.json(
      {
        ok: true,
        summary: { total: items.length },
        items,
      },
      { status: 200 },
    );
    return withCors(req, res);
  } catch (err) {
    const res = NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 },
    );
    return withCors(req, res);
  }
}

// ❌ AI ไม่ควรสร้าง/แก้ไขโปรแกรม — ปิด POST ทิ้ง
export async function POST(req) {
  const res = NextResponse.json(
    { ok: false, error: "POST not allowed on AI route" },
    { status: 405 },
  );
  return withCors(req, res);
}
