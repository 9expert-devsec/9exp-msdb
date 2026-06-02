// src/app/api/admin/public-courses/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import PublicCourse from "@/models/PublicCourse";
import "@/models/Program";
import "@/models/Skill";
import { requireRole } from "@/lib/requireRole";
import { withRateLimit } from "@/lib/ratelimit";
import { dispatchWebhook } from "@/lib/webhook";
import { shapePublicCourseForExternal } from "@/lib/shapeCourseForExternal";
import { z } from "zod";

/* ---------- helpers ---------- */
export const cleanArray = (a) =>
  Array.isArray(a)
    ? a.map((s) => String(s).trim()).filter(Boolean)
    : typeof a === "string"
    ? String(a)
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

export const toInt = (v, d = 0) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

const normalizeNumber = (v, nullable = false) => {
  if (v === "" || v == null) return nullable ? null : 0;
  const n = Number(v);
  if (!Number.isFinite(n)) return nullable ? null : 0;
  return n;
};

/* ทำความสะอาด course_outline_en:
 *  - file_id "" -> null กัน Mongoose ObjectId cast error
 *  - เมื่อ kind !== "file" ให้ล้าง file_id เป็น null (ไม่ผูกไฟล์)
 *  - คืน undefined ถ้า input ไม่ใช่ object (จะได้ไม่ถูกเขียนทับใน partial update)
 */
export const normalizeOutline = (o) => {
  if (o == null || typeof o !== "object") return o;
  const out = { ...o };
  if (out.file_id === "" || out.file_id === undefined) out.file_id = null;
  if (out.kind !== "file") out.file_id = null;
  return out;
};

/* ---------- Zod schema ตาม PublicCourse ---------- */

const TopicSchema = z.object({
  title: z.string().optional().default(""),
  bullets: z.array(z.string()).optional().default([]),
});

/* Course outline (link OR MSDB GridFS file) — shared by EN & TH */
const CourseOutlineZod = z
  .object({
    kind: z.enum(["", "link", "file"]).optional().default(""),
    url: z.string().optional().default(""),
    // GridFS id arrives as a 24-char string (or null/"" when not a file)
    file_id: z.union([z.string(), z.null()]).optional().nullable(),
    filename: z.string().optional().default(""),
    content_type: z.string().optional().default(""),
    size: z.coerce.number().optional().default(0),
    uploaded_at: z.union([z.coerce.date(), z.null()]).optional().nullable(),
  })
  .optional();

export const PublicCourseSchema = z
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
    course_roadmap_desktop_url: z.string().optional().default(""),
    course_roadmap_mobile_url: z.string().optional().default(""),
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
    course_lab_paths: z.array(z.string()).optional().default([]),
    course_case_study_paths: z.array(z.string()).optional().default([]),
    website_urls: z.array(z.string()).optional().default([]),
    exam_links: z.array(z.string()).optional().default([]),

    // Course outline: external link OR file stored in MSDB (GridFS) — EN & TH
    course_outline_en: CourseOutlineZod,
    course_outline_th: CourseOutlineZod,

    // previous course (ObjectId ใน DB, รับเป็น string id)
    previous_course: z.string().nullable().optional(),

    // related courses (max 5, same type)
    related_courses: z.array(z.string()).max(5).optional().default([]),
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

    json.course_lab_paths = cleanArray(json.course_lab_paths);
    json.course_case_study_paths = cleanArray(json.course_case_study_paths);
    json.website_urls = cleanArray(json.website_urls);
    json.exam_links = cleanArray(json.exam_links);

    // course_outline_en/th: กัน cast error ของ file_id เมื่อไม่ใช่ไฟล์
    json.course_outline_en = normalizeOutline(json.course_outline_en);
    json.course_outline_th = normalizeOutline(json.course_outline_th);

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
      .populate("related_courses", "course_id course_name")
      .lean();

    const shaped = shapePublicCourseForExternal(item);
    dispatchWebhook("course.created", shaped);

    return NextResponse.json({ ok: true, item: shaped }, { status: 201 });
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

    // Capture which keys the client ACTUALLY sent, BEFORE any mutation.
    // This is what makes the PATCH a true partial update and prevents
    // omitted fields from being fabricated as [] / null and wiping data.
    const providedKeys = new Set(Object.keys(json));
    const normalized = { ...json };

    // Only normalize array fields that were actually provided.
    const ARRAY_FIELDS = [
      "course_objectives",
      "course_target_audience",
      "course_prerequisites",
      "course_system_requirements",
      "course_lab_paths",
      "course_case_study_paths",
      "website_urls",
      "exam_links",
    ];
    for (const key of ARRAY_FIELDS) {
      if (providedKeys.has(key)) {
        normalized[key] = cleanArray(normalized[key]);
      }
    }

    // Normalize outline objects only when actually sent (keeps file_id a valid
    // ObjectId/null so it never throws a cast error).
    for (const key of ["course_outline_en", "course_outline_th"]) {
      if (providedKeys.has(key)) {
        normalized[key] = normalizeOutline(normalized[key]);
      }
    }

    // Only coerce previous_course "" -> null when the key was actually sent.
    // If omitted, leave it untouched (do NOT add or null it).
    if (providedKeys.has("previous_course") && normalized.previous_course === "") {
      normalized.previous_course = null;
    }

    const id = String(normalized?._id || "").trim();
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "_id is required" },
        { status: 400 }
      );
    }

    const parsed = PublicCourseSchema.partial().parse(normalized);

    // CRITICAL: Zod fills .default() values for fields the client never sent.
    // A partial update must contain ONLY the keys actually provided in the
    // request body, otherwise findByIdAndUpdate overwrites real data with
    // empty defaults (skills:[], course_price:0, ...). Rebuild `updates` from
    // providedKeys so Zod-injected defaults are dropped.
    const updates = {};
    for (const key of providedKeys) {
      if (key === "_id") continue;
      if (key in parsed) updates[key] = parsed[key];
    }

    const item = await PublicCourse.findByIdAndUpdate(id, updates, {
      new: true,
    })
      .populate("program", "program_id program_name programiconurl programcolor")
      .populate("skills", "skill_id skill_name skilliconurl skillcolor")
      .populate("previous_course", "course_id course_name")
      .populate("related_courses", "course_id course_name")
      .lean();

    if (!item) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 }
      );
    }

    const shaped = shapePublicCourseForExternal(item);
    dispatchWebhook("course.updated", shaped);

    return NextResponse.json({ ok: true, item: shaped }, { status: 200 });
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

    dispatchWebhook("course.deleted", { _id: id });

    return NextResponse.json({ ok: true, id }, { status: 200 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Delete PublicCourse error:", e);
    const msg = e?.message || "Delete failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
});
