import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Promotion from "@/models/Promotion";
import "@/models/PublicCourse";
import "@/models/OnlineCourse";
import { checkAiApiKey } from "@/lib/ai-auth";
import { corsHeaders, handleOptions } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = handleOptions;

/* ---------------- helpers ---------------- */

function applyCors(req, res) {
  const h = corsHeaders(req.headers.get("origin"));
  for (const [k, v] of Object.entries(h)) {
    res.headers.set(k, v);
  }
  return res;
}

function truthyParam(v) {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "y";
}

function escapeRegex(str = "") {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toValidDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function computePromotionMeta(promo, now = new Date()) {
  const start = toValidDate(promo?.start_at);
  const end = toValidDate(promo?.end_at);
  const isPublished = !!promo?.is_published;

  let timeStatus = "Active";
  if (start && start.getTime() > now.getTime()) {
    timeStatus = "Scheduled";
  } else if (end && end.getTime() < now.getTime()) {
    timeStatus = "Expired";
  }

  const publishStatus = isPublished ? "Published" : "Unpublished";
  const status = isPublished ? timeStatus : "Unpublished";

  return {
    status,
    time_status: timeStatus,
    publish_status: publishStatus,
  };
}

export async function GET(req) {
  const authError = checkAiApiKey(req);
  if (authError) return applyCors(req, authError);

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const tag = (searchParams.get("tag") || "").trim();

    const includeExpired = truthyParam(searchParams.get("includeExpired"));
    const includeUnpublished = truthyParam(
      searchParams.get("includeUnpublished"),
    );
    const includeScheduled = truthyParam(searchParams.get("includeScheduled"));
    const withFullCourses = truthyParam(searchParams.get("withFullCourses"));

    const now = new Date();
    const and = [];

    // default: เอาเฉพาะ published
    if (!includeUnpublished) {
      and.push({ is_published: true });
    }

    // default: เอาเฉพาะที่เริ่มแล้ว
    if (!includeScheduled) {
      and.push({
        $or: [{ start_at: null }, { start_at: { $lte: now } }],
      });
    }

    // default: ตัดตัวที่หมดอายุแล้ว
    if (!includeExpired) {
      and.push({
        $or: [{ end_at: null }, { end_at: { $gte: now } }],
      });
    }

    // search text
    if (q) {
      const re = new RegExp(escapeRegex(q), "i");
      and.push({
        $or: [
          { name: re },
          { slug: re },
          { detail_plain: re },
          { detail_html: re },
          { "tags.label": re },
        ],
      });
    }

    // filter tag แบบ exact match แต่ไม่สนตัวพิมพ์เล็ก/ใหญ่
    if (tag) {
      const tagRe = new RegExp(`^${escapeRegex(tag)}$`, "i");
      and.push({ "tags.label": tagRe });
    }

    const where = and.length ? { $and: and } : {};

    const publicPopulate = withFullCourses
      ? {
          path: "related_public_courses",
          select: "-__v",
        }
      : {
          path: "related_public_courses",
          select: "course_id course_name",
        };

    const onlinePopulate = withFullCourses
      ? {
          path: "related_online_courses",
          select: "-__v",
        }
      : {
          path: "related_online_courses",
          select: "o_course_id o_course_name",
        };

    const rawItems = await Promotion.find(where)
      // ไม่ใส่ .select() = ดึงครบทุก field ของ Promotion
      .populate(publicPopulate)
      .populate(onlinePopulate)
      .sort({ is_pinned: -1, start_at: -1, createdAt: -1 })
      .lean();

    const items = rawItems.map((it) => ({
      ...it,
      ...computePromotionMeta(it, now),
    }));

    const res = NextResponse.json(
      {
        ok: true,
        summary: {
          total: items.length,
          serverNow: now.toISOString(),
          filters: {
            includeExpired,
            includeUnpublished,
            includeScheduled,
            withFullCourses,
          },
        },
        items,
      },
      { status: 200 },
    );

    return applyCors(req, res);
  } catch (err) {
    console.error("GET /api/ai/promotions error:", err);

    const res = NextResponse.json(
      { ok: false, error: err?.message || "Internal Server Error" },
      { status: 500 },
    );
    return applyCors(req, res);
  }
}
