// src/app/api/ai/public-courses/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import PublicCourse from "@/models/PublicCourse";
import "@/models/Program";
import "@/models/Skill";

import { checkAiApiKey } from "@/lib/ai-auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  // 1) API KEY CHECK
  const authError = checkAiApiKey(req);
  if (authError) return authError;

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q")?.trim();
    const program = searchParams.get("program");
    const skill = searchParams.get("skill");

    // Default query limit สำหรับ AI — ปรับตามต้องการ
    const limit = Math.min(300, parseInt(searchParams.get("limit") || "200"));
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));

    const filter = {};
    if (program) filter.program = program;
    if (skill) filter.skills = skill;
    if (q) filter.$text = { $search: q };

    const total = await PublicCourse.countDocuments(filter);

    const items = await PublicCourse.find(filter)
      .select(
        "course_cover_url course_id course_name course_teaser course_price course_duration course_trainingdays tags sort_order program skills previous_course"
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
      .sort({ sort_order: 1, course_name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json(
      { ok: true, total, page, limit, items },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
