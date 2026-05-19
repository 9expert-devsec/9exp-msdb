// src/app/api/ai/instructors/[id]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Instructor from "@/models/Instructor";
import "@/models/Program";

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

    const update = {};
    if (body.name !== undefined) update.name = String(body.name).trim();
    if (body.name_en !== undefined) update.name_en = String(body.name_en).trim();
    if (body.bio !== undefined) update.bio = String(body.bio).trim();
    if (body.programs !== undefined)
      update.programs = Array.isArray(body.programs) ? body.programs : [];
    if (body.photo_url !== undefined) update.photo_url = body.photo_url;
    if (body.photo_public_id !== undefined)
      update.photo_public_id = body.photo_public_id;
    if (body.signature_url !== undefined) update.signature_url = body.signature_url;
    if (body.signature_public_id !== undefined)
      update.signature_public_id = body.signature_public_id;

    const doc = await Instructor.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true },
    );

    if (!doc) {
      const res = NextResponse.json(
        { ok: false, error: "Instructor not found" },
        { status: 404 },
      );
      return applyCors(req, res);
    }

    const item = doc.toObject();
    dispatchWebhook("instructor.updated", item);

    const res = NextResponse.json({ ok: true, item }, { status: 200 });
    return applyCors(req, res);
  } catch (err) {
    console.error("PUT /api/ai/instructors/[id] error:", err);
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

    const gone = await Instructor.findByIdAndDelete(id).lean();
    if (!gone) {
      const res = NextResponse.json(
        { ok: false, error: "Instructor not found" },
        { status: 404 },
      );
      return applyCors(req, res);
    }

    dispatchWebhook("instructor.deleted", { _id: id });

    const res = NextResponse.json({ ok: true, id }, { status: 200 });
    return applyCors(req, res);
  } catch (err) {
    console.error("DELETE /api/ai/instructors/[id] error:", err);
    const res = NextResponse.json(
      { ok: false, error: err?.message || "Delete failed" },
      { status: 400 },
    );
    return applyCors(req, res);
  }
}
