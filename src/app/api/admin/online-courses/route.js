// src/app/api/admin/online-courses/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import OnlineCourse from "@/models/OnlineCourse";
import "@/models/Program";
import "@/models/Skill";
import { requireRole } from "@/lib/requireRole";
import { withRateLimit } from "@/lib/ratelimit";
import { z } from "zod";

/* ---------- helpers ---------- */
const cleanArray = (a) =>
  Array.isArray(a)
    ? a.map((s) => String(s).trim()).filter(Boolean)
    : typeof a === "string"
    ? String(a)
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

const toInt = (v, d = 0) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

const normalizeNumber = (v, nullable = false) => {
  if (v === "" || v == null) return nullable ? null : 0;
  const n = Number(v);
  if (!Number.isFinite(n)) return nullable ? null : 0;
  return n;
};

/* ---------- Zod schema ---------- */

const TopicSchema = z.object({
  title: z.string().optional().default(""),
  bullets: z.array(z.string()).optional().default([]),
});

const OnlineCourseSchema = z
  .object({
    o_course_id: z.string().min(1),
    o_course_name: z.string().min(1),
    o_course_teaser: z.string().optional().default(""),

    program: z.string().optional(),
    skills: z.array(z.string()).optional().default([]),

    o_number_lessons: z.coerce.number().int().optional().default(0),
    o_course_traininghours: z.coerce.number().int().optional().default(0),

    o_course_price: z.coerce.number().optional().default(0),
    o_course_netprice: z
      .union([z.coerce.number(), z.null()])
      .optional()
      .nullable()
      .transform((v) => (v === undefined ? null : v)),

    o_course_cover_url: z.string().optional().default(""),
    o_course_levels: z.string().optional().default("1"),

    o_course_workshop_status: z.boolean().optional().default(false),
    o_course_certificate_status: z.boolean().optional().default(false),
    o_course_promote_status: z.boolean().optional().default(false),

    // Bullets (arrays of string)
    o_course_objectives: z.array(z.string()).optional().default([]),
    o_course_target_audience: z.array(z.string()).optional().default([]),
    o_course_prerequisites: z.array(z.string()).optional().default([]),
    o_course_system_requirements: z.array(z.string()).optional().default([]),

    // Training topics (หัวข้อ + หัวย่อย) — จะ map เป็น array ของ {title, bullets}
    training_topics: z
      .array(TopicSchema)
      .optional()
      .default([])
      .transform((arr) =>
        (arr || []).map((t) => ({
          title: (t.title || "").trim(),
          bullets: (t.bullets || [])
            .map((b) => (b || "").trim())
            .filter(Boolean),
        }))
      ),

    // URLs / paths
    o_course_doc_paths: z.array(z.string()).optional().default([]),
    o_course_lab_paths: z.array(z.string()).optional().default([]),
    o_course_case_study_paths: z.array(z.string()).optional().default([]),
    website_urls: z.array(z.string()).optional().default([]),
    exam_links: z.array(z.string()).optional().default([]),

    sort_order: z.coerce.number().int().optional().default(0),
    published: z.boolean().optional().default(false),

    // เก็บ ObjectId ของคอร์สก่อนหน้า (รับเป็น string id จาก FE)
    previous_course: z.string().optional(),
  })
  // เผื่ออนาคตมี field อื่น ๆ เพิ่ม จะไม่โดนตัดทิ้ง
  .passthrough();

/* --------------------------------
 * CREATE
 * -------------------------------- */
