import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import AboutPage from "@/models/AboutPage";

export const dynamic = "force-dynamic";

const KEY = "about-us";

export const GET = async () => {
  try {
    await dbConnect();
    const item = await AboutPage.findOne({ key: KEY }).lean();

    if (!item) {
      return NextResponse.json(
        { ok: true, item: null },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        item: {
          title: item.title,
          content_html: item.content_html,
          content_text: item.content_text,
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
