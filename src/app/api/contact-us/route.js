import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import ContactInfo from "@/models/ContactInfo";

export const dynamic = "force-dynamic";

const KEY = "company-contact";

export const GET = async () => {
  try {
    await dbConnect();
    const item = await ContactInfo.findOne({ key: KEY }).lean();

    if (!item) {
      return NextResponse.json({ ok: true, item: null }, { status: 200 });
    }

    // เลือกส่งเฉพาะ field ที่อยากเปิดให้ public ใช้
    return NextResponse.json(
      {
        ok: true,
        item: {
          company_name: item.company_name,
          company_legal_name: item.company_legal_name,
          tagline: item.tagline,

          address_line1: item.address_line1,
          address_line2: item.address_line2,
          district: item.district,
          province: item.province,
          postcode: item.postcode,
          country: item.country,

          phone_main: item.phone_main,
          phone_secondary: item.phone_secondary,
          fax: item.fax,

          email_main: item.email_main,
          email_support: item.email_support,
          email_sales: item.email_sales,

          line_id: item.line_id,
          line_oa_url: item.line_oa_url,
          line_qr_url: item.line_qr_url,

          website_url: item.website_url,

          facebook_url: item.facebook_url,
          instagram_url: item.instagram_url,
          youtube_url: item.youtube_url,
          tiktok_url: item.tiktok_url,
          linkedin_url: item.linkedin_url,

          google_map_url: item.google_map_url,
          google_map_embed: item.google_map_embed,

          social_links: item.social_links || [],
          extra_notes: item.extra_notes || "",
          updatedAt: item.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (e) {
    const msg = e?.message || "Fetch failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
};
