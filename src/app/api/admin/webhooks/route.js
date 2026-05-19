// src/app/api/admin/webhooks/route.js
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
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
    new Set(
      arr
        .map((s) => String(s || "").trim())
        .filter(Boolean)
    )
  );
}

/* ---------------- GET (list) ---------------- */
export async function GET(req) {
  try {
    await requireRole(req, ["admin", "editor", "viewer"]);
    await dbConnect();

    const items = await WebhookSubscription.find({})
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ ok: true, items }, { status: 200 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("GET /api/admin/webhooks error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Fetch failed" },
      { status: 400 }
    );
  }
}

/* ---------------- POST (create) ---------------- */
export async function POST(req) {
  try {
    await requireRole(req, ["admin"]);
    await dbConnect();

    const body = await req.json();
    const name = String(body?.name || "").trim();
    const url = String(body?.url || "").trim();
    let secret = String(body?.secret || "").trim();
    const events = normalizeEvents(body?.events);
    const is_active = body?.is_active === undefined ? true : !!body.is_active;

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "name is required" },
        { status: 400 }
      );
    }
    if (!isHttpUrl(url)) {
      return NextResponse.json(
        { ok: false, error: "url must be a valid http(s) URL" },
        { status: 400 }
      );
    }
    if (!secret) {
      secret = randomBytes(32).toString("hex");
    }

    const created = await WebhookSubscription.create({
      name,
      url,
      secret,
      events,
      is_active,
    });

    return NextResponse.json(
      { ok: true, item: created.toObject() },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/admin/webhooks error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Create failed" },
      { status: 400 }
    );
  }
}
