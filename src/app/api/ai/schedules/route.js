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

/* ---------------- status param ---------------- */
// ค่าที่รู้จัก (ตรงกับ enum ใน models/Schedule.js)
const STATUS_VALUES = ["open", "nearly_full", "full", "closed"];
// DEFAULT เดิม: ไม่ส่ง status มา -> เอาเฉพาะ open + nearly_full (ห้ามเปลี่ยน)
const DEFAULT_STATUSES = ["open", "nearly_full"];

/**
 * แปลง ?status= เป็น mongo condition
 * - ไม่ส่งมาเลย (null) -> ใช้ default เดิม { $in: ["open","nearly_full"] }
 * - "all"              -> null (ไม่ใส่ filter.status = เอาทุกสถานะ)
 * - "full" / "open,full" -> { $in: [...] }
 * - ค่าที่ไม่รู้จัก / ว่าง -> throw StatusParamError (ตอบ 400 ไม่ใช่เงียบ ๆ)
 *
 * @returns {{ cond: object|null }}
 */
function parseStatusParam(raw) {
  // absent (ไม่มี key เลย) -> default เดิม
  if (raw === null || raw === undefined) {
    return { cond: { $in: DEFAULT_STATUSES } };
  }

  const value = String(raw).trim();

  // "?status=" ส่ง key มาแต่ว่าง -> ถือว่า malformed (ไม่ fallback เงียบ ๆ)
  if (!value) {
    throw new StatusParamError("status must not be empty", []);
  }

  if (value === "all") return { cond: null };

  const requested = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!requested.length) {
    throw new StatusParamError("status must not be empty", []);
  }

  // "all" ปนกับค่าอื่น -> ไม่รับ (กำกวม)
  const invalid = requested.filter((s) => !STATUS_VALUES.includes(s));
  if (invalid.length) {
    throw new StatusParamError(
      `Unknown status value(s): ${invalid.join(", ")}`,
      invalid,
    );
  }

  return { cond: { $in: [...new Set(requested)] } };
}

class StatusParamError extends Error {
  constructor(message, invalid) {
    super(message);
    this.name = "StatusParamError";
    this.invalid = invalid;
  }
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
    // status: default = open + nearly_full (เดิม), opt-in ได้ด้วย ?status=
    //   ?status=all              -> ทุกสถานะ
    //   ?status=full             -> เฉพาะ full
    //   ?status=open,full        -> comma-separated
    //   ค่าที่ไม่รู้จัก           -> 400 (ไม่ปล่อยผ่านเงียบ ๆ)
    // NOTE: ต้อง assign ตรงตำแหน่งเดิม เพื่อให้ลำดับ key ของ summary.filterUsed
    //       ตอนไม่ส่ง status มา เหมือนเดิมทุกประการ
    const statusCond = parseStatusParam(searchParams.get("status")).cond;
    if (statusCond) filter.status = statusCond;

    /* ---------------- date filter (สำคัญ) ----------------
       DEFAULT คือ "ไม่เอารอบที่ผ่านไปแล้ว" โดยนิยามว่า:
       - ถ้าวันปัจจุบันเลยวันสุดท้ายของรอบ -> ไม่แสดง
       ทำได้ด้วย: dates มีอย่างน้อย 1 วันที่ >= วันนี้ 00:00Z
       แต่เป็นแค่ค่า default เมื่อ caller ไม่ได้ระบุขอบล่างมาเอง
       (ถ้าส่ง from หรือ date มา -> ใช้ตามที่ขอ ไม่มีการ clamp)
    */
    const today = utcStartOfToday();

    const hasDateFilter = !!(dateStr || fromStr || toStr || monthsParam);

    // ช่วงวันที่ที่เป็นไปไม่ได้ (from > to) -> ตอบว่างแบบตั้งใจ ไม่ต้องยิง DB
    let emptyRange = false;

