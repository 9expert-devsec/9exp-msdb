import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import ContactInfo from "@/models/ContactInfo";
import { requireRole } from "@/lib/requireRole";
import { withRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const KEY = "company-contact";

const cleanStr = (v) => String(v || "").trim();
const cleanArray = (arr) =>
  Array.isArray(arr)
    ? arr
        .map((x) => ({
          key: cleanStr(x.key),
          label: cleanStr(x.label),
          url: cleanStr(x.url),
          icon: cleanStr(x.icon || ""),
        }))
        .filter((x) => x.key && x.url)
    : [];

/* ------------ GET (admin) ------------ */
export const GET = withRateLimit({ points: 30, duration: 60 })(async (req) => {
  try {
    await requireRole(req, ["admin", "editor"]);
    await dbConnect();

    const item = await ContactInfo.findOne({ key: KEY }).lean();
    return NextResponse.json({ ok: true, item }, { status: 200 });
  } catch (e) {
    const msg = e?.message || "Fetch failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
});

/* ------------ POST (admin upsert) ------------ */
export const POST = withRateLimit({ points: 20, duration: 60 })(async (req) => {
  try {
    await requireRole(req, ["admin", "editor"]);
    await dbConnect();

    const body = await req.json();

    const social_links = cleanArray(body.social_links);

    const updates = {
      key: KEY,

      company_name: cleanStr(body.company_name),
      company_legal_name: cleanStr(body.company_legal_name),
      tagline: cleanStr(body.tagline),

      address_line1: cleanStr(body.address_line1),
      address_line2: cleanStr(body.address_line2),
      district: cleanStr(body.district),
      province: cleanStr(body.province),
      postcode: cleanStr(body.postcode),
      country: cleanStr(body.country || "Thailand"),

      phone_main: cleanStr(body.phone_main),
      phone_secondary: cleanStr(body.phone_secondary),
      fax: cleanStr(body.fax),

      email_main: cleanStr(body.email_main),
      email_support: cleanStr(body.email_support),
      email_sales: cleanStr(body.email_sales),

      line_id: cleanStr(body.line_id),
      line_oa_url: cleanStr(body.line_oa_url),
      line_qr_url: cleanStr(body.line_qr_url),

      website_url: cleanStr(body.website_url),

      facebook_url: cleanStr(body.facebook_url),
      instagram_url: cleanStr(body.instagram_url),
      youtube_url: cleanStr(body.youtube_url),
      tiktok_url: cleanStr(body.tiktok_url),
      linkedin_url: cleanStr(body.linkedin_url),

      google_map_url: cleanStr(body.google_map_url),
      google_map_embed: body.google_map_embed || "",

      extra_notes: body.extra_notes || "",

      social_links,
      updated_by: cleanStr(body.updated_by),
    };

    const item = await ContactInfo.findOneAndUpdate(
      { key: KEY },
      updates,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json({ ok: true, item }, { status: 200 });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e?.message || "Save failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
});
