// src/app/api/ai/instructor-signature/route.js
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
 * GET /api/ai/instructor-signature
 * Query:
 *  - id       : Instructor ObjectId (exact match)
 *  - name     : search by name (case-insensitive, matches name + name_en)
 *  - program  : filter by program ObjectId
 *  - limit    : default 50, max 200
 */
export async function GET(req) {
  const authError = checkAiApiKey(req);
  if (authError) return applyCors(req, authError);

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id")?.trim();
    const name = searchParams.get("name")?.trim();
    const program = searchParams.get("program")?.trim();

    const limit = Math.min(
      200,
      parseInt(searchParams.get("limit") || "50", 10)
    );

    const filter = {};

    if (id && /^[0-9a-fA-F]{24}$/.test(id)) {
      filter._id = id;
    }

    if (name) {
      filter.$or = [
        { name: { $regex: name, $options: "i" } },
        { name_en: { $regex: name, $options: "i" } },
      ];
    }

    if (program) {
      filter.programs = program;
    }

    const items = await Instructor.find(filter)
      .select("name name_en photo_url signature_url programs")
      .populate({
        path: "programs",
        select: "program_id program_name",
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
          photo_url: i.photo_url || "",
          signature_url: i.signature_url || "",
          programs: (i.programs || []).map((p) => ({
            program_id: p.program_id,
            program_name: p.program_name,
          })),
        })),
      },
      { status: 200 }
    );

    return applyCors(req, res);
  } catch (err) {
    console.error("GET /api/ai/instructor-signature error:", err);

    const res = NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status: 500 }
    );
    return applyCors(req, res);
  }
}
