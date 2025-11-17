import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Schedule from "@/models/Schedule";
import PublicCourse from "@/models/PublicCourse"; // <-- ต้อง import แบบ named default
import { z } from "zod";

export const dynamic = "force-dynamic";

/* ---------- helpers ---------- */
const parseDates = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((d) => new Date(d))
    .filter((d) => !isNaN(d))
    .sort((a, b) => a - b);

const CreateSchema = z.object({
  course: z.string().min(1),
  dates: z.array(z.coerce.date()).min(1),
  status: z.enum(["open", "nearly_full", "full"]).default("open"),
  type: z.enum(["classroom", "hybrid"]).default("classroom"),
  signup_url: z.string().url().or(z.literal("")).default(""),
});

/* ---------- GET: list next N months ---------- */
export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const months = Math.max(parseInt(searchParams.get("months") || "12", 10), 1);

  // ดึงเฉพาะตั้งแต่วันนี้ไปอีก N เดือน
  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + months);

  const items = await Schedule.find({
    dates: { $elemMatch: { $gte: now, $lte: end } },
  })
    .populate({
      path: "course",
      // เอาข้อมูลคอร์สที่ต้องใช้ไปแสดง
      select:
        "course_id course_name course_price course_trainingdays program programiconurl",
      populate: { path: "program", select: "program_name programiconurl" },
    })
    .sort({ "dates.0": 1 })
    .lean();

  return NextResponse.json({ ok: true, items });
}

/* ---------- POST: create schedule ---------- */
export async function POST(req) {
  await dbConnect();
  try {
    const raw = await req.json();

    // แปลงวันที่ก่อน validate
    const parsed = CreateSchema.parse({
      ...raw,
      dates: parseDates(raw?.dates),
    });

    // confirm ว่ามี PublicCourse จริง
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
    const msg = e?.message || "Create failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