    if (hasDateFilter) {
      if (dateStr) {
        // ระบุวันเดียว: [day 00:00Z, next day 00:00Z) ใช้ตามที่ caller ขอ
        //
        // เดิม start ถูกดันขึ้นเป็น today ด้วย maxDate(startRaw, today) ซึ่งมา
        // จาก 72fd700 ชุดเดียวกับ from (ดูคอมเมนต์ในสาขา from/to) ผลคือ ?date=
        // ที่เป็นอดีตจะได้ start >= end เสมอ -> คืน 0 แถวทุกครั้ง ไม่ใช่เพราะ
        // ไม่มีข้อมูล แต่เพราะช่วงที่สร้างขึ้นมาเป็นไปไม่ได้
        // ถอดออกด้วยเหตุผลเดียวกับ from: today เป็นค่า default ได้
        // แต่ต้องไม่ไปทับวันที่ที่ caller ระบุมาเอง
        const start = utcMidnight(dateStr);

        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 1);

        filter.dates = { $elemMatch: { $gte: start, $lt: end } };
      } else if (fromStr || toStr) {
        const cond = {};

        // `from` ใช้ตามที่ caller ส่งมาเป๊ะ ๆ ห้าม clamp
        //
        // เดิมบรรทัดนี้คือ maxDate(utcMidnight(fromStr), today) มาจาก 72fd700
        // ("update api filter shedule", 2026-01-30) ซึ่งใส่ฟิลเตอร์ที่ไม่ได้
        // ประกาศไว้ในสัญญา API มาพร้อมกันหลายตัว (status, signup_url) เพื่อซ่อน
        // รอบที่จบไปแล้ว ผลคือมันเขียนช่วงวันที่ของ caller ทิ้งแบบเงียบ ๆ:
        // from=2026-08-01&to=2026-08-31 กลายเป็น
        // {$gte: <today>, $lt: 2026-09-01} ซึ่งเป็นช่วงที่เป็นไปไม่ได้ คืน 0 แถว
        // และทำให้อ่านรอบย้อนหลังผ่าน API นี้ไม่ได้เลย
        //
        // ฟิลเตอร์ตัวอื่นในชุดเดียวกันถูกถอนไปแล้วด้วยเหตุผลเดียวกัน:
        // b255381 เปลี่ยน status เป็น opt-in ?status= และ c5c8a3c ถอด
        // signup_url ออก บรรทัดนี้เดินตามแนวเดิม: `today` เป็นแค่ค่า DEFAULT
        // ตอนที่ไม่ได้ส่ง from มา ไม่ใช่เพดานที่ไปทับสิ่งที่ caller ขอ
        if (fromStr) cond.$gte = utcMidnight(fromStr);
        else cond.$gte = today; // ไม่ส่ง from มา ก็ยังกันอดีตอยู่ดี (default)

        if (toStr) {
          // inclusive ทั้งวัน -> next day 00:00Z แล้วใช้ $lt
          const toStart = utcMidnight(toStr);
          const toEnd = new Date(toStart);
          toEnd.setUTCDate(toEnd.getUTCDate() + 1);
          cond.$lt = toEnd;
        }

        // from > to: ตอนนี้เกิดได้เฉพาะเมื่อ caller ขอมาแบบนั้นจริง ๆ
        // (ไม่มีการแทนค่าอะไรให้แล้ว) -> ตอบว่างแบบตั้งใจ ไม่ยิง query ที่
        // ยังไงก็ไม่มีทาง match
        if (cond.$lt && cond.$gte >= cond.$lt) emptyRange = true;

        // NOTE (known unbounded case): `to` ไม่บังคับ และ endpoint นี้ไม่มี
        // limit/pagination เลย ดังนั้น from ย้อนหลังไกล ๆ โดยไม่ส่ง to จะคืน
        // ประวัติทั้งหมดในครั้งเดียว วัดเมื่อ 2026-09-02: worst case 265 แถว
        // ~199 KiB (status=all) ยังรับได้ที่ปริมาณข้อมูลเท่านี้
        // ถ้า collection โตกว่านี้มากค่อยกลับมาทบทวนเรื่อง cap/pagination
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

    const items = emptyRange
      ? []
      : await Schedule.find(filter)
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
    // ?status= ที่ไม่ถูกต้อง -> 400 พร้อมบอกค่าที่รับได้ (ไม่ใช่ 500 และไม่เงียบ)
    if (err instanceof StatusParamError) {
      return NextResponse.json(
        {
          ok: false,
          error: err.message,
          issues: [
            {
              path: ["status"],
              received: err.invalid,
              expected: [...STATUS_VALUES, "all"],
            },
          ],
        },
        { status: 400 },
      );
    }
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
      status: STATUS_VALUES.includes(body.status)
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
