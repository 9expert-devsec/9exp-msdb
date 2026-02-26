import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import PublicCourse from "@/models/PublicCourse";

export const dynamic = "force-dynamic";

function clean(x) {
  return String(x ?? "").trim();
}
function clampInt(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, Math.floor(v)));
}

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);

    const q = clean(searchParams.get("q"));
    const all = searchParams.get("all") === "1";
    const limit = clampInt(
      searchParams.get("limit") || (all ? 5000 : 10),
      1,
      5000,
    );

    if (!all && (!q || q.length < 2)) {
      return NextResponse.json({ ok: true, items: [] }, { status: 200 });
    }

    const where = all
      ? {}
      : {
          $or: [
            { course_id: new RegExp(q, "i") },
            { course_name: new RegExp(q, "i") },
            { course_teaser: new RegExp(q, "i") },
          ],
        };

    const items = await PublicCourse.find(where)
      .select(
        "course_id course_name course_teaser course_trainingdays course_traininghours course_price course_netprice course_cover_url website_urls sort_order",
      )
      .sort({ sort_order: 1, course_id: 1 })
      .limit(limit)
      .lean();

    const mapped = items.map((c) => ({
      id: String(c._id),
      code: c.course_id || "",
      name: c.course_name || "",
      teaser: c.course_teaser || "",
      days: Number(c.course_trainingdays || 0) || 0,
      hours: Number(c.course_traininghours || 0) || 0,
      price: Number(c.course_netprice ?? c.course_price ?? 0) || 0,
      imageUrl: c.course_cover_url || "",
      publicUrl: Array.isArray(c.website_urls) ? c.website_urls[0] || "" : "",
    }));

    return NextResponse.json({ ok: true, items: mapped }, { status: 200 });
  } catch (err) {
    console.error(
      "GET /api/admin/career-path/search-public-courses error:",
      err,
    );
    return NextResponse.json(
      { ok: false, error: err?.message },
      { status: 500 },
    );
  }
}
