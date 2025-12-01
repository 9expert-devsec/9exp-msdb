// src/app/api/admin/promotions/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Promotion from "@/models/Promotion";
import PublicCourse from "@/models/PublicCourse";
import OnlineCourse from "@/models/OnlineCourse";

import { requireRole } from "@/lib/requireRole";
import { withRateLimit } from "@/lib/ratelimit";
import { z } from "zod";

export const dynamic = "force-dynamic";

/* ---------------- zod schema ---------------- */

const TagInputSchema = z.object({
  label: z.string().min(1),
  color: z.string().optional().default("#0ea5e9"),
});

const PromotionInputSchema = z.object({
  name: z.string().min(1),

  slug: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(""))
    .nullable(),

  image_url: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal(""))
    .nullable(),
  image_alt: z.string().optional().nullable(),

  detail_html: z.string().optional().default(""),
  detail_plain: z.string().optional().default(""),

  external_url: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal(""))
    .nullable(),

  tags: z.array(TagInputSchema).optional().default([]),

  related_public_courses: z.array(z.string()).optional().default([]),
  related_online_courses: z.array(z.string()).optional().default([]),

  start_at: z.string().optional().or(z.literal("")).nullable(),
  end_at: z.string().optional().or(z.literal("")).nullable(),

  is_published: z.boolean().optional().default(true),
  is_pinned: z.boolean().optional().default(false),
});

/* ---------------- helpers ---------------- */

function normalizeBooleans(json) {
  const bool = (v, d = false) => {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return v === "true" || v === "1";
    return d;
  };
  return {
    ...json,
    is_published: bool(json.is_published, true),
    is_pinned: bool(json.is_pinned, false),
  };
}

function htmlToPlain(html = "") {
  if (!html) return "";

  let s = String(html);

  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");

  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/p>/gi, "\n\n");
  s = s.replace(/<\/h[1-6]>/gi, "\n\n");
  s = s.replace(/<\/li>/gi, "\n");
  s = s.replace(/<(ul|ol)>/gi, "\n");

  s = s.replace(/<[^>]+>/g, "");

  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  s = s
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  const MAX_LEN = 4000;
  if (s.length > MAX_LEN) {
    s = s.slice(0, MAX_LEN) + "…";
  }
  return s;
}

function mapInputToPayload(input) {
  const cleanTags = (input.tags || [])
    .filter((t) => t && t.label)
    .map((t) => ({
      label: String(t.label),
      color: String(t.color || "#0ea5e9"),
    }));

  const toIdArray = (arr) =>
    (arr || [])
      .map((v) => String(v || "").trim())
      .filter(Boolean);

  const toDateOrNull = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  return {
    name: input.name,
    slug: input.slug || null,
    image_url: input.image_url || null,
    image_alt: input.image_alt || "",

    detail_html: input.detail_html || "",
    detail_plain: input.detail_plain || "",

    external_url: input.external_url || null,

    tags: cleanTags,

    related_public_courses: toIdArray(input.related_public_courses),
    related_online_courses: toIdArray(input.related_online_courses),

    start_at: toDateOrNull(input.start_at),
    end_at: toDateOrNull(input.end_at),

    is_published:
      typeof input.is_published === "boolean" ? input.is_published : true,
    is_pinned:
      typeof input.is_pinned === "boolean" ? input.is_pinned : false,
  };
}

function addComputedFields(doc) {
  const obj = { ...doc };
  obj.related_public_courses_count =
    (obj.related_public_courses || []).length;
  obj.related_online_courses_count =
    (obj.related_online_courses || []).length;
  return obj;
}

function basePromotionQuery(where = {}) {
  return Promotion.find(where)
    .populate({
      path: "related_public_courses",
      model: PublicCourse,
      select: "course_id course_name",
    })
    .populate({
      path: "related_online_courses",
      model: OnlineCourse,
      select: "o_course_id o_course_name",
    });
}

/* ---------------- GET ---------------- */

export const GET = withRateLimit({ points: 60, duration: 60 })(async (req) => {
  try {
    await requireRole(req, ["admin", "editor", "viewer"]);
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const tag = (searchParams.get("tag") || "").trim();
    const id = (searchParams.get("id") || "").trim();

    const where = {};

    if (id) {
      where._id = id;
    }

    if (q) {
      const re = new RegExp(q, "i");
      where.$or = [
        { name: re },
        { slug: re },
        { detail_plain: re },
        { "tags.label": re },
      ];
    }

    if (tag) {
      where["tags.label"] = tag;
    }

    const docs = await basePromotionQuery(where)
      .sort({ is_pinned: -1, start_at: -1, createdAt: -1 })
      .lean();

    const items = (docs || []).map(addComputedFields);

    // ถ้าส่ง id มาให้ถือว่าใช้เหมือน get one
    if (id) {
      const one = items[0] || null;
      return NextResponse.json({ ok: true, item: one }, { status: 200 });
    }

    return NextResponse.json({ ok: true, items }, { status: 200 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("GET /api/admin/promotions error:", e);
    const msg = e?.message || "Fetch failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
});

/* ---------------- POST ---------------- */

export const POST = withRateLimit({ points: 20, duration: 60 })(async (req) => {
  try {
    await requireRole(req, ["admin", "editor"]);
    await dbConnect();

    const json = await req.json();
    const normalized = normalizeBooleans(json);
    const input = PromotionInputSchema.parse(normalized);
    const payload = mapInputToPayload(input);

    if (!payload.detail_plain && payload.detail_html) {
      payload.detail_plain = htmlToPlain(payload.detail_html).slice(0, 260);
    }

    const created = await Promotion.create(payload);
    const doc = await basePromotionQuery({ _id: created._id }).lean();
    const item = addComputedFields(doc[0]);

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/admin/promotions error:", e);
    const msg = e?.errors?.[0]?.message || e?.message || "Create failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
});

/* ---------------- PATCH ---------------- */

export const PATCH = withRateLimit({ points: 30, duration: 60 })(async (req) => {
  try {
    await requireRole(req, ["admin", "editor"]);
    await dbConnect();

    const json = await req.json();
    const id = String(json?._id || "").trim();
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "_id is required" },
        { status: 400 }
      );
    }

    const normalized = normalizeBooleans(json);
    const input = PromotionInputSchema.parse(normalized);
    const payload = mapInputToPayload(input);

    if (!payload.detail_plain && payload.detail_html) {
      payload.detail_plain = htmlToPlain(payload.detail_html).slice(0, 260);
    }

    await Promotion.findByIdAndUpdate(id, payload, { new: true });

    const docs = await basePromotionQuery({ _id: id }).lean();
    const updated = docs[0];

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 }
      );
    }

    const item = addComputedFields(updated);
    return NextResponse.json({ ok: true, item }, { status: 200 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("PATCH /api/admin/promotions error:", e);
    const msg = e?.errors?.[0]?.message || e?.message || "Update failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
});

/* ---------------- DELETE ---------------- */

export const DELETE = withRateLimit({ points: 10, duration: 60 })(async (req) => {
  try {
    await requireRole(req, ["admin"]);
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") || "").trim();

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id is required" },
        { status: 400 }
      );
    }

    const removed = await Promotion.findByIdAndDelete(id).lean();
    if (!removed) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, id }, { status: 200 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("DELETE /api/admin/promotions error:", e);
    const msg = e?.message || "Delete failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
});
