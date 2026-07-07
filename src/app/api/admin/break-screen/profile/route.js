// src/app/api/admin/break-screen/profile/route.js
// Build/export a break-screen profile (partial config) from a set of course_ids
// plus video links. STATELESS generate — we do NOT persist anywhere. Collecting
// profiles into a stored profiles.json (for the ?course= live flow) is optional
// future work handled outside this repo (prompt 04-B/04-C).
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import PublicCourse from "@/models/PublicCourse";
import "@/models/Program";
import { requireRole } from "@/lib/requireRole";
import {
  toBreakScreenCourse,
  buildProfile,
  BREAK_SCREEN_COURSE_SELECT,
} from "@/lib/breakScreen";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    await requireRole(req, ["admin", "editor"]);
    await dbConnect();

    const body = await req.json().catch(() => ({}));
    const { label, courseIds, videos } = body || {};

    const ids = Array.isArray(courseIds)
      ? courseIds.map((s) => String(s).trim()).filter(Boolean)
      : [];

    if (!ids.length) {
      return NextResponse.json(
        { ok: false, error: "courseIds is required" },
        { status: 400 }
      );
    }

    const docs = await PublicCourse.find({ course_id: { $in: ids } })
      .select(BREAK_SCREEN_COURSE_SELECT)
      .lean();

    // preserve the admin-provided order of courseIds
    const byId = new Map(docs.map((d) => [d.course_id, d]));
    const courses = ids
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map(toBreakScreenCourse);

    const profile = buildProfile({ label, courses, videos });

    return NextResponse.json({ ok: true, profile });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { ok: false, error: e.message || "Failed to build profile" },
      { status: 500 }
    );
  }
}
