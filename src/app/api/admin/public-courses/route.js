// /src/app/api/admin/public-courses/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import PublicCourse from "@/models/PublicCourse";
import "@/models/Program";
import "@/models/Skill";

import { requireRole } from "@/lib/requireRole";
import { withRateLimit } from "@/lib/ratelimit";
import { z } from "zod";

/* ---------------- helpers ---------------- */
const cleanArray = (a) =>
  Array.isArray(a) ? a.map((s) => String(s).trim()).filter(Boolean) : [];

const cleanTopics = (arr) =>
  Array.isArray(arr)
    ? arr.map((t) => ({
        title: String(t?.title || "").trim(),
        bullets: cleanArray(t?.bullets),
      }))
    : [];

const toInt = (v, d = 0) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

/* ---------------- validation (Zod) ---------------- */
const CourseSchema = z.object({
  program: z.string().trim().optional(),
  skills: z.array(z.string()).optional().default([]),
  previous_course: z.string().trim().optional(),

  course_id: z.string().min(1, "course_id is required"),
  course_name: z.string().min(1, "course_name is required"),
  course_teaser: z.string().optional().default(""),

  // ✅ ใหม่: เก็บ URL ปกคอร์ส
  // อนุญาตให้ว่าง ("") ได้ เพื่อให้เคสที่ยังไม่อัปโหลดภาพไม่ error
  course_cover_url: z
    .union([z.string().url(), z.literal("")])
    .optional()
    .default(""),

  course_objectives: z.array(z.string()).optional().default([]),
  course_target_audience: z.array(z.string()).optional().default([]),
  course_prerequisites: z.array(z.string()).optional().default([]),
  course_system_requirements: z.array(z.string()).optional().default([]),
  training_topics: z
    .array(
      z.object({
        title: z.string().optional().default(""),
        bullets: z.array(z.string()).optional().default([]),
      })
    )
    .optional()
    .default([]),

  course_doc_paths: z.array(z.string()).optional().default([]),
  course_lab_paths: z.array(z.string()).optional().default([]),
  course_case_study_paths: z.array(z.string()).optional().default([]),
  website_urls: z.array(z.string()).optional().default([]),
  exam_links: z.array(z.string()).optional().default([]),

  course_trainingdays: z.coerce
    .number()
    .int()
    .nonnegative()
    .optional()
    .default(0),
  course_traininghours: z.coerce
    .number()
    .int()
    .nonnegative()
    .optional()
    .default(0),
  course_price: z.coerce.number().int().nonnegative().optional().default(0),
  course_netprice: z
    .union([z.coerce.number().int().nonnegative(), z.null()])
    .optional()
    .default(null),
  sort_order: z.coerce.number().int().optional().default(0),

  published: z.boolean().optional().default(false),
});

/* ---------------- POST /api/admin/public-courses (Create) ---------------- */
export const POST = withRateLimit({ points: 10, duration: 60 })(async (req) => {
  try {
    await requireRole(req, ["admin", "editor"]);
    await dbConnect();

    // ใช้ raw body แล้ว parse → กันกรณี partner จะเซ็น HMAC ในอนาคต
    const raw = await req.text();
    const json = raw ? JSON.parse(raw) : {};

    // normalize ให้สะอาดก่อน validate
    json.course_objectives = cleanArray(json.course_objectives);
    json.course_target_audience = cleanArray(json.course_target_audience);
    json.course_prerequisites = cleanArray(json.course_prerequisites);
    json.course_system_requirements = cleanArray(
      json.course_system_requirements
    );
    json.training_topics = cleanTopics(json.training_topics);
    json.course_doc_paths = cleanArray(json.course_doc_paths);
    json.course_lab_paths = cleanArray(json.course_lab_paths);
    json.course_case_study_paths = cleanArray(json.course_case_study_paths);
    json.website_urls = cleanArray(json.website_urls);
    json.exam_links = cleanArray(json.exam_links);

    // ✅ ใหม่: เคลียร์ค่า course_cover_url (trim แล้วถ้าว่างให้เป็น "")
    json.course_cover_url = (json.course_cover_url || "").trim();

    // number fields
    json.course_trainingdays = toInt(json.course_trainingdays, 0);
    json.course_traininghours = toInt(json.course_traininghours, 0);
    json.course_price = toInt(json.course_price, 0);
    json.sort_order = toInt(json.sort_order, 0);
    json.course_netprice =
      json.course_netprice === "" || json.course_netprice == null
        ? null
        : toInt(json.course_netprice, null);

    const input = CourseSchema.parse(json);
    const created = await PublicCourse.create(input);

    const item = await PublicCourse.findById(created._id)
      .populate("program")
      .populate("skills")
      .populate("previous_course")
      .lean();

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e; // ปล่อย 401/403 จาก requireRole ตรงๆ
    console.error("❌ Create error:", e);
    const msg = e?.errors?.[0]?.message || e?.message || "Create failed";
    const code = /Unauthorized|Forbidden/i.test(msg) ? 401 : 400;
    return NextResponse.json({ ok: false, error: msg }, { status: code });
  }
});

