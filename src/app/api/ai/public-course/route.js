import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import PublicCourse from "@/models/PublicCourse";
import Program from "@/models/Program";
import Skill from "@/models/Skill";

import { checkAiApiKey } from "@/lib/ai-auth";
import { corsHeaders, handleOptions } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = handleOptions;

function applyCors(req, res) {
  const h = corsHeaders(req.headers.get("origin"));
  for (const [k, v] of Object.entries(h)) {
    res.headers.set(k, v);
  }
  return res;
}

function isObjectIdLike(str = "") {
  return /^[0-9a-fA-F]{24}$/.test(str);
}

function toPositiveInt(value, fallback) {
  const n = parseInt(value || "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function GET(req) {
  const authError = checkAiApiKey(req);
  if (authError) return applyCors(req, authError);

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q")?.trim() || "";

    // รองรับทั้ง param เดิม และ param ใหม่
    const programParam = searchParams.get("program")?.trim() || "";
    const programIdParam = searchParams.get("program_id")?.trim() || "";
    const skillParam = searchParams.get("skill")?.trim() || "";
    const skillIdParam = searchParams.get("skill_id")?.trim() || "";

    const courseParam = searchParams.get("course")?.trim() || "";
    const courseIdParam = searchParams.get("course_id")?.trim() || "";

    const limit = Math.min(300, toPositiveInt(searchParams.get("limit"), 200));
    const page = Math.max(1, toPositiveInt(searchParams.get("page"), 1));

    const filter = {};

    // ---------- program filter ----------
    // รองรับ:
    // - ?program=<ObjectId>
    // - ?program=<program_id>
    // - ?program_id=<program_id>
    const rawProgram = programIdParam || programParam;
    if (rawProgram) {
      if (isObjectIdLike(rawProgram)) {
        filter.program = rawProgram;
      } else {
        const foundProgram = await Program.findOne({ program_id: rawProgram })
          .select("_id")
          .lean();

        if (!foundProgram) {
          const res = NextResponse.json(
            { ok: true, total: 0, page, limit, items: [] },
            { status: 200 },
          );
          return applyCors(req, res);
        }

        filter.program = foundProgram._id;
      }
    }

    // ---------- skill filter ----------
    // รองรับ:
    // - ?skill=<ObjectId>
    // - ?skill=<skill_id>
    // - ?skill_id=<skill_id>
    const rawSkill = skillIdParam || skillParam;
    if (rawSkill) {
      if (isObjectIdLike(rawSkill)) {
        filter.skills = rawSkill;
      } else {
        const foundSkill = await Skill.findOne({ skill_id: rawSkill })
          .select("_id")
          .lean();

        if (!foundSkill) {
          const res = NextResponse.json(
            { ok: true, total: 0, page, limit, items: [] },
            { status: 200 },
          );
          return applyCors(req, res);
        }

        filter.skills = foundSkill._id;
      }
    }

    // ---------- course filter ----------
    // รองรับ:
    // - ?course=<ObjectId>   => match _id หรือ course_id
    // - ?course=<course_id>  => match course_id
    // - ?course_id=<course_id>
    if (courseParam) {
      if (isObjectIdLike(courseParam)) {
        filter.$or = [{ _id: courseParam }, { course_id: courseParam }];
      } else {
        filter.course_id = courseParam;
      }
    }

    if (courseIdParam) {
      filter.course_id = courseIdParam;
    }

    if (q) {
      filter.$text = { $search: q };
    }

    const total = await PublicCourse.countDocuments(filter);

    const items = await PublicCourse.find(filter)
      // ไม่ใส่ .select() = ดึงครบทุก field ของ PublicCourse
      .populate({
        path: "program",
        select: "program_id program_name programiconurl sort_order",
      })
      .populate({
        path: "skills",
        select: "skill_id skill_name skilliconurl skillcolor",
      })
      .populate({
        path: "previous_course",
        select: "course_id course_name",
      })
      .populate({
        path: "related_courses",
        select:
          "course_id course_name course_teaser course_cover_url course_price course_trainingdays course_traininghours",
      })
      .sort({ sort_order: 1, course_name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const res = NextResponse.json(
      { ok: true, total, page, limit, items },
      { status: 200 },
    );

    return applyCors(req, res);
  } catch (err) {
    console.error("GET /api/ai/public-course error:", err);

    const res = NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status: 500 },
    );
    return applyCors(req, res);
  }
}
