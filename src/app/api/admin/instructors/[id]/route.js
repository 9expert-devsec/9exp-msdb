// src/app/api/admin/instructors/[id]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Instructor from "@/models/Instructor";

export const dynamic = "force-dynamic";

/* ===================== PATCH ===================== */
export async function PATCH(req, { params }) {
  await dbConnect();

  try {
    const body = await req.json();
    const { name, name_en, bio, programs } = body;

    const update = {};

    if (name !== undefined) update.name = name.trim();
    if (name_en !== undefined) update.name_en = name_en.trim(); // ✅ NEW
    if (bio !== undefined) update.bio = bio.trim();
    if (programs !== undefined)
      update.programs = Array.isArray(programs) ? programs : [];

    const doc = await Instructor.findByIdAndUpdate(
      params.id,
      { $set: update },
      { new: true }
    );

    if (!doc) {
      return NextResponse.json(
        { ok: false, error: "Instructor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, item: doc });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}

/* ===================== DELETE ===================== */
export async function DELETE(_req, { params }) {
  await dbConnect();

  try {
    const doc = await Instructor.findByIdAndDelete(params.id);
    if (!doc) {
      return NextResponse.json(
        { ok: false, error: "Instructor not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