export const POST = withRateLimit({ points: 10, duration: 60 })(async (req) => {
  try {
    await requireRole(req, ["admin", "editor"]);
    await dbConnect();

    const json = await req.json();

    // ----- normalize / clean ก่อนเข้า schema -----
    json.skills = cleanArray(json.skills);
    json.sort_order = toInt(json.sort_order, 0);

    json.o_number_lessons = normalizeNumber(json.o_number_lessons, false);
    json.o_course_traininghours = normalizeNumber(
      json.o_course_traininghours,
      false
    );
    json.o_course_price = normalizeNumber(json.o_course_price, false);
    json.o_course_netprice = normalizeNumber(json.o_course_netprice, true);

    // bullets
    json.o_course_objectives = cleanArray(json.o_course_objectives);
    json.o_course_target_audience = cleanArray(json.o_course_target_audience);
    json.o_course_prerequisites = cleanArray(json.o_course_prerequisites);
    json.o_course_system_requirements = cleanArray(
      json.o_course_system_requirements
    );

    // urls / paths
    json.o_course_doc_paths = cleanArray(json.o_course_doc_paths);
    json.o_course_lab_paths = cleanArray(json.o_course_lab_paths);
    json.o_course_case_study_paths = cleanArray(json.o_course_case_study_paths);
    json.website_urls = cleanArray(json.website_urls);
    json.exam_links = cleanArray(json.exam_links);

    // previous_course: ถ้าเป็น "", null หรือ undefined → ลบออก
    if (!json.previous_course) {
      delete json.previous_course;
    }

    const input = OnlineCourseSchema.parse(json);
    const created = await OnlineCourse.create(input);

    const item = await OnlineCourse.findById(created._id)
      .populate(
        "program",
        "program_id program_name programiconurl programcolor"
      )
      .populate("skills", "skill_id skill_name skilliconurl skillcolor")
      .populate("previous_course", "o_course_id o_course_name")
      .lean();

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Create OnlineCourse error:", e);
    const msg = e?.errors?.[0]?.message || e?.message || "Create failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
});

/* --------------------------------
 * UPDATE (PATCH by body._id)
 * -------------------------------- */
export const PATCH = withRateLimit({ points: 20, duration: 60 })(async (req) => {
  try {
    await requireRole(req, ["admin", "editor"]);
    await dbConnect();

    const json = await req.json();
    const id = String(json?._id || "").trim();
    if (!id)
      return NextResponse.json(
        { ok: false, error: "_id is required" },
        { status: 400 }
      );

    // ----- normalize fields เหมือน POST แต่ไม่ต้องบังคับทุก field -----
    if ("skills" in json) json.skills = cleanArray(json.skills);
    if ("sort_order" in json) json.sort_order = toInt(json.sort_order, 0);

    if ("o_number_lessons" in json)
      json.o_number_lessons = normalizeNumber(json.o_number_lessons, false);
    if ("o_course_traininghours" in json)
      json.o_course_traininghours = normalizeNumber(
        json.o_course_traininghours,
        false
      );
    if ("o_course_price" in json)
      json.o_course_price = normalizeNumber(json.o_course_price, false);
    if ("o_course_netprice" in json)
      json.o_course_netprice = normalizeNumber(json.o_course_netprice, true);

    if ("o_course_objectives" in json)
      json.o_course_objectives = cleanArray(json.o_course_objectives);
    if ("o_course_target_audience" in json)
      json.o_course_target_audience = cleanArray(
        json.o_course_target_audience
      );
    if ("o_course_prerequisites" in json)
      json.o_course_prerequisites = cleanArray(json.o_course_prerequisites);
    if ("o_course_system_requirements" in json)
      json.o_course_system_requirements = cleanArray(
        json.o_course_system_requirements
      );

    if ("o_course_doc_paths" in json)
      json.o_course_doc_paths = cleanArray(json.o_course_doc_paths);
    if ("o_course_lab_paths" in json)
      json.o_course_lab_paths = cleanArray(json.o_course_lab_paths);
    if ("o_course_case_study_paths" in json)
      json.o_course_case_study_paths = cleanArray(
        json.o_course_case_study_paths
      );
    if ("website_urls" in json)
      json.website_urls = cleanArray(json.website_urls);
    if ("exam_links" in json) json.exam_links = cleanArray(json.exam_links);

    if (!json.previous_course) {
      // ถ้าเป็น "", null, undefined ให้ลบออก -> Mongoose จะเคลียร์ field
      delete json.previous_course;
    }

    const updates = OnlineCourseSchema.partial().parse(json);

    const item = await OnlineCourse.findByIdAndUpdate(id, updates, {
      new: true,
    })
      .populate(
        "program",
        "program_id program_name programiconurl programcolor"
      )
      .populate("skills", "skill_id skill_name skilliconurl skillcolor")
      .populate("previous_course", "o_course_id o_course_name")
      .lean();

    if (!item)
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 }
      );

    return NextResponse.json({ ok: true, item }, { status: 200 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Update OnlineCourse error:", e);
    const msg = e?.errors?.[0]?.message || e?.message || "Update failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
});

/* --------------------------------
 * DELETE (by ?id=)
 * -------------------------------- */
export const DELETE = withRateLimit({ points: 10, duration: 60 })(async (req) => {
  try {
    await requireRole(req, ["admin"]);
    await dbConnect();

    const id = new URL(req.url).searchParams.get("id");
    if (!id)
      return NextResponse.json(
        { ok: false, error: "id is required" },
        { status: 400 }
      );

    const removed = await OnlineCourse.findByIdAndDelete(id).lean();
    if (!removed)
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 }
      );
    return NextResponse.json({ ok: true, id }, { status: 200 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Delete OnlineCourse error:", e);
    const msg = e?.message || "Delete failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
});
