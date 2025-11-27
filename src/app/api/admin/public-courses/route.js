// src/app/api/admin/public-courses/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import PublicCourse from "@/models/PublicCourse";
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

/* ---------- Zod schema ตาม PublicCourse ---------- */

const TopicSchema = z.object({
  title: z.string().optional().default(""),
  bullets: z.array(z.string()).optional().default([]),
});

const PublicCourseSchema = z
  .object({
    course_id: z.string().min(1),
    course_name: z.string().min(1),
    course_teaser: z.string().optional().default(""),

    // เวลา / ราคา / ระดับ
    course_trainingdays: z.coerce.number().int().optional().default(0),
    course_traininghours: z.coerce.number().int().optional().default(0),
    course_price: z.coerce.number().optional().default(0),
    course_netprice: z
      .union([z.coerce.number(), z.null()])
      .optional()
      .nullable()
      .transform((v) => (v === undefined ? null : v)),
    course_cover_url: z.string().optional().default(""),
    course_levels: z.string().optional().default("1"),

    // flags
    course_type_public: z.boolean().optional().default(true),
    course_type_inhouse: z.boolean().optional().default(false),
    course_workshop_status: z.boolean().optional().default(false),
    course_certificate_status: z.boolean().optional().default(false),
    course_promote_status: z.boolean().optional().default(false),

    // ความสัมพันธ์
    program: z.string().optional(),
    skills: z.array(z.string()).optional().default([]),

    sort_order: z.coerce.number().int().optional().default(0),

    // bullets หลัก
    course_objectives: z.array(z.string()).optional().default([]),
    course_target_audience: z.array(z.string()).optional().default([]),
    course_prerequisites: z.array(z.string()).optional().default([]),
    course_system_requirements: z.array(z.string()).optional().default([]),

    // training topics (หัวข้อ + หัวย่อย)
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

    // เอกสาร / URL
    course_doc_paths: z.array(z.string()).optional().default([]),
    course_lab_paths: z.array(z.string()).optional().default([]),
    course_case_study_paths: z.array(z.string()).optional().default([]),
    website_urls: z.array(z.string()).optional().default([]),
    exam_links: z.array(z.string()).optional().default([]),

    // previous course (ObjectId ใน DB, รับเป็น string id)
    previous_course: z.string().nullable().optional(),
  })
  .passthrough();

/* ---------- CREATE ---------- */
export const POST = withRateLimit({ points: 10, duration: 60 })(async (req) => {
  try {
    await requireRole(req, ["admin", "editor"]);
    await dbConnect();

    const json = await req.json();

    // normalize
    json.skills = cleanArray(json.skills);
    json.sort_order = toInt(json.sort_order, 0);

    json.course_trainingdays = normalizeNumber(json.course_trainingdays, false);
    json.course_traininghours = normalizeNumber(
      json.course_traininghours,
      false
    );
    json.course_price = normalizeNumber(json.course_price, false);
    json.course_netprice = normalizeNumber(json.course_netprice, true);

    json.course_objectives = cleanArray(json.course_objectives);
    json.course_target_audience = cleanArray(json.course_target_audience);
    json.course_prerequisites = cleanArray(json.course_prerequisites);
    json.course_system_requirements = cleanArray(
      json.course_system_requirements
    );

    json.course_doc_paths = cleanArray(json.course_doc_paths);
    json.course_lab_paths = cleanArray(json.course_lab_paths);
    json.course_case_study_paths = cleanArray(json.course_case_study_paths);
    json.website_urls = cleanArray(json.website_urls);
    json.exam_links = cleanArray(json.exam_links);

    // ❗ ถ้า previous_course ว่าง ให้ลบ field ทิ้งกัน cast error
    if (json.previous_course === "" || json.previous_course === undefined) {
  json.previous_course = null;
}

    const input = PublicCourseSchema.parse(json);
    const created = await PublicCourse.create(input);

    const item = await PublicCourse.findById(created._id)
      .populate(
        "program",
        "program_id program_name programiconurl programcolor"
      )
      .populate("skills", "skill_id skill_name skilliconurl skillcolor")
      .populate("previous_course", "course_id course_name")
      .lean();

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Create PublicCourse error:", e);
    const msg = e?.errors?.[0]?.message || e?.message || "Create failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
});

/* ---------- UPDATE ---------- */
export const PATCH = withRateLimit({ points: 20, duration: 60 })(async (req) => {
  try {
    await requireRole(req, ["admin", "editor"]);
    await dbConnect();

    const json = await req.json();

    // แปลง text -> array
    json.course_objectives = cleanArray(json.course_objectives);
    json.course_target_audience = cleanArray(json.course_target_audience);
    json.course_prerequisites = cleanArray(json.course_prerequisites);
    json.course_system_requirements = cleanArray(
      json.course_system_requirements
    );

    json.course_doc_paths = cleanArray(json.course_doc_paths);
    json.course_lab_paths = cleanArray(json.course_lab_paths);
    json.course_case_study_paths = cleanArray(json.course_case_study_paths);
    json.website_urls = cleanArray(json.website_urls);
    json.exam_links = cleanArray(json.exam_links);

    // "" -> null สำหรับ previous_course
    if (json.previous_course === "" || json.previous_course === undefined) {
      json.previous_course = null;
    }

    const id = String(json?._id || "").trim();
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "_id is required" },
        { status: 400 }
      );
    }

    const updates = PublicCourseSchema.partial().parse(json);

    const item = await PublicCourse.findByIdAndUpdate(id, updates, {
      new: true,
    })
      .populate("program", "program_id program_name programiconurl programcolor")
      .populate("skills", "skill_id skill_name skilliconurl skillcolor")
      .populate("previous_course", "course_id course_name")
      .lean();

    if (!item) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, item }, { status: 200 });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e?.errors?.[0]?.message || e?.message || "Update failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
});

/* ---------- DELETE (by ?id=) ---------- */
export const DELETE = withRateLimit({ points: 10, duration: 60 })(async (req) => {
  try {
    await requireRole(req, ["admin"]);
    await dbConnect();

    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id is required" },
        { status: 400 }
      );
    }

    const removed = await PublicCourse.findByIdAndDelete(id).lean();
    if (!removed) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, id }, { status: 200 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Delete PublicCourse error:", e);
    const msg = e?.message || "Delete failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
});
