import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import OnlineCourse from "@/models/OnlineCourse";
import Program from "@/models/Program";
import "@/models/Skill";

import { withCors } from "@/lib/cors";
import { withRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const toInt = (v, d = 0) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

const cleanArray = (text) =>
  Array.isArray(text)
    ? text
    : String(text || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

/* -------- buildFilter -------- */
async function buildFilter(searchParams) {
  const where = {};

  const q = (searchParams.get("q") || "").trim();
  const program = searchParams.get("program");
  const skill = searchParams.get("skill");

  if (q) {
    where.$or = [
      { o_course_name: { $regex: q, $options: "i" } },
      { o_course_teaser: { $regex: q, $options: "i" } },
      { o_course_id: { $regex: q, $options: "i" } },
    ];
  }

  if (skill) where.skills = skill;

  if (program) {
    const programDoc =
      (await Program.findOne({ program_id: program }).select("_id")) || null;

    where.$or = [
      { program: program }, // frontend ส่ง ObjectId
      programDoc ? { program: programDoc._id } : null,
    ].filter(Boolean);
  }

  return where;
}

/* ---------------- GET list ---------------- */
export const GET = withCors(
  withRateLimit({ points: 60, duration: 60 })(async (req) => {
    try {
      await dbConnect();
      const { searchParams } = new URL(req.url);

      const limit = Math.min(
        Math.max(toInt(searchParams.get("limit"), 30), 1),
        200
      );
      const page = Math.max(toInt(searchParams.get("page"), 1), 1);

      const where = await buildFilter(searchParams);

      const total = await OnlineCourse.countDocuments(where);

      const items = await OnlineCourse.find(where)
        .select("-__v")
        .populate({
          path: "program",
          select: "program_id program_name programiconurl programcolor",
        })
        .populate({
          path: "skills",
          select: "skill_name",
        })
        .populate({
          path: "previous_course",
          select: "o_course_id o_course_name",
        })
        .sort({ sort_order: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      return NextResponse.json(
        { ok: true, total, page, limit, items },
        { status: 200 }
      );
    } catch (e) {
      console.error("GET /api/online-courses error:", e);
      return NextResponse.json(
        { ok: false, error: e.message },
        { status: 500 }
      );
    }
  })
);

/* ---------------- POST (create) ---------------- */
export const POST = withCors(async (req) => {
  try {
    await dbConnect();
    const body = await req.json();

    const payload = {
      ...body,
      o_course_doc_paths: cleanArray(body.o_course_doc_paths),
      o_course_lab_paths: cleanArray(body.o_course_lab_paths),
      o_course_case_study_paths: cleanArray(body.o_course_case_study_paths),
      website_urls: cleanArray(body.website_urls),
      exam_links: cleanArray(body.exam_links),
      o_course_objectives: cleanArray(body.o_course_objectives),
      o_course_target_audience: cleanArray(body.o_course_target_audience),
      o_course_prerequisites: cleanArray(body.o_course_prerequisites),
      o_course_system_requirements: cleanArray(
        body.o_course_system_requirements
      ),
      o_course_training_topics: Array.isArray(body.o_course_training_topics)
        ? body.o_course_training_topics
        : [],
    };

    const created = await OnlineCourse.create(payload);
    return NextResponse.json({ ok: true, item: created }, { status: 201 });
  } catch (e) {
    if (e?.code === 11000 && e?.keyPattern?.o_course_id) {
      return NextResponse.json(
        {
          ok: false,
          error: "รหัสคอร์ส (Course ID) นี้มีอยู่แล้วในระบบ กรุณาเปลี่ยนเป็นรหัสใหม่ที่ไม่ซ้ำ",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
});

/* ---------------- OPTIONS ---------------- */
export const OPTIONS = withCors(
  async () => new Response(null, { status: 204 })
);
