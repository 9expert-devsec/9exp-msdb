// src/app/api/admin/break-screen/search/route.js
// Course search for the "add any course (override)" flow in the break-screen
// generator. Not limited to an instructor's programs.
//
// NOTE: we add a dedicated endpoint instead of reusing /api/admin/search-courses
// because that endpoint only `.select("course_name course_id program")` — it
// does NOT carry cover/price/hours/promote fields that toBreakScreenCourse()
// needs. Here we return lean docs with the SAME select shape as /suggest so the
// client can map any hit with the same helper.
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import PublicCourse from "@/models/PublicCourse";
import "@/models/Program";
import { requireRole } from "@/lib/requireRole";
import { BREAK_SCREEN_COURSE_SELECT } from "@/lib/breakScreen";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    await requireRole(req, ["admin", "editor"]);
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ ok: true, items: [] });
    }

    const re = new RegExp(q, "i");
    const items = await PublicCourse.find({
      $or: [{ course_name: re }, { course_id: re }],
    })
      .select(BREAK_SCREEN_COURSE_SELECT)
      .populate("program", "program_name programcolor programiconurl")
      .sort({ sort_order: 1 })
      .limit(20)
      .lean();

    return NextResponse.json({ ok: true, items });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { ok: false, error: e.message || "Search failed" },
      { status: 500 }
    );
  }
}
