// src/app/api/faqs/route.js
import dbConnect from "@/lib/mongoose";
import FAQ from "@/models/Faq";

export const dynamic = "force-dynamic";

export async function GET(req) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();          // keyword search
  const category = (searchParams.get("category") || "").trim(); // filter ตามหมวด
  const grouped = searchParams.get("grouped") === "1";     // ถ้าอยากได้แบบ group ตามหมวด

  const where = { is_published: true };

  if (q) {
    const re = new RegExp(q, "i");
    where.$or = [
      { question: re },
      { answer_plain: re },
      { category: re },
    ];
  }

  if (category) {
    where.category = category;
  }

  const items = await FAQ.find(where)
    .sort({ category: 1, order: 1, createdAt: 1 })
    .lean();

  // ถ้าขอแบบ flat ปกติ
  if (!grouped) {
    return Response.json({ ok: true, items }, { status: 200 });
  }

  // ถ้าขอแบบ grouped=1 → group ตามหมวดหมู่
  const groupsMap = {};
  for (const faq of items) {
    const cat = faq.category || "General";
    if (!groupsMap[cat]) groupsMap[cat] = [];
    groupsMap[cat].push(faq);
  }

  const groups = Object.entries(groupsMap).map(([category, items]) => ({
    category,
    items,
  }));

  return Response.json({ ok: true, groups }, { status: 200 });
}
