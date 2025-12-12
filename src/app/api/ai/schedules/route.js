// src/app/api/ai/schedules/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";

import "@/models/Program";
import "@/models/PublicCourse";
import Schedule from "@/models/Schedule";

import { checkAiApiKey } from "@/lib/ai-auth";

export const dynamic = "force-dynamic";

// helper: สร้าง UTC midnight จาก YYYY-MM-DD
function utcMidnight(ymd) {
  // ymd: "2025-12-15"
  return new Date(`${ymd}T00:00:00.000Z`);
}

export async function GET(req) {
  const authError = checkAiApiKey(req);
  if (authError) return authError;

  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);

    const course = searchParams.get("course") || "";
    const coursesParam = searchParams.get("courses") || "";

    const dateStr = searchParams.get("date"); // YYYY-MM-DD
    const fromStr = searchParams.get("from"); // YYYY-MM-DD (แนะนำ)
    const toStr = searchParams.get("to"); // YYYY-MM-DD (แนะนำ)
    const monthsParam = searchParams.get("months");

    const filter = {};

    // filter ตามคอร์ส
    if (coursesParam) {
      const ids = coursesParam
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      if (ids.length) filter.course = { $in: ids };
    } else if (course) {
      filter.course = course;
    }

    // --------- filter ตามช่วงวันที่ ----------
    const hasDateFilter = !!(dateStr || fromStr || toStr || monthsParam);

    if (hasDateFilter) {
      if (dateStr) {
        // ระบุวันเดียว: [day 00:00Z, next day 00:00Z)
        const start = utcMidnight(dateStr);
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 1);

        filter.dates = { $elemMatch: { $gte: start, $lt: end } };
      } else if (fromStr || toStr) {
        const cond = {};
        if (fromStr) cond.$gte = utcMidnight(fromStr);
        if (toStr) {
          // ให้ to เป็น inclusive แบบทั้งวัน → ไปถึง next day 00:00Z แล้วใช้ $lt
          const toStart = utcMidnight(toStr);
          const toEnd = new Date(toStart);
          toEnd.setUTCDate(toEnd.getUTCDate() + 1);
          cond.$lt = toEnd;
        }
        filter.dates = { $elemMatch: cond };
      } else {
        // months: วันนี้ -> n เดือนข้างหน้า
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
    }
    // ถ้าไม่ส่ง date/from/to/months มาเลย -> ALL (ไม่ใส่ filter.dates)

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

    return NextResponse.json(
      {
        ok: true,
        summary: {
          total: items.length,
          filterUsed: filter,
        },
        items,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
