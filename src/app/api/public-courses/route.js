// /src/app/api/public-courses/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import PublicCourse from "@/models/PublicCourse";
import "@/models/Program";
import "@/models/Skill";

import { withCors } from "@/lib/cors";
import { withRateLimit } from "@/lib/ratelimit";
// ตอนนี้ GET ยังไม่ requireRole ถ้าอยากล็อกเฉพาะหลังบ้านค่อยเพิ่มทีหลัง
// import { requireRole } from "@/lib/requireRole";

/* ---------------- helpers ---------------- */
const toInt = (v, d = 0) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

/* ---------------- GET (Public) ---------------- */
// CORS + RL: 60 req/min/IP
export const GET = withCors(
  withRateLimit({ points: 60, duration: 60 })(async (req) => {
    try {
      await dbConnect();

      const { searchParams } = new URL(req.url);
      const q = searchParams.get("q")?.trim();
      const program = searchParams.get("program");
      const skill = searchParams.get("skill");
      const limit = Math.min(
        Math.max(toInt(searchParams.get("limit"), 50), 1),
        200
      );
      const page = Math.max(toInt(searchParams.get("page"), 1), 1);

      const filter = {};
      if (program) filter.program = program;
      if (skill) filter.skills = skill;
      if (q) filter.$text = { $search: q };

      const total = await PublicCourse.countDocuments(filter);

      const items = await PublicCourse.find(filter)
        // ❌ อย่า .select("course_cover_url") ถ้าหน้าแอดมินต้องใช้ฟิลด์อื่น
        // ถ้าอยากตัด __v ทิ้งก็ทำแบบนี้แทน:
        .select("-__v")
        .populate({
          path: "program",
          select: "program_name programiconurl programcolor",
        })
        .populate({
          path: "skills",
          select: "skill_name", // ถ้าอยากได้ icon/สีเพิ่มค่อยเติม
        })
        .populate({
          path: "previous_course",
          select: "course_name course_id",
        })
        .sort({ sort_order: 1, course_name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      return NextResponse.json(
        { ok: true, total, page, limit, items },
        { status: 200 }
      );
    } catch (e) {
      console.error("GET /api/public-courses error:", e);
      return NextResponse.json(
        { ok: false, error: e.message || "Internal error" },
        { status: 500 }
      );
    }
  })
);

/* ---------------- OPTIONS (Preflight) ---------------- */
export const OPTIONS = withCors(
  async () => new Response(null, { status: 204 })
);
