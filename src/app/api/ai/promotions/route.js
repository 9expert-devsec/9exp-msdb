// src/app/api/ai/promotions/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Promotion from "@/models/Promotion";
import "@/models/PublicCourse";
import "@/models/OnlineCourse";
import { checkAiApiKey } from "@/lib/ai-auth";

export const dynamic = "force-dynamic";

/* ---------------- helpers ---------------- */

function computePromotionStatus(promo, now = new Date()) {
  const end = promo?.end_at ? new Date(promo.end_at) : null;
  if (end && end.getTime() < now.getTime()) return "Expired";
  return "Active";
}

export async function GET(req) {
  const authError = checkAiApiKey(req);
  if (authError) return authError;

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const tag = (searchParams.get("tag") || "").trim();

    const now = new Date();

    // ✅ เงื่อนไขหลัก: ต้องเป็น Active เท่านั้น (Expired ไม่ดึง)
    // Active = is_published=true และ (end_at ว่าง หรือ end_at >= now)
    const and = [
      { is_published: true },
      { $or: [{ end_at: null }, { end_at: { $gte: now } }] },
    ];

    // search text
    if (q) {
      const re = new RegExp(q, "i");
      and.push({
        $or: [
          { name: re },
          { slug: re },
          { detail_plain: re },
          { "tags.label": re },
        ],
      });
    }

    // filter tag
    if (tag) {
      and.push({ "tags.label": tag });
    }

    const where = and.length ? { $and: and } : {};

    const rawItems = await Promotion.find(where)
      .populate("related_public_courses", "course_id course_name")
      .populate("related_online_courses", "o_course_id o_course_name")
      .sort({ is_pinned: -1, start_at: -1, createdAt: -1 })
      .lean();

    // ✅ ใส่ status ลงไปใน response
    const items = rawItems.map((it) => ({
      ...it,
      status: computePromotionStatus(it, now), // จะเป็น "Active" ทั้งหมดตามเงื่อนไขที่ filter
    }));

    return NextResponse.json(
      {
        ok: true,
        summary: {
          total: items.length,
          serverNow: now.toISOString(),
        },
        items,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("GET /api/ai/promotions error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message },
      { status: 500 },
    );
  }
}
