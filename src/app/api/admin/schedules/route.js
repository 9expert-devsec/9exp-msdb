// src/app/api/admin/schedules/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Schedule from "@/models/Schedule";
import PublicCourse from "@/models/PublicCourse";
import { z } from "zod";

export const dynamic = "force-dynamic";

/* ---------- helpers ---------- */
const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;

// Normalize date input -> store as UTC midnight always: YYYY-MM-DDT00:00:00.000Z
// Important: If input comes as ISO string (often shifted to previous day in UTC),
// we interpret it as "calendar day in Bangkok" first, then store UTC midnight of that day.
const normalizeToUtcMidnight = (input) => {
  if (!input) return null;

  // 1) date-only string: "YYYY-MM-DD" => direct
  if (typeof input === "string") {
    const s = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return new Date(`${s}T00:00:00.000Z`);
    }
  }

  // 2) ISO string with time OR Date object => parse to Date
  const dt = input instanceof Date ? input : new Date(String(input));
  if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) return null;

  // 3) Interpret as "Bangkok calendar day" by shifting +7h and reading UTC Y/M/D
  const bkk = new Date(dt.getTime() + BKK_OFFSET_MS);

  // 4) Store as UTC midnight of that Bangkok day
  return new Date(
    Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), bkk.getUTCDate())
  );
};

const parseDates = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map(normalizeToUtcMidnight)
    .filter(Boolean)
    .sort((a, b) => a - b);

const todayUtcMidnight = () => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
};

/* ---------- schema ---------- */
const SignupUrlSchema = z.preprocess((val) => {
  if (val == null) return "";
  const s = String(val).trim();
  if (!s || s.toLowerCase() === "undefined" || s.toLowerCase() === "null")
    return "";
  return s;
}, z.string().url().or(z.literal("")));

const CreateSchema = z.object({
  course: z.string().min(1),
  dates: z.array(z.coerce.date()).min(1),
  status: z.enum(["open", "nearly_full", "full"]).default("open"),
  type: z.enum(["classroom", "hybrid"]).default("classroom"),
  signup_url: SignupUrlSchema.default(""),
});

/* ---------- GET: list next N months ---------- */
export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);

  const monthsRaw = parseInt(searchParams.get("months") || "12", 10);
  const months = Math.max(Number.isFinite(monthsRaw) ? monthsRaw : 12, 1);

  // Date-only semantics in UTC boundaries
  const start = todayUtcMidnight();
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + months);

  const items = await Schedule.find({
    dates: { $elemMatch: { $gte: start, $lte: end } },
  })
    .populate({
      path: "course",
      select:
        "course_id course_name course_price course_trainingdays program programiconurl",
      populate: { path: "program", select: "program_name programiconurl" },
    })
    .sort({ "dates.0": 1 })
    .lean();

  return NextResponse.json({
    ok: true,
    summary: {
      total: items.length,
      months,
      range: { from: start.toISOString(), to: end.toISOString() },
    },
    items,
  });
}

/* ---------- POST: create schedule ---------- */
export async function POST(req) {
  await dbConnect();

  try {
    const raw = await req.json();

    // Normalize dates FIRST so DB always stores UTC midnight (for Bangkok calendar day)
    const parsed = CreateSchema.parse({
      ...raw,
      dates: parseDates(raw?.dates),
    });

    // Confirm course exists
    const exists = await PublicCourse.findById(parsed.course).lean();
    if (!exists) {
      return NextResponse.json(
        { ok: false, error: "Course not found" },
        { status: 400 }
      );
    }

    const created = await Schedule.create(parsed);

    const item = await Schedule.findById(created._id)
      .populate({
        path: "course",
        select:
          "course_id course_name course_price course_trainingdays program programiconurl",
        populate: { path: "program", select: "program_name programiconurl" },
      })
      .lean();

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (e) {
    const issues = e?.issues || null;
    const msg = e?.message || "Create failed";
    return NextResponse.json(
      { ok: false, error: msg, issues },
      { status: 400 }
    );
  }
}
