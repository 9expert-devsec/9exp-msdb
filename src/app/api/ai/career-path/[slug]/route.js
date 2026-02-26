// src/app/api/ai/career-path/[slug]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import CareerPath from "@/models/CareerPath";
import { checkAiApiKey } from "@/lib/ai-auth";

export const dynamic = "force-dynamic";

function clean(x) {
  return String(x ?? "").trim();
}

export async function GET(req, ctx) {
  const authError = checkAiApiKey(req);
  if (authError) return authError;

  try {
    await dbConnect();
    const { slug } = await ctx.params;
    const s = clean(slug);

    if (!s) {
      return NextResponse.json({ ok: false, error: "slug is required" }, { status: 400 });
    }

    // default: external get -> active เท่านั้น
    const item = await CareerPath.findOne({ slug: s, status: "active" })
      .select(
        "title slug status isPinned sortOrder coverImage cardDetail price links roadmapImage detail curriculum stats updatedAt createdAt"
      )
      .lean();

    if (!item) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, item }, { status: 200 });
  } catch (err) {
    console.error("GET /api/ai/career-path/[slug] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}