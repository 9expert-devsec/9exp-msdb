// src/app/api/ai/faqs/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Faq from "@/models/Faq";
import { checkAiApiKey } from "@/lib/ai-auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const authError = checkAiApiKey(req);
  if (authError) return authError;

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const category = (searchParams.get("category") || "").trim();

    const where = { is_published: true };
    if (category) where.category = category;

    if (q) {
      const re = new RegExp(q, "i");
      where.$or = [{ question: re }, { answer_plain: re }, { category: re }];
    }

    const items = await Faq.find(where)
      .sort({ category: 1, order: 1, createdAt: 1 })
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
    console.error("GET /api/ai/faqs error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
