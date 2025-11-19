import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import OnlineCourse from "@/models/OnlineCourse";

import { withCors } from "@/lib/cors";

export const dynamic = "force-dynamic";

const cleanArray = (text) =>
  Array.isArray(text)
    ? text
    : String(text || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

/* ---------- GET one ---------- */
export const GET = withCors(async (req, { params }) => {
  try {
    await dbConnect();
    const item = await OnlineCourse.findById(params.id)
      .populate("program")
      .populate("skills")
      .lean();

    if (!item)
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    return NextResponse.json({ ok: true, item });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
});

/* ---------- PATCH ---------- */
export const PATCH = withCors(async (req, { params }) => {
  try {
    await dbConnect();
    const body = await req.json();

    const payload = {
      ...body,

      o_course_doc_paths: cleanArray(body.o_course_doc_paths),
      o_course_lab_paths: cleanArray(body.o_course_lab_paths),
      o_course_case_study_paths: cleanArray(body.o_course_case_study_paths),

      o_course_objectives: cleanArray(body.o_course_objectives),
      o_course_target_audience: cleanArray(body.o_course_target_audience),
      o_course_prerequisites: cleanArray(body.o_course_prerequisites),
      o_course_system_requirements: cleanArray(body.o_course_system_requirements),
      o_course_training_topics: cleanArray(body.o_course_training_topics),
    };

    const updated = await OnlineCourse.findByIdAndUpdate(params.id, payload, {
      new: true,
    });

    return NextResponse.json({ ok: true, item: updated });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
});

/* ---------- DELETE ---------- */
export const DELETE = withCors(async (req, { params }) => {
  try {
    await dbConnect();
    await OnlineCourse.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
});

export const OPTIONS = withCors(async () => new Response(null, { status: 204 }));
