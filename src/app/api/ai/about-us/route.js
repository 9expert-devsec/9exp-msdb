// src/app/api/ai/about-us/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import AboutUs from "@/models/AboutUs";
import { checkAiApiKey } from "@/lib/ai-auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const authError = checkAiApiKey(req);
  if (authError) return authError;

  try {
    await dbConnect();

    const item = await AboutUs.findOne({})
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json(
      { ok: true, item: item || null },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/ai/about-us error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
