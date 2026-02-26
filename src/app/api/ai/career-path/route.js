// src/app/api/ai/career-path/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import CareerPath from "@/models/CareerPath";
import { checkAiApiKey } from "@/lib/ai-auth";

export const dynamic = "force-dynamic";

function clean(x) {
  return String(x ?? "").trim();
}

function isObjectIdLike(str = "") {
  return /^[0-9a-fA-F]{24}$/.test(str);
}

export async function GET(req) {
  // 1) API KEY CHECK
  const authError = checkAiApiKey(req);
  if (authError) return authError;

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);

    const q = clean(searchParams.get("q"));
    const statusParam = clean(searchParams.get("status")); // active|offline|all
    const slug = clean(searchParams.get("slug"));
    const id = clean(searchParams.get("id")); // ObjectId

    const limit = Math.min(
      300,
      parseInt(searchParams.get("limit") || "200", 10),
    );
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

    const filter = {};

    // ✅ default: ถ้าไม่ส่ง status มา -> เอาเฉพาะ active ให้ปลอดภัยสำหรับหน้าเว็บภายนอก
    // ถ้าต้องการให้ default = all ให้เปลี่ยน logic ได้
    if (!statusParam || statusParam === "active") filter.status = "active";
    else if (statusParam === "offline") filter.status = "offline";
    // status=all -> ไม่ใส่ filter.status

    // filter by id
    if (id && isObjectIdLike(id)) filter._id = id;

    // filter by slug
    if (slug) filter.slug = slug;

    // search
    if (q) {
      const re = new RegExp(q, "i");
      filter.$or = [
        { title: re },
        { slug: re },
        { cardDetail: re },
        { "detail.tagline": re },
        { "detail.intro": re },
      ];
    }

    const total = await CareerPath.countDocuments(filter);

    const items = await CareerPath.find(filter)
      .select(
        // ✅ ส่งให้ครบสำหรับ list + detail แบบ “ดึงไปใช้ได้เลย”
        "title slug status isPinned sortOrder coverImage cardDetail price links roadmapImage detail curriculum stats updatedAt createdAt",
      )
      .sort({ isPinned: -1, sortOrder: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json(
      { ok: true, total, page, limit, items },
      { status: 200 },
    );
  } catch (err) {
    console.error("GET /api/ai/career-path error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status: 500 },
    );
  }
}