/* ---------------- PATCH /api/admin/public-courses (Update by _id) ---------------- */
export const PATCH = withRateLimit({ points: 20, duration: 60 })(async (req) => {
  try {
    await requireRole(req, ["admin", "editor"]);
    await dbConnect();

    const raw = await req.text();
    const json = raw ? JSON.parse(raw) : {};
    const id = String(json?._id || "").trim();
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "_id is required" },
        { status: 400 }
      );
    }

    // ทำความสะอาดเหมือน POST
    json.course_objectives = cleanArray(json.course_objectives);
    json.course_target_audience = cleanArray(json.course_target_audience);
    json.course_prerequisites = cleanArray(json.course_prerequisites);
    json.course_system_requirements = cleanArray(
      json.course_system_requirements
    );
    json.training_topics = cleanTopics(json.training_topics);
    json.course_doc_paths = cleanArray(json.course_doc_paths);
    json.course_lab_paths = cleanArray(json.course_lab_paths);
    json.course_case_study_paths = cleanArray(json.course_case_study_paths);
    json.website_urls = cleanArray(json.website_urls);
    json.exam_links = cleanArray(json.exam_links);

    // ✅ ใหม่: เคลียร์ค่า course_cover_url ตอน edit เช่นกัน
    if (json.course_cover_url !== undefined) {
      json.course_cover_url = (json.course_cover_url || "").trim();
    }

    json.course_trainingdays = toInt(json.course_trainingdays, 0);
    json.course_traininghours = toInt(json.course_traininghours, 0);
    json.course_price = toInt(json.course_price, 0);
    json.sort_order = toInt(json.sort_order, 0);
    json.course_netprice =
      json.course_netprice === "" || json.course_netprice == null
        ? null
        : toInt(json.course_netprice, null);

    // validate แบบ partial (ยกเว้น _id)
    const PartialSchema = CourseSchema.partial().extend({ _id: z.string() });
    const input = PartialSchema.parse({ ...json, _id: id });

    const { _id, ...updates } = input;
    const updated = await PublicCourse.findByIdAndUpdate(_id, updates, {
      new: true,
      runValidators: false, // เรา validate ด้วย zod แล้ว
    })
      .populate("program")
      .populate("skills")
      .populate("previous_course")
      .lean();

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, item: updated }, { status: 200 });
  } catch (e) {
    if (e instanceof Response) return e; // ปล่อย 401/403 จาก requireRole ตรงๆ
    console.error("❌ Update error:", e);
    const msg = e?.errors?.[0]?.message || e?.message || "Update failed";
    const code = /Unauthorized|Forbidden/i.test(msg) ? 401 : 400;
    return NextResponse.json({ ok: false, error: msg }, { status: code });
  }
});

/* ---------------- DELETE /api/admin/public-courses (Delete by _id) ---------------- */
export const DELETE = withRateLimit({ points: 10, duration: 60 })(async (req) => {
  try {
    await requireRole(req, ["admin"]); // ลบ จำกัดเฉพาะ admin
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") || "").trim();
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
    if (e instanceof Response) return e; // ปล่อย 401/403 จาก requireRole ตรงๆ
    console.error("❌ Delete error:", e);
    const msg = e?.errors?.[0]?.message || e?.message || "Delete failed";
    const code = /Unauthorized|Forbidden/i.test(msg) ? 401 : 400;
    return NextResponse.json({ ok: false, error: msg }, { status: code });
  }
});
