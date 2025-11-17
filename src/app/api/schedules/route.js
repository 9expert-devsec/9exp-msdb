// /src/app/api/schedules/route.js
import dbConnect from "@/lib/mongoose";

// สำคัญ: ต้อง register โมเดลที่เกี่ยวข้องก่อนใช้งาน populate
import "@/models/Program";       // ✅ เพิ่มบรรทัดนี้
import "@/models/PublicCourse";  // ถ้ายังไม่ได้ import ไว้
import Schedule from "@/models/Schedule";

export const dynamic = "force-dynamic";

export async function GET(req) {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const months = Number(searchParams.get("months") || 12);
    const course = searchParams.get("course") || "";

    const filter = {};
    if (course) filter.course = course;

    // ดึงรอบในช่วง 12 เดือนถัดไป (หรือค่าที่ส่งมา)
    const now = new Date();
    const until = new Date(now);
    until.setMonth(until.getMonth() + months);

    filter.dates = { $elemMatch: { $gte: now, $lte: until } };

    const items = await Schedule.find(filter)
      .populate({
        path: "course",
        select:
          "course_id course_name course_price course_trainingdays program sort_order",
        populate: {
          path: "program",
          select: "program_id program_name programiconurl sort_order",
        },
      })
      .sort({ "course.sort_order": 1, "course.course_name": 1 })
      .lean();

    return Response.json({ items });
  } catch (err) {
    // ให้ตอบกลับเป็น JSON เสมอ (กัน parse error ฝั่ง client)
    return Response.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
