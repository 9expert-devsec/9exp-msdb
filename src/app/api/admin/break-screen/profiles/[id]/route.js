// src/app/api/admin/break-screen/profiles/[id]/route.js
// Fetch / update / delete a single BreakScreenProfile.
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import BreakScreenProfile from "@/models/BreakScreenProfile";
import "@/models/Instructor";
import { requireRole } from "@/lib/requireRole";
import { normalizeProfilePayload } from "@/lib/breakScreenProfilePayload";
import { pingBreakScreenRevalidate } from "@/lib/revalidateBreakScreen";

export const dynamic = "force-dynamic";

/* ---------------- GET one ---------------- */
export async function GET(req, ctx) {
  try {
    await requireRole(req, ["admin", "editor"]);
    await dbConnect();
    const { id } = await ctx.params;

    const item = await BreakScreenProfile.findById(id)
      .populate("instructor", "name name_en")
      .lean();
    if (!item) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, item });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { ok: false, error: e.message || "Failed to load profile" },
      { status: 500 }
    );
  }
}

/* ---------------- PUT update ---------------- */
export async function PUT(req, ctx) {
  try {
    await requireRole(req, ["admin", "editor"]);
    await dbConnect();
    const { id } = await ctx.params;

    const body = await req.json().catch(() => ({}));
    // full-body update (form always sends everything); slug re-checked below
    const payload = await normalizeProfilePayload(body);

    if ("slug" in payload) {
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
    }

    // Cheap read of the previous slug BEFORE the write, so a slug change can
    // purge the OLD path too (findByIdAndUpdate returns only the new doc).
    const prev = await BreakScreenProfile.findById(id).select("slug").lean();

    const item = await BreakScreenProfile.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
    if (!item) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    // Fire-and-forget: revalidate the new path, plus the old one if the slug changed.
    pingBreakScreenRevalidate(item.slug);
    if (prev?.slug && prev.slug !== item.slug) {
      pingBreakScreenRevalidate(prev.slug);
    }

    return NextResponse.json({
      ok: true,
      item: item.toObject(),
      profileValue: item.toProfileValue(),
    });
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
      { ok: false, error: msg || "Failed to update profile" },
      { status: 500 }
    );
  }
}

/* ---------------- DELETE ----------------
 * Prefer ARCHIVE (status:"archived") so exported profiles.json history stays
 * recoverable. Pass ?hard=1 for a true hard delete.
 */
export async function DELETE(req, ctx) {
  try {
    await requireRole(req, ["admin", "editor"]);
    await dbConnect();
    const { id } = await ctx.params;

    const { searchParams } = new URL(req.url);
    const hard = searchParams.get("hard") === "1";

    if (hard) {
      const gone = await BreakScreenProfile.findByIdAndDelete(id).lean();
      if (!gone) {
        return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
      }
      // Fire-and-forget: the page must revalidate to reflect the removal.
      pingBreakScreenRevalidate(gone.slug);
      return NextResponse.json({ ok: true, deleted: "hard" });
    }

    const item = await BreakScreenProfile.findByIdAndUpdate(
      id,
      { status: "archived" },
      { new: true }
    ).lean();
    if (!item) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    // Fire-and-forget: archiving removes it from the active set the projector shows.
    pingBreakScreenRevalidate(item.slug);
    return NextResponse.json({ ok: true, deleted: "archived", item });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { ok: false, error: e.message || "Failed to delete profile" },
      { status: 500 }
    );
  }
}
