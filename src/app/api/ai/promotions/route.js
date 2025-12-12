// src/app/api/ai/promotions/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Promotion from "@/models/Promotion";
import "@/models/PublicCourse";
import "@/models/OnlineCourse";
import { checkAiApiKey } from "@/lib/ai-auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const authError = checkAiApiKey(req);
  if (authError) return authError;

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const tag = (searchParams.get("tag") || "").trim();

    const where = {};
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

    const items = await Promotion.find(where)
      .populate("related_public_courses", "course_id course_name")
      .populate("related_online_courses", "o_course_id o_course_name")
      .sort({ is_pinned: -1, start_at: -1, createdAt: -1 })
      .lean();

    return NextResponse.json(
      {
        ok: true,
        summary: {
          total: items.length,
        },
        items,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/ai/promotions error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message },
      { status: 500 }
    );
  }
}
