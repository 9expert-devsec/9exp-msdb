// src/app/api/ai/instructors/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Instructor from "@/models/Instructor";
import "@/models/Program";

import { checkAiApiKey } from "@/lib/ai-auth";
import { corsHeaders, handleOptions } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = handleOptions;

function applyCors(req, res) {
  const h = corsHeaders(req.headers.get("origin"));
  for (const [k, v] of Object.entries(h)) {
    res.headers.set(k, v);
  }
  return res;
}

/**
 * GET /api/ai/instructors
 * Query:
 *  - q        : search (thai / english / bio)
 *  - program  : program id
 *  - limit    : default 100, max 300
 */
export async function GET(req) {
  const authError = checkAiApiKey(req);
  if (authError) return applyCors(req, authError);

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q")?.trim();
    const program = searchParams.get("program");

    const limit = Math.min(
      300,
      parseInt(searchParams.get("limit") || "100", 10)
    );

    const filter = {};

    if (program) {
      filter.programs = program;
    }

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

    const res = NextResponse.json(
      {
        ok: true,
        total: items.length,
        items: items.map((i) => ({
          _id: i._id,
          name_th: i.name,
          name_en: i.name_en || "",
          bio: i.bio || "",
          programs: i.programs || [],
          updatedAt: i.updatedAt,
        })),
      },
      { status: 200 }
    );

    return applyCors(req, res);
  } catch (err) {
    console.error("GET /api/ai/instructors error:", err);

    const res = NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status: 500 }
    );
    return applyCors(req, res);
  }
}