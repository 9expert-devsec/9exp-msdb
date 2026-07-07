// src/app/api/admin/break-screen/export/route.js
// Whole-map export → the profiles.json the STATIC break screen deploys with.
// { [slug]: profile.toProfileValue() } for every status:"active" profile.
// DB is the source of truth; this file is the build artifact (committed/deployed
// in 05-C). The projector never calls MSDB at runtime.
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import BreakScreenProfile, {
  profileValueFromDoc,
} from "@/models/BreakScreenProfile";
import { requireRole } from "@/lib/requireRole";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    await requireRole(req, ["admin", "editor"]);
    await dbConnect();

    const docs = await BreakScreenProfile.find({ status: "active" })
      .sort({ slug: 1 })
      .lean();

    const map = {};
    for (const d of docs) {
      map[d.slug] = profileValueFromDoc(d); // works on lean objects
    }

    const { searchParams } = new URL(req.url);
    const download = searchParams.get("download") === "1";

    const bodyJson = JSON.stringify(map, null, 2);
    const headers = { "content-type": "application/json; charset=utf-8" };
    if (download) {
      headers["content-disposition"] =
        'attachment; filename="profiles.json"';
    }

    return new NextResponse(bodyJson, { status: 200, headers });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { ok: false, error: e.message || "Failed to export" },
      { status: 500 }
    );
  }
}
