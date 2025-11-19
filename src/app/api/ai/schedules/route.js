// src/app/api/ai/schedules/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";

// register models สำหรับ populate
import "@/models/Program";
import "@/models/PublicCourse";
import Schedule from "@/models/Schedule";

import { checkAiApiKey } from "@/lib/ai-auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  // 1) เช็ค API Key ก่อนเลย
  const authError = checkAiApiKey(req);
  if (authError) return authError;

  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const monthsParam = searchParams.get("months");
    const course = searchParams.get("course") || "";

    // ป้องกัน months แปลก ๆ
    let months = Number.isFinite(Number(monthsParam))
      ? Number(monthsParam)
      : 12;
    if (months <= 0) months = 1;
    if (months > 24) months = 24; // กันยิงขอเยอะเกิน

    const filter = {};
    if (course) filter.course = course;

    // ดึงรอบในช่วง n เดือนถัดไป
    const now = new Date();
    const until = new Date(now);
    until.setMonth(until.getMonth() + months);

    filter.dates = { $elemMatch: { $gte: now, $lte: until } };

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

    // สำหรับ AI ผมใส่ ok: true ไปให้ด้วย จะได้เช็คง่าย
    return NextResponse.json({ ok: true, items });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
