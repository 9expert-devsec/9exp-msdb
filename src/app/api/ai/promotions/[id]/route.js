// src/app/api/ai/promotions/[id]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Promotion from "@/models/Promotion";
import "@/models/PublicCourse";
import "@/models/OnlineCourse";
import { checkAiApiKey } from "@/lib/ai-auth";
import { corsHeaders, handleOptions } from "@/lib/cors";
import { dispatchWebhook } from "@/lib/webhook";

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

/* ---------------- PUT ---------------- */
export async function PUT(req, { params }) {
  const authError = checkAiApiKey(req);
  if (authError) return applyCors(req, authError);

  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    delete body._id;

    if (body.source && body.source !== "genesis" && body.source !== "msdb") {
      delete body.source;
    }

    const item = await Promotion.findByIdAndUpdate(id, body, { new: true })
      .populate({ path: "related_public_courses", select: "course_id course_name" })
      .populate({ path: "related_online_courses", select: "o_course_id o_course_name" })
      .lean();

    if (!item) {
      const res = NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 },
      );
      return applyCors(req, res);
    }

    dispatchWebhook("promotion.updated", item);

    const res = NextResponse.json({ ok: true, item }, { status: 200 });
    return applyCors(req, res);
  } catch (err) {
    console.error("PUT /api/ai/promotions/[id] error:", err);
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

    const gone = await Promotion.findByIdAndDelete(id).lean();
    if (!gone) {
      const res = NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 },
      );
      return applyCors(req, res);
    }

    dispatchWebhook("promotion.deleted", { _id: id });

    const res = NextResponse.json({ ok: true, id }, { status: 200 });
    return applyCors(req, res);
  } catch (err) {
    console.error("DELETE /api/ai/promotions/[id] error:", err);
    const res = NextResponse.json(
      { ok: false, error: err?.message || "Delete failed" },
      { status: 400 },
    );
    return applyCors(req, res);
  }
}
