// src/app/api/instructors/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Instructor from "@/models/Instructor";
import Program from "@/models/Program"; // 👈 สำคัญ: ให้ mongoose register schema Program

export const dynamic = "force-dynamic";

// GET /api/instructors?q=&program=
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
      .populate({
        path: "programs",
        select: "program_id program_name", // เอาเฉพาะ field ที่จำเป็น
        model: Program, // ไม่ใส่ก็ได้ แต่ใส่ไว้ให้ชัดว่าใช้ model นี้
      })
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ ok: true, items }, { status: 200 });
  } catch (e) {
    console.error("GET /api/instructors (public) error:", e);
    return NextResponse.json(
      { ok: false, error: e.message || "Internal error" },
      { status: 500 }
    );
  }
}
