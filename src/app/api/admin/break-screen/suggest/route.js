// src/app/api/admin/break-screen/suggest/route.js
// Suggested courses for an instructor = PublicCourses whose `program` is in the
// instructor's programs[] AND course_promote_status === true, ordered by
// sort_order. Feeds the break-screen generator admin page.
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Instructor from "@/models/Instructor";
import PublicCourse from "@/models/PublicCourse";
import "@/models/Program";
import { requireRole } from "@/lib/requireRole";
import { BREAK_SCREEN_COURSE_SELECT } from "@/lib/breakScreen";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    // mirror sibling admin routes' guard (see public-courses route)
    await requireRole(req, ["admin", "editor"]);
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const instructorId = (searchParams.get("instructorId") || "").trim();
    if (!instructorId) {
      return NextResponse.json(
        { ok: false, error: "instructorId is required" },
        { status: 400 }
      );
    }

    const instructor = await Instructor.findById(instructorId)
      .populate("programs", "program_id program_name programcolor programiconurl")
      .lean();

    if (!instructor) {
      return NextResponse.json(
        { ok: false, error: "Instructor not found" },
        { status: 404 }
      );
    }

    const programIds = (instructor.programs || []).map((p) => p._id);

    // Filter by BOTH: program ∈ instructor.programs AND promote === true.
    // Sorted by sort_order (ยิ่งน้อยยิ่งขึ้นก่อน).
    const items = programIds.length
      ? await PublicCourse.find({
          program: { $in: programIds },
          course_promote_status: true,
        })
          .select(BREAK_SCREEN_COURSE_SELECT)
          .populate("program", "program_name programcolor programiconurl")
          .sort({ sort_order: 1 })
          .lean()
      : [];

    return NextResponse.json({
      ok: true,
      instructor: {
        _id: instructor._id,
        name: instructor.name,
        name_en: instructor.name_en || "",
        programs: instructor.programs || [],
      },
      items,
    });
  } catch (e) {
    if (e instanceof Response) return e; // requireRole 401/403
    return NextResponse.json(
      { ok: false, error: e.message || "Failed to load suggestions" },
      { status: 500 }
    );
  }
}
