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
export const fetchCache = "force-no-store";

export const OPTIONS = handleOptions;

export async function GET(req) {
  const cors = corsHeaders(req.headers.get("origin"));

  const authError = checkBreakScreenApiKey(req);
  if (authError) {
    for (const [k, v] of Object.entries(cors)) authError.headers.set(k, v);
    // Never let an unauthorized response be cached by any intermediary — a cached
    // 401 would be as wrong as a cached 200 once the handler stops running.
    authError.headers.set("cache-control", "no-store");
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
      // This is an authenticated endpoint: the x-api-key MUST be validated on
      // every request, so the response must never be cached by a shared CDN.
      // A `public`/`s-maxage` policy let the edge serve the first authorized
      // body to later unauthenticated callers without ever running the handler
      // (auth bypass). Force every request back to the handler.
      "cache-control": "no-store",
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
