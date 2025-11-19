// src/app/api/ai/online-courses/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import OnlineCourse from "@/models/OnlineCourse";
import "@/models/Program";
import "@/models/Skill";

import { checkAiApiKey } from "@/lib/ai-auth";

export const dynamic = "force-dynamic";

const toInt = (v, d = 0) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

export async function GET(req) {
  // 1) ตรวจ API Key
  const authError = checkAiApiKey(req);
  if (authError) return authError;

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const program = searchParams.get("program");
    const skill = searchParams.get("skill");

    const limit = Math.min(
      Math.max(toInt(searchParams.get("limit"), 50), 1),
      300
    );
    const page = Math.max(toInt(searchParams.get("page"), 1), 1);

    const where = {};
    if (q) {
      where.$or = [
        { o_course_name: { $regex: q, $options: "i" } },
        { o_course_teaser: { $regex: q, $options: "i" } },
        { o_course_id: { $regex: q, $options: "i" } },
      ];
    }
    if (program) where.program = program;
    if (skill) where.skills = skill;

    const total = await OnlineCourse.countDocuments(where);

    const items = await OnlineCourse.find(where)
      .select(
        "o_course_cover_url o_course_id o_course_name o_course_teaser o_course_link o_course_price o_course_duration program skills sort_order createdAt updatedAt"
      )
      .populate(
        "program",
        "program_id program_name programiconurl programcolor sort_order"
      )
      .populate(
        "skills",
        "skill_id skill_name skilliconurl skillcolor"
      )
      .sort({ sort_order: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json(
      { ok: true, total, page, limit, items },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
