// src/app/api/admin/instructors/[id]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Instructor from "@/models/Instructor";

export const dynamic = "force-dynamic";

/* ===================== PATCH ===================== */
export async function PATCH(req, { params }) {
  const { id } = await params;
  await dbConnect();

  try {
    const body = await req.json();
    const { name, name_en, bio, programs,
      photo_url, photo_public_id,
      signature_url, signature_public_id } = body;

    const update = {};

    if (name !== undefined) update.name = name.trim();
    if (name_en !== undefined) update.name_en = name_en.trim();
    if (bio !== undefined) update.bio = bio.trim();
    if (programs !== undefined)
      update.programs = Array.isArray(programs) ? programs : [];
    if (photo_url !== undefined) update.photo_url = photo_url;
    if (photo_public_id !== undefined) update.photo_public_id = photo_public_id;
    if (signature_url !== undefined) update.signature_url = signature_url;
    if (signature_public_id !== undefined) update.signature_public_id = signature_public_id;

    const doc = await Instructor.findByIdAndUpdate(
      id,
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
  const { id } = await params;
  await dbConnect();

  try {
    const doc = await Instructor.findByIdAndDelete(id);
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
