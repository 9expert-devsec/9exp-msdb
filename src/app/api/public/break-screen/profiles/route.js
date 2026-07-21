// src/app/api/public/break-screen/profiles/route.js
// Public (token-gated) read of active break-screen profiles.
// Returns { [slug]: profileValueFromDoc(doc) } for status:"active" — identical
// shape to /api/admin/break-screen/export, but authenticated by x-api-key so a
// service (the break-screen ISR build) can read it without an admin session.
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import BreakScreenProfile, {
  profileValueFromDoc,
} from "@/models/BreakScreenProfile";
import { checkBreakScreenApiKey } from "@/lib/breakScreenAuth";
import { corsHeaders, handleOptions } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = handleOptions;

export async function GET(req) {
  const cors = corsHeaders(req.headers.get("origin"));

  const authError = checkBreakScreenApiKey(req);
  if (authError) {
    for (const [k, v] of Object.entries(cors)) authError.headers.set(k, v);
    return authError;
  }

  try {
    await dbConnect();

    const docs = await BreakScreenProfile.find({ status: "active" })
      .sort({ slug: 1 })
      .lean();

    const map = {};
    for (const d of docs) {
      map[d.slug] = profileValueFromDoc(d);
    }

    const bodyJson = JSON.stringify(map);
    const headers = {
      "content-type": "application/json; charset=utf-8",
      // Let the break-screen app's ISR own the revalidation cadence, but give
      // any intermediary/CDN a short shared cache with SWR so a burst of ISR
      // regenerations doesn't hammer Mongo. The break-screen side sets its own
      // revalidate; this is a backstop only.
      "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
      ...cors,
    };

    return new NextResponse(bodyJson, { status: 200, headers });
  } catch (e) {
    const headers = { "content-type": "application/json; charset=utf-8", ...cors };
    return new NextResponse(
      JSON.stringify({ ok: false, error: e?.message || "Failed to export" }),
      { status: 500, headers }
    );
  }
}
