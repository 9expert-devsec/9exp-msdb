// src/app/api/ai/skills/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Skill from "@/models/Skill";
import Program from "@/models/Program";
import PublicCourse from "@/models/PublicCourse";
import OnlineCourse from "@/models/OnlineCourse";

import { checkAiApiKey } from "@/lib/ai-auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  // 1) ตรวจ API KEY
  const authError = checkAiApiKey(req);
  if (authError) return authError;

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const withPrograms = searchParams.get("withPrograms");

    // ดึง skills ทั้งหมด
    const items = await Skill.find()
      .select(
        "skill_id skill_name skilliconurl skillcolor skill_teaser skill_roadmap_url createdAt updatedAt"
      )
      .sort({ skill_name: 1 })
      .lean();

    // เพิ่มข้อมูล program ใต้แต่ละ skill (optional)
    if (withPrograms) {
      for (const s of items) {
        const pubProgIds = await PublicCourse.distinct("program", {
          skills: s._id,
        });
        const onlProgIds = await OnlineCourse.distinct("program", {
          skills: s._id,
        });

        const uniqIds = [...new Set([...pubProgIds, ...onlProgIds])].filter(
          Boolean
        );

        const programs = uniqIds.length
          ? await Program.find({ _id: { $in: uniqIds } })
              .select("_id program_id program_name programcolor programiconurl")
              .lean()
          : [];

        s.programs = programs;
        s.programCount = programs.length;
      }
    }

    return NextResponse.json({ ok: true, items }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Server Error" },
      { status: 500 }
    );
  }
}

// ❌ AI ไม่ควรสร้าง/แก้ skill
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "POST not allowed on AI route",
    },
    { status: 405 }
  );
}
