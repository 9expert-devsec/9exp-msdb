// src/app/api/ai/programs/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Program from "@/models/Program";
import PublicCourse from "@/models/PublicCourse";
import OnlineCourse from "@/models/OnlineCourse";

import { checkAiApiKey } from "@/lib/ai-auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  // 1) ตรวจ API Key ก่อน
  const authError = checkAiApiKey(req);
  if (authError) return authError;

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const withCounts = searchParams.get("withCounts");

    // ดึงข้อมูล Programs ทั้งหมด
    const items = await Program.find()
      .select(
        "program_id program_name programiconurl programcolor sort_order createdAt updatedAt"
      )
      .sort({ program_name: 1 })
      .lean();

    // ถ้าต้องการจำนวนคอร์ส (public/online)
    if (withCounts) {
      const ids = items.map((p) => p._id);

      const [pubCounts, onCounts] = await Promise.all([
        PublicCourse.aggregate([
          { $match: { program: { $in: ids } } },
          { $group: { _id: "$program", n: { $sum: 1 } } },
        ]),
        OnlineCourse.aggregate([
          { $match: { program: { $in: ids } } },
          { $group: { _id: "$program", n: { $sum: 1 } } },
        ]),
      ]);

      const pubMap = Object.fromEntries(
        pubCounts.map((i) => [String(i._id), i.n])
      );
      const onMap = Object.fromEntries(
        onCounts.map((i) => [String(i._id), i.n])
      );

      const enriched = items.map((p) => ({
        ...p,
        counts: {
          public: pubMap[String(p._id)] || 0,
          online: onMap[String(p._id)] || 0,
        },
      }));

      return NextResponse.json({ ok: true, items: enriched }, { status: 200 });
    }

    return NextResponse.json(
      {
        ok: true,
        summary: {
          total: items.length,
        },
        items,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

// ❌ AI ไม่ควรสร้าง/แก้ไขโปรแกรม — ปิด POST ทิ้ง
export async function POST() {
  return NextResponse.json(
    { ok: false, error: "POST not allowed on AI route" },
    { status: 405 }
  );
}
