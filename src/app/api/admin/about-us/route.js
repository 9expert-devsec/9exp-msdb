import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import AboutPage from "@/models/AboutPage";
import { requireRole } from "@/lib/requireRole";
import { withRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const KEY = "about-us";

function stripHtml(html = "") {
  // เอา tag ออกให้เหลือ text เฉย ๆ
  return String(html)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* --------- GET (admin) : ดึงข้อมูลหน้า About Us --------- */
export const GET = withRateLimit({ points: 30, duration: 60 })(async (req) => {
  try {
    await requireRole(req, ["admin", "editor"]); // ป้องกันหลังบ้าน
    await dbConnect();

    const item = await AboutPage.findOne({ key: KEY }).lean();

    return NextResponse.json({ ok: true, item }, { status: 200 });
  } catch (e) {
    const msg = e?.message || "Fetch failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
});

/* --------- POST (admin) : สร้าง/แก้ไข About Us --------- */
export const POST = withRateLimit({ points: 20, duration: 60 })(async (req) => {
  try {
    await requireRole(req, ["admin", "editor"]);
    await dbConnect();

    const body = await req.json();
    const title = String(body.title || "About 9Expert Training");
    const content_html = String(body.content_html || "");
    const updated_by = body.updated_by ? String(body.updated_by) : undefined;

    const content_text =
      body.content_text && String(body.content_text).trim()
        ? String(body.content_text).trim()
        : stripHtml(content_html);

    const updates = {
      key: KEY,
      title,
      content_html,
      content_text,
      ...(updated_by ? { updated_by } : {}),
    };

    const item = await AboutPage.findOneAndUpdate(
      { key: KEY },
      updates,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json({ ok: true, item }, { status: 200 });
  } catch (e) {
    const msg = e?.message || "Save failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
});
