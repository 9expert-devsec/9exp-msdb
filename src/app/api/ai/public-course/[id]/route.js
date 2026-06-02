// src/app/api/ai/public-course/[id]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import PublicCourse from "@/models/PublicCourse";
import "@/models/Program";
import "@/models/Skill";

import { checkAiApiKey } from "@/lib/ai-auth";
import { corsHeaders, handleOptions } from "@/lib/cors";
import { dispatchWebhook } from "@/lib/webhook";
import { shapePublicCourseForExternal } from "@/lib/shapeCourseForExternal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = handleOptions;

function applyCors(req, res) {
  const h = corsHeaders(req.headers.get("origin"));
  for (const [k, v] of Object.entries(h)) {
    res.headers.set(k, v);
  }
  return res;
}

/* ---------------- PUT: update by id ---------------- */
export async function PUT(req, { params }) {
  const authError = checkAiApiKey(req);
  if (authError) return applyCors(req, authError);

  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    delete body._id;

    const item = await PublicCourse.findByIdAndUpdate(id, body, { new: true })
      .populate({
        path: "program",
        select: "program_id program_name programiconurl sort_order",
      })
      .populate({
        path: "skills",
        select: "skill_id skill_name skilliconurl skillcolor",
      })
      .lean();

    if (!item) {
      const res = NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 },
      );
      return applyCors(req, res);
    }

    const shaped = shapePublicCourseForExternal(item);
    dispatchWebhook("course.updated", shaped);

    const res = NextResponse.json({ ok: true, item: shaped }, { status: 200 });
    return applyCors(req, res);
  } catch (err) {
    console.error("PUT /api/ai/public-course/[id] error:", err);
    const res = NextResponse.json(
      { ok: false, error: err?.message || "Update failed" },
      { status: 400 },
    );
    return applyCors(req, res);
  }
}

/* ---------------- DELETE ---------------- */
export async function DELETE(req, { params }) {
  const authError = checkAiApiKey(req);
  if (authError) return applyCors(req, authError);

  try {
    await dbConnect();
    const { id } = await params;

    const gone = await PublicCourse.findByIdAndDelete(id).lean();
    if (!gone) {
      const res = NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 },
      );
      return applyCors(req, res);
    }

    dispatchWebhook("course.deleted", { _id: id });

    const res = NextResponse.json({ ok: true, id }, { status: 200 });
    return applyCors(req, res);
  } catch (err) {
    console.error("DELETE /api/ai/public-course/[id] error:", err);
    const res = NextResponse.json(
      { ok: false, error: err?.message || "Delete failed" },
      { status: 400 },
    );
    return applyCors(req, res);
  }
}
