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
    const coursesParam = searchParams.get("courses") || "";
    const dateStr = searchParams.get("date"); // YYYY-MM-DD
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    const monthsParam = searchParams.get("months");

    const filter = {};

    // filter ตามคอร์ส
    if (coursesParam) {
      const ids = coursesParam.split(",").map((v) => v.trim()).filter(Boolean);
      if (ids.length) filter.course = { $in: ids };
    } else if (course) {
      filter.course = course;
    }

    // ---- filter ตามช่วงวันที่ ----
    if (dateStr) {
      // เคส: ระบุวันเดียว
      const start = new Date(dateStr);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      filter.dates = { $elemMatch: { $gte: start, $lt: end } };
    } else if (fromStr || toStr) {
      // เคส: จาก–ถึง
      const cond = {};
      if (fromStr) cond.$gte = new Date(fromStr);
      if (toStr) cond.$lte = new Date(toStr);
      filter.dates = { $elemMatch: cond };
    } else {
      // fallback: วันนี้ -> n เดือนข้างหน้า
      let months = Number.isFinite(Number(monthsParam))
        ? Number(monthsParam)
        : 12;
      if (months <= 0) months = 1;
      if (months > 24) months = 24;

      const now = new Date();
      const until = new Date(now);
      until.setMonth(until.getMonth() + months);

      filter.dates = { $elemMatch: { $gte: now, $lte: until } };
    }

    const items = await Schedule.find(filter)
      .populate({
        path: "course",
        select:
          "course_id course_name course_price course_trainingdays program sort_order skills",
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
