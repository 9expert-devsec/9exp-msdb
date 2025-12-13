// src/app/api/ai/instructors/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Instructor from "@/models/Instructor";
import "@/models/Program";

import { checkAiApiKey } from "@/lib/ai-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai/instructors
 * Query:
 *  - q        : search (thai / english / bio)
 *  - program  : program id
 *  - limit    : default 100, max 300
 */
export async function GET(req) {
  // 1) AUTH
  const authError = checkAiApiKey(req);
  if (authError) return authError;

  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q")?.trim();
    const program = searchParams.get("program");

    const limit = Math.min(
      300,
      parseInt(searchParams.get("limit") || "100", 10)
    );

    const filter = {};

    // filter by program
    if (program) {
      filter.programs = program;
    }

    // search thai / english
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { name_en: { $regex: q, $options: "i" } },
        { bio: { $regex: q, $options: "i" } },
      ];
    }

    const items = await Instructor.find(filter)
      .select("name name_en bio programs updatedAt")
      .populate({
        path: "programs",
        select: "program_id program_name programiconurl programcolor",
      })
      .sort({ name: 1 })
      .limit(limit)
      .lean();

    return NextResponse.json(
      {
        ok: true,
        total: items.length,
        items: items.map((i) => ({
          _id: i._id,
          name_th: i.name,                 // ✅ ภาษาไทย
          name_en: i.name_en || "",         // ✅ ภาษาอังกฤษ
          bio: i.bio || "",
          programs: i.programs || [],
          updatedAt: i.updatedAt,
        })),
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
