// src/app/api/promotions/[slug]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Promotion from "@/models/Promotion";

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

export async function GET(req, { params }) {
  try {
    await dbConnect();

    const slug = params.slug;

    const item = await Promotion.findOne({
      slug,
      is_published: true,
    })
      .populate("related_public_courses", "course_id course_name")
      .populate("related_online_courses", "o_course_id o_course_name")
      .lean();

    if (!item) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ok: true, item: addStatus(item) },
      { status: 200 }
    );
  } catch (e) {
    console.error("GET /api/promotions/:slug error:", e);
    return NextResponse.json(
      { ok: false, error: e.message || "Fetch failed" },
      { status: 400 }
    );
  }
}
