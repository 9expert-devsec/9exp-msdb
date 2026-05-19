// src/app/api/admin/webhooks/[id]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import WebhookSubscription from "@/models/WebhookSubscription";
import { requireRole } from "@/lib/requireRole";

export const dynamic = "force-dynamic";

function isHttpUrl(s) {
  try {
    const u = new URL(String(s || "").trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeEvents(arr) {
  if (!Array.isArray(arr)) return [];
  return Array.from(
    new Set(arr.map((s) => String(s || "").trim()).filter(Boolean))
  );
}

/* ---------------- PUT (update) ---------------- */
export async function PUT(req, { params }) {
  try {
    await requireRole(req, ["admin"]);
    await dbConnect();

    const { id } = await params;
    const body = await req.json();

    const update = {};
    if (body.name !== undefined) update.name = String(body.name || "").trim();
    if (body.url !== undefined) {
      const u = String(body.url || "").trim();
      if (!isHttpUrl(u)) {
        return NextResponse.json(
          { ok: false, error: "url must be a valid http(s) URL" },
          { status: 400 }
        );
      }
      update.url = u;
    }
    if (body.secret !== undefined && String(body.secret).trim()) {
      update.secret = String(body.secret).trim();
    }
    if (body.events !== undefined) update.events = normalizeEvents(body.events);
    if (body.is_active !== undefined) update.is_active = !!body.is_active;

    const item = await WebhookSubscription.findByIdAndUpdate(id, update, {
      new: true,
    }).lean();

    if (!item) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, item }, { status: 200 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("PUT /api/admin/webhooks/[id] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Update failed" },
      { status: 400 }
    );
  }
}

/* ---------------- DELETE ---------------- */
export async function DELETE(req, { params }) {
  try {
    await requireRole(req, ["admin"]);
    await dbConnect();

    const { id } = await params;
    const gone = await WebhookSubscription.findByIdAndDelete(id).lean();

    if (!gone) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, id }, { status: 200 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("DELETE /api/admin/webhooks/[id] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Delete failed" },
      { status: 400 }
    );
  }
}
