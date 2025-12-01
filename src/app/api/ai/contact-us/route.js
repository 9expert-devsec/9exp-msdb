// src/app/api/ai/contact-us/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import ContactInfo from "@/models/ContactInfo";
import { checkAiApiKey } from "@/lib/ai-auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const authError = checkAiApiKey(req);
  if (authError) return authError;

  try {
    await dbConnect();

    const items = await ContactInfo.find()
      .sort({ sort_order: 1, createdAt: 1 })
      .lean();

    return NextResponse.json(
      { ok: true, items: items || [] },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/ai/contact-us error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
