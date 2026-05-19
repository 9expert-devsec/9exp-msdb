// src/app/api/ai/schedules/[id]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import "@/models/PublicCourse";
import Schedule from "@/models/Schedule";

import { checkAiApiKey } from "@/lib/ai-auth";
import { dispatchWebhook } from "@/lib/webhook";

export const dynamic = "force-dynamic";

const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;

function normalizeToUtcMidnight(input) {
  if (!input) return null;
  if (typeof input === "string") {
    const s = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return new Date(`${s}T00:00:00.000Z`);
    }
  }
  const dt = input instanceof Date ? input : new Date(String(input));
  if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) return null;
  const bkk = new Date(dt.getTime() + BKK_OFFSET_MS);
  return new Date(
    Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), bkk.getUTCDate())
  );
}

function parseDates(arr) {
  return (Array.isArray(arr) ? arr : [])
    .map(normalizeToUtcMidnight)
    .filter(Boolean)
    .sort((a, b) => a - b);
}

/* ---------------- PUT ---------------- */
export async function PUT(req, { params }) {
  const authError = checkAiApiKey(req);
  if (authError) return authError;

  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    const update = {};
    if (body.status && ["open", "nearly_full", "full"].includes(body.status)) {
      update.status = body.status;
    }
    if (body.type && ["classroom", "hybrid"].includes(body.type)) {
      update.type = body.type;
    }
    if (body.course) update.course = body.course;
    if (typeof body.signup_url === "string") update.signup_url = body.signup_url;
    if (Array.isArray(body.dates)) {
      const normalized = parseDates(body.dates);
      if (normalized.length) update.dates = normalized;
    }

    const item = await Schedule.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    })
      .populate({ path: "course", populate: { path: "program" } })
      .lean();

    if (!item) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 },
      );
    }

    dispatchWebhook("schedule.updated", item);

    return NextResponse.json({ ok: true, item }, { status: 200 });
  } catch (err) {
    console.error("PUT /api/ai/schedules/[id] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Update failed" },
      { status: 400 },
    );
  }
}

/* ---------------- DELETE ---------------- */
export async function DELETE(req, { params }) {
  const authError = checkAiApiKey(req);
  if (authError) return authError;

  try {
    await dbConnect();
    const { id } = await params;

    const gone = await Schedule.findByIdAndDelete(id).lean();
    if (!gone) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 },
      );
    }

    dispatchWebhook("schedule.deleted", { _id: id });

    return NextResponse.json({ ok: true, id }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/ai/schedules/[id] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Delete failed" },
      { status: 400 },
    );
  }
}
