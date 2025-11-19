// /src/app/api/public-courses/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import PublicCourse from "@/models/PublicCourse";
import "@/models/Program";
import "@/models/Skill";

import { withCors } from "@/lib/cors";
import { withRateLimit } from "@/lib/ratelimit";
import { requireRole } from "@/lib/requireRole";

/* ---------------- helpers ---------------- */
const cleanArray = (a) =>
  Array.isArray(a) ? a.map((s) => String(s).trim()).filter(Boolean) : [];

const cleanTopics = (arr) =>
  Array.isArray(arr)
    ? arr.map((t) => ({
        title: String(t?.title || "").trim(),
        bullets: cleanArray(t?.bullets),
      }))
    : [];

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
        .select("course_cover_url")
        .populate("program")
        .populate("skills")
        .populate("previous_course")
        .sort({ sort_order: 1, course_name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      // หมายเหตุ: ถ้าต้องการลดข้อมูลที่เปิดเผย ให้ .select(...) เฉพาะฟิลด์ที่จำเป็น
      return NextResponse.json(
        { ok: true, total, page, limit, items },
        { status: 200 }
      );
    } catch (e) {
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
