// src/app/api/ai/about-us/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import AboutPage from "@/models/AboutPage";
import { checkAiApiKey } from "@/lib/ai-auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const authError = checkAiApiKey(req);
  if (authError) return authError;

  try {
    await dbConnect();

    const item = await AboutPage.findOne({})
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
