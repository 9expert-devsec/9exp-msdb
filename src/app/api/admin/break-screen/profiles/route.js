// src/app/api/admin/break-screen/profiles/route.js
// List + create BreakScreenProfiles.
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import BreakScreenProfile from "@/models/BreakScreenProfile";
import "@/models/Instructor";
import { requireRole } from "@/lib/requireRole";
import { normalizeProfilePayload } from "@/lib/breakScreenProfilePayload";

export const dynamic = "force-dynamic";

/* ---------------- GET list ---------------- */
export async function GET(req) {
  try {
    await requireRole(req, ["admin", "editor"]);
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const status = (searchParams.get("status") || "").trim();

    const where = {};
    if (status === "active" || status === "archived") where.status = status;
    if (q) {
      const re = new RegExp(q, "i");
      where.$or = [{ slug: re }, { label: re }];
    }

    const items = await BreakScreenProfile.find(where)
      .populate("instructor", "name name_en")
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ ok: true, items });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { ok: false, error: e.message || "Failed to list profiles" },
      { status: 500 }
    );
  }
}

/* ---------------- POST create ---------------- */
export async function POST(req) {
  try {
    await requireRole(req, ["admin", "editor"]);
    await dbConnect();

    const body = await req.json().catch(() => ({}));
    const payload = await normalizeProfilePayload(body);

    if (!payload.slug) {
      return NextResponse.json(
        { ok: false, error: "slug is required" },
        { status: 400 }
      );
    }
    if (!/^[a-z0-9-]+$/.test(payload.slug)) {
      return NextResponse.json(
        { ok: false, error: "slug ต้องเป็น kebab-case (a-z, 0-9, -) เท่านั้น" },
        { status: 400 }
      );
    }

    const created = await BreakScreenProfile.create(payload);

    return NextResponse.json(
      {
        ok: true,
        item: created.toObject(),
        profileValue: created.toProfileValue(),
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = String(e?.message || "");
    if (msg.includes("E11000") && msg.includes("slug")) {
      return NextResponse.json(
        { ok: false, error: "slug นี้ถูกใช้แล้ว (duplicate)" },
        { status: 409 }
      );
    }
    if (e?.name === "ValidationError") {
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, error: msg || "Failed to create profile" },
      { status: 500 }
    );
  }
}
