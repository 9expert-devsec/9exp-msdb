// src/app/api/promotions/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Promotion from "@/models/Promotion";
import "@/models/PublicCourse";
import "@/models/OnlineCourse";

export const dynamic = "force-dynamic";

function addStatus(item) {
  const now = new Date();
  let status = "active";

  if (item.start_at && new Date(item.start_at) > now) {
    status = "scheduled";
  } else if (item.end_at && new Date(item.end_at) < now) {
    status = "expired";
  }

  return { ...item, status };
}

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const tag = (searchParams.get("tag") || "").trim();
    const activeOnly = searchParams.get("activeOnly") === "1";

    const where = { is_published: true };

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

    // only active promotions
    if (activeOnly) {
      const now = new Date();
      where.$and = [
        {
          $or: [
            { start_at: null },
            { start_at: { $lte: now } },
          ],
        },
        {
          $or: [
            { end_at: null },
            { end_at: { $gte: now } },
          ],
        },
      ];
    }

    const items = await Promotion.find(where)
      .sort({ is_pinned: -1, start_at: -1, createdAt: -1 })
      .populate("related_public_courses", "course_id course_name")
      .populate("related_online_courses", "o_course_id o_course_name")
      .lean();

    const mapped = items.map(addStatus);

    return NextResponse.json({ ok: true, items: mapped }, { status: 200 });
  } catch (e) {
    console.error("GET /api/promotions error:", e);
    return NextResponse.json(
      { ok: false, error: e.message || "Fetch failed" },
      { status: 400 }
    );
  }
}
