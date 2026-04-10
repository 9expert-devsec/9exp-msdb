import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import PublicCourse from "@/models/PublicCourse";
import "@/models/Program";
import "@/models/Skill";

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

export async function GET(req) {
  const authError = checkAiApiKey(req);
  if (authError) return applyCors(req, authError);

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q")?.trim();
    const program = searchParams.get("program")?.trim() || "";
    const skill = searchParams.get("skill")?.trim() || "";
    const courseParam = searchParams.get("course")?.trim() || "";
    const courseIdParam = searchParams.get("course_id")?.trim() || "";

    const limit = Math.min(
      300,
      parseInt(searchParams.get("limit") || "200", 10),
    );
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

    const filter = {};

    if (program) filter.program = program;
    if (skill) filter.skills = skill;

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
      .select(
        "course_cover_url course_id course_name course_teaser course_levels course_price course_duration course_trainingdays course_traininghours tags sort_order program skills previous_course related_courses",
      )
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
        select: "course_id course_name course_teaser course_cover_url course_price course_trainingdays course_traininghours",
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
