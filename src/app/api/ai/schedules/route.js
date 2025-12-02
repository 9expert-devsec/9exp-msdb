// src/app/api/ai/schedules/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";

import "@/models/Program";
import "@/models/PublicCourse";
import Schedule from "@/models/Schedule";

import { checkAiApiKey } from "@/lib/ai-auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const authError = checkAiApiKey(req);
  if (authError) return authError;

  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const course = searchParams.get("course") || "";

    const filter = {};
    if (course) filter.course = course;

    // *** ไม่มี filter.dates แล้ว ดึงทั้งหมด ***
    const items = await Schedule.find(filter)
      .populate({
        path: "course",
        select:
          "course_id course_name course_price course_trainingdays program sort_order",
        populate: {
          path: "program",
          select: "program_id program_name programiconurl sort_order",
        },
      })
      .sort({ "course.sort_order": 1, "course.course_name": 1 })
      .lean();

    return NextResponse.json({ ok: true, items }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
