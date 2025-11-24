// src/app/api/admin/instructors/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Instructor from "@/models/Instructor";
import Program from "@/models/Program";

export const dynamic = "force-dynamic";

// GET /api/admin/instructors?q=&program=
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const program = searchParams.get("program");

    const filter = {};
    if (q) {
      filter.name = { $regex: q, $options: "i" };
    }
    if (program) {
      filter.programs = program;
    }

    const items = await Instructor.find(filter)
      .populate("programs")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ ok: true, items }, { status: 200 });
  } catch (e) {
    console.error("GET /admin/instructors error:", e);
    return NextResponse.json(
      { ok: false, error: e.message || "Internal error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/instructors
export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { name, bio = "", programs = [] } = body || {};

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { ok: false, error: "กรุณาใส่ชื่อ Instructor" },
        { status: 400 }
      );
    }

    const progIds = Array.isArray(programs)
      ? programs.filter(Boolean)
      : [];

    const created = await Instructor.create({
      name: String(name).trim(),
      bio: String(bio || "").trim(),
      programs: progIds,
    });

    const populated = await Instructor.findById(created._id)
      .populate("programs")
      .lean();

    return NextResponse.json({ ok: true, item: populated }, { status: 201 });
  } catch (e) {
    console.error("POST /admin/instructors error:", e);
    return NextResponse.json(
      { ok: false, error: e.message || "Internal error" },
      { status: 500 }
    );
  }
}
