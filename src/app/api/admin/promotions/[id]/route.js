// src/app/api/admin/promotions/[id]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Promotion from "@/models/Promotion";
import "@/models/PublicCourse";
import "@/models/OnlineCourse";
import { requireRole } from "@/lib/requireRole";
import { withRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const basePopulate = [
  {
    path: "related_public_courses",
    select: "course_id course_name",
  },
  {
    path: "related_online_courses",
    select: "o_course_id o_course_name",
  },
];

export const GET = withRateLimit({ points: 30, duration: 60 })(
  async (req, { params }) => {
    try {
      await requireRole(req, ["admin", "editor"]);
      await dbConnect();

      const id = params?.id;
      if (!id) {
        return NextResponse.json(
          { ok: false, error: "id is required" },
          { status: 400 }
        );
      }

      const item = await Promotion.findById(id)
        .populate(basePopulate)
        .lean();

      if (!item) {
        return NextResponse.json(
          { ok: false, error: "Not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ ok: true, item }, { status: 200 });
    } catch (e) {
      console.error("GET /admin/promotions/[id] error:", e);
      const msg = e?.message || "Failed to get promotion";
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
  }
);
