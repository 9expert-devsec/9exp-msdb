// src/app/api/ai/instructors/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Instructor from "@/models/Instructor";
import "@/models/Program"; // สำหรับ populate ให้ Program ถูก register

import { checkAiApiKey } from "@/lib/ai-auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  // 1) ตรวจ API key ก่อน
  const authError = checkAiApiKey(req);
  if (authError) return authError; // ถ้าไม่ผ่านจะ return JSON 401/403 แทน 500

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const program = (searchParams.get("program") || "").trim();

    const filter = {};
    if (q) {
      filter.name = { $regex: q, $options: "i" };
    }
    if (program) {
      filter.programs = program;
    }

    const items = await Instructor.find(filter)
      .populate(
        "programs",
        "program_id program_name programiconurl programcolor"
      )
      .sort({ name: 1 })
      .lean();

    return NextResponse.json(
      {
        ok: true,
        summary: {
          total: items.length,
        },
        items,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/ai/instructors error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
