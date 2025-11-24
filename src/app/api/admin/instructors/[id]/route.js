// src/app/api/admin/instructors/[id]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Instructor from "@/models/Instructor";
import "@/models/Program";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  try {
    await dbConnect();
    const { id } = params;
    const item = await Instructor.findById(id)
      .populate("programs")
      .lean();

    if (!item) {
      return NextResponse.json(
        { ok: false, error: "Instructor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, item }, { status: 200 });
  } catch (e) {
    console.error("GET /admin/instructors/[id] error:", e);
    return NextResponse.json(
      { ok: false, error: e.message || "Internal error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    await dbConnect();
    const { id } = params;
    const body = await req.json();

    const update = {};
    if ("name" in body) update.name = String(body.name || "").trim();
    if ("bio" in body) update.bio = String(body.bio || "").trim();
    if ("programs" in body) {
      update.programs = Array.isArray(body.programs)
        ? body.programs.filter(Boolean)
        : [];
    }

    const updated = await Instructor.findByIdAndUpdate(id, update, {
      new: true,
    })
      .populate("programs")
      .lean();

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "Instructor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, item: updated }, { status: 200 });
  } catch (e) {
    console.error("PATCH /admin/instructors/[id] error:", e);
    return NextResponse.json(
      { ok: false, error: e.message || "Internal error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req, { params }) {
  try {
    await dbConnect();
    const { id } = params;
    await Instructor.findByIdAndDelete(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("DELETE /admin/instructors/[id] error:", e);
    return NextResponse.json(
      { ok: false, error: e.message || "Internal error" },
      { status: 500 }
    );
  }
}
