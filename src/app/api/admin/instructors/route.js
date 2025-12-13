// src/app/api/admin/instructors/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Instructor from "@/models/Instructor";
import "@/models/Program";

export const dynamic = "force-dynamic";

/* ===================== GET ===================== */
export async function GET(req) {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const program = searchParams.get("program");

    const filter = {};

    if (program) {
      filter.programs = program;
    }

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { name_en: { $regex: q, $options: "i" } }, // ✅ search EN
        { bio: { $regex: q, $options: "i" } },
      ];
    }

    const items = await Instructor.find(filter)
      .populate({
        path: "programs",
        select: "program_id program_name programcolor programiconurl",
      })
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ ok: true, items });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}

/* ===================== POST ===================== */
export async function POST(req) {
  await dbConnect();

  try {
    const body = await req.json();
    const { name, name_en, bio, programs } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Name is required" },
        { status: 400 }
      );
    }

    const doc = await Instructor.create({
      name: name.trim(),
      name_en: name_en?.trim() || "", // ✅ NEW
      bio: bio?.trim() || "",
      programs: Array.isArray(programs) ? programs : [],
    });

    return NextResponse.json({ ok: true, item: doc });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
