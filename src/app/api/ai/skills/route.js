// src/app/api/ai/skills/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Skill from "@/models/Skill";
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
  // 1) ตรวจ API KEY (แต่ต้อง wrap CORS ด้วยเสมอ)
  const authError = checkAiApiKey(req);
  if (authError) return withCors(req, authError);

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const withPrograms = searchParams.get("withPrograms");

    // ดึง skills ทั้งหมด
    const items = await Skill.find()
      .select(
        "skill_id skill_name skilliconurl skillcolor skill_teaser skill_roadmap_url createdAt updatedAt",
      )
      .sort({ skill_name: 1 })
      .lean();

    // เพิ่มข้อมูล program ใต้แต่ละ skill (optional)
    if (withPrograms) {
      for (const s of items) {
        const [pubProgIds, onlProgIds] = await Promise.all([
          PublicCourse.distinct("program", { skills: s._id }),
          OnlineCourse.distinct("program", { skills: s._id }),
        ]);

        const uniqIds = [...new Set([...pubProgIds, ...onlProgIds])].filter(
          Boolean,
        );

        const programs = uniqIds.length
          ? await Program.find({ _id: { $in: uniqIds } })
              .select("_id program_id program_name programcolor programiconurl")
              .lean()
          : [];

        s.programs = programs;
        s.programCount = programs.length;
      }
    }

    const res = NextResponse.json({ ok: true, items }, { status: 200 });
    return withCors(req, res);
  } catch (err) {
    const res = NextResponse.json(
      { ok: false, error: err?.message || "Server Error" },
      { status: 500 },
    );
    return withCors(req, res);
  }
}

// ❌ AI ไม่ควรสร้าง/แก้ skill
export async function POST(req) {
  const res = NextResponse.json(
    { ok: false, error: "POST not allowed on AI route" },
    { status: 405 },
  );
  return withCors(req, res);
}
