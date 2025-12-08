// src/app/api/ai/public-course/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import PublicCourse from "@/models/PublicCourse";
import "@/models/Program";
import "@/models/Skill";

import { checkAiApiKey } from "@/lib/ai-auth";

export const dynamic = "force-dynamic";

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

    const q = searchParams.get("q")?.trim();
    const program = searchParams.get("program")?.trim() || "";      // _id ของ program
    const skill = searchParams.get("skill")?.trim() || "";          // _id ของ skill
    const courseParam = searchParams.get("course")?.trim() || "";   // ใช้ได้ทั้ง _id / course_id
    const courseIdParam =
      searchParams.get("course_id")?.trim() || "";                  // ถ้าอยากส่งแยกก็ได้

    const limit = Math.min(300, parseInt(searchParams.get("limit") || "200", 10));
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

    const filter = {};

    // filter ตาม program (_id ของ Program)
    if (program) filter.program = program;

    // filter ตาม skill (_id ของ Skill)
    if (skill) filter.skills = skill;

    // ---- จุดสำคัญ: รองรับทั้ง _id และ course_id ----
    if (courseParam) {
      if (isObjectIdLike(courseParam)) {
        // ถ้าหน้าตาเหมือน ObjectId ให้ลองหาเป็น _id ก่อน
        filter.$or = [
          { _id: courseParam },
          { course_id: courseParam },
        ];
      } else {
        // ถ้าไม่ใช่ ObjectId ให้ใช้เป็น course_id ตรง ๆ
        filter.course_id = courseParam;
      }
    }

    // ถ้ามีส่ง course_id แยกมาก็ใช้เลย
    if (courseIdParam) {
      filter.course_id = courseIdParam;
    }

    // full-text search
    if (q) {
      filter.$text = { $search: q };
    }

    const total = await PublicCourse.countDocuments(filter);

    const items = await PublicCourse.find(filter)
      .select(
        "course_cover_url course_id course_name course_teaser course_price course_duration course_trainingdays tags sort_order program skills previous_course"
      )
      .populate({
        path: "program",
        select: "program_id program_name programiconurl sort_order",
      })
      .populate({
        path: "skills",
        select: "skill_id skill_name skilliconurl skillcolor",
      })
      .populate({
        path: "previous_course",
        select: "course_id course_name",
      })
      .sort({ sort_order: 1, course_name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json(
      { ok: true, total, page, limit, items },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/ai/public-course error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
