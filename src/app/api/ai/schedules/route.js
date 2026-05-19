// src/app/api/ai/schedules/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";

import "@/models/Program";
import "@/models/PublicCourse";
import Schedule from "@/models/Schedule";

import { checkAiApiKey } from "@/lib/ai-auth";
import { dispatchWebhook } from "@/lib/webhook";

export const dynamic = "force-dynamic";

/* ---------------- helpers for write ---------------- */
const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;

function normalizeToUtcMidnight(input) {
  if (!input) return null;
  if (typeof input === "string") {
    const s = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return new Date(`${s}T00:00:00.000Z`);
    }
  }
  const dt = input instanceof Date ? input : new Date(String(input));
  if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) return null;
  const bkk = new Date(dt.getTime() + BKK_OFFSET_MS);
  return new Date(
    Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), bkk.getUTCDate())
  );
}

function parseDates(arr) {
  return (Array.isArray(arr) ? arr : [])
    .map(normalizeToUtcMidnight)
    .filter(Boolean)
    .sort((a, b) => a - b);
}

// helper: สร้าง UTC midnight จาก YYYY-MM-DD
function utcMidnight(ymd) {
  return new Date(`${ymd}T00:00:00.000Z`);
}

// helper: วันนี้ 00:00Z
function utcStartOfToday() {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
}

// helper: max date
function maxDate(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() >= b.getTime() ? a : b;
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
    const fromStr = searchParams.get("from"); // YYYY-MM-DD
    const toStr = searchParams.get("to"); // YYYY-MM-DD (inclusive)
    const monthsParam = searchParams.get("months"); // number

    const filter = {};

    /* ---------------- course filter ---------------- */
    if (coursesParam) {
      const ids = coursesParam
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      if (ids.length) filter.course = { $in: ids };
    } else if (course) {
      filter.course = course;
    }

    /* ---------------- requirement filters ---------------- */
    // status: เอาเฉพาะ open + nearly_full (full ไม่เอาอยู่แล้ว)
    filter.status = { $in: ["open", "nearly_full"] };

    // signup_url: ต้องไม่ว่าง/ไม่ใช่ช่องว่างล้วน
    filter.signup_url = { $regex: /\S/ };

    /* ---------------- date filter (สำคัญ) ----------------
       ต้อง "ไม่เอารอบที่ผ่านไปแล้ว" โดยนิยามว่า:
       - ถ้าวันปัจจุบันเลยวันสุดท้ายของรอบ -> ไม่แสดง
       ทำได้ด้วย: dates มีอย่างน้อย 1 วันที่ >= วันนี้ 00:00Z
    */
    const today = utcStartOfToday();

    const hasDateFilter = !!(dateStr || fromStr || toStr || monthsParam);

    if (hasDateFilter) {
      if (dateStr) {
        // ระบุวันเดียว: [day 00:00Z, next day 00:00Z)
        // แต่ยังต้องไม่น้อยกว่าวันนี้ (กันขอดึงย้อนหลัง)
        const startRaw = utcMidnight(dateStr);
        const start = maxDate(startRaw, today);

        const end = new Date(utcMidnight(dateStr));
        end.setUTCDate(end.getUTCDate() + 1);

        // ถ้าระบุ date ที่เป็นอดีตหมด -> start จะถูกดันเป็น today
        // และ start อาจ >= end => จะไม่มีผลลัพธ์ (ถูกต้องตาม requirement)
        filter.dates = { $elemMatch: { $gte: start, $lt: end } };
      } else if (fromStr || toStr) {
        const cond = {};

        if (fromStr) cond.$gte = maxDate(utcMidnight(fromStr), today);
        else cond.$gte = today; // ไม่ส่ง from มา ก็ยังกันอดีตอยู่ดี

        if (toStr) {
          // inclusive ทั้งวัน -> next day 00:00Z แล้วใช้ $lt
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

        const until = new Date(today);
        until.setUTCMonth(until.getUTCMonth() + months);

        filter.dates = { $elemMatch: { $gte: today, $lt: until } };
      }
    } else {
      // ✅ DEFAULT: รอบทั้งหมดในอนาคต/ยังไม่จบ (ไม่จำกัดเดือน)
      // ถ้ารอบผ่านไปแล้ว (ทุก dates < today) -> ไม่ติดเงื่อนไขนี้
      filter.dates = { $elemMatch: { $gte: today } };
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
      // เรียงใกล้วันเริ่มก่อน (ถ้าคุณเก็บ dates[0] เป็นวันเริ่ม)
      .sort({ "dates.0": 1, "course.sort_order": 1, "course.course_name": 1 })
      .lean();

    return NextResponse.json(
      {
        ok: true,
        summary: {
          total: items.length,
          filterUsed: filter,
          todayUTC: today.toISOString(),
        },
        items,
      },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 },
    );
  }
}

/* ---------------- POST: create schedule ---------------- */
export async function POST(req) {
  const authError = checkAiApiKey(req);
  if (authError) return authError;

  try {
    await dbConnect();
    const body = await req.json();

    if (!body?.course) {
      return NextResponse.json(
        { ok: false, error: "course is required" },
        { status: 400 },
      );
    }

    const dates = parseDates(body.dates);
    if (!dates.length) {
      return NextResponse.json(
        { ok: false, error: "dates must be a non-empty array" },
        { status: 400 },
      );
    }

    const payload = {
      course: body.course,
      dates,
      status: ["open", "nearly_full", "full"].includes(body.status)
        ? body.status
        : "open",
      type: ["classroom", "hybrid"].includes(body.type)
        ? body.type
        : "classroom",
      signup_url: typeof body.signup_url === "string" ? body.signup_url : "",
    };

    const created = await Schedule.create(payload);
    const item = await Schedule.findById(created._id)
      .populate({
        path: "course",
        populate: { path: "program" },
      })
      .lean();

    dispatchWebhook("schedule.created", item);

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (err) {
    console.error("POST /api/ai/schedules error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Create failed" },
      { status: 400 },
    );
  }
}
