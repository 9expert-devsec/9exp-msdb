import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import OnlineCourse from "@/models/OnlineCourse";
import "@/models/Program";
import "@/models/Skill";
import { requireRole } from "@/lib/requireRole";
import { withRateLimit } from "@/lib/ratelimit";
import { z } from "zod";

const cleanArray = (a) =>
  Array.isArray(a) ? a.map((s) => String(s).trim()).filter(Boolean) : [];
const toInt = (v, d = 0) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

/** ปรับตามฟิลด์ใน OnlineCourse model ของคุณ */
const OnlineCourseSchema = z.object({
  o_course_id: z.string().min(1),
  o_course_name: z.string().min(1),
  o_course_teaser: z.string().optional().default(""),

  program: z.string().optional(),
  skills: z.array(z.string()).optional().default([]),

  sort_order: z.coerce.number().int().optional().default(0),
  published: z.boolean().optional().default(false),

  // เพิ่มฟิลด์อื่น ๆ ของคอร์สออนไลน์ที่ต้องการรองรับได้เลย
});

/* ---------- CREATE ---------- */
export const POST = withRateLimit({ points: 10, duration: 60 })(async (req) => {
  try {
    await requireRole(req, ["admin", "editor"]);
    await dbConnect();

    const json = await req.json();
    json.skills = cleanArray(json.skills);
    json.sort_order = toInt(json.sort_order, 0);

    const input = OnlineCourseSchema.parse(json);
    const created = await OnlineCourse.create(input);

    const item = await OnlineCourse.findById(created._id)
      .populate("program", "program_id program_name programiconurl programcolor")
      .populate("skills", "skill_id skill_name skilliconurl skillcolor")
      .lean();

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e?.errors?.[0]?.message || e?.message || "Create failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
});

/* ---------- UPDATE (by _id) ---------- */
export const PATCH = withRateLimit({ points: 20, duration: 60 })(async (req) => {
  try {
    await requireRole(req, ["admin", "editor"]);
    await dbConnect();

    const json = await req.json();
    const id = String(json?._id || "").trim();
    if (!id) return NextResponse.json({ ok: false, error: "_id is required" }, { status: 400 });

    json.skills = cleanArray(json.skills);
    json.sort_order = toInt(json.sort_order, 0);

    const updates = OnlineCourseSchema.partial().parse(json);
    const item = await OnlineCourse.findByIdAndUpdate(id, updates, { new: true })
      .populate("program", "program_id program_name programiconurl programcolor")
      .populate("skills", "skill_id skill_name skilliconurl skillcolor")
      .lean();

    if (!item) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, item }, { status: 200 });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e?.errors?.[0]?.message || e?.message || "Update failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
});

/* ---------- DELETE (by id query) ---------- */
export const DELETE = withRateLimit({ points: 10, duration: 60 })(async (req) => {
  try {
    await requireRole(req, ["admin"]);
    await dbConnect();

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });

    const removed = await OnlineCourse.findByIdAndDelete(id).lean();
    if (!removed) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, id }, { status: 200 });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e?.message || "Delete failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
});
