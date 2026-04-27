import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import OnlineCourse from "@/models/OnlineCourse";
import Program from "@/models/Program";
import Skill from "@/models/Skill";

import { checkAiApiKey } from "@/lib/ai-auth";
import { corsHeaders, handleOptions } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = handleOptions;

function applyCors(req, res) {
  const h = corsHeaders(req.headers.get("origin"));
  for (const [k, v] of Object.entries(h)) {
    res.headers.set(k, v);
  }
  return res;
}

function isObjectIdLike(str = "") {
  return /^[0-9a-fA-F]{24}$/.test(str);
}

function toPositiveInt(value, fallback) {
  const n = parseInt(value || "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function GET(req) {
  const authError = checkAiApiKey(req);
  if (authError) return applyCors(req, authError);

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();

    // รองรับทั้ง param เดิม และ param ใหม่
    const programParam = (searchParams.get("program") || "").trim();
    const programIdParam = (searchParams.get("program_id") || "").trim();
    const skillParam = (searchParams.get("skill") || "").trim();
    const skillIdParam = (searchParams.get("skill_id") || "").trim();

    const limit = Math.min(300, toPositiveInt(searchParams.get("limit"), 50));
    const page = Math.max(1, toPositiveInt(searchParams.get("page"), 1));

    const where = {};

    // ---------- q search ----------
    // คง behavior เดิมแบบ regex search
    if (q) {
      where.$or = [
        { o_course_name: { $regex: q, $options: "i" } },
        { o_course_teaser: { $regex: q, $options: "i" } },
        { o_course_id: { $regex: q, $options: "i" } },
      ];
    }

    // ---------- program filter ----------
    // รองรับ:
    // - ?program=<ObjectId>
    // - ?program=<program_id>
    // - ?program_id=<program_id>
    const rawProgram = programIdParam || programParam;
    if (rawProgram) {
      if (isObjectIdLike(rawProgram)) {
        where.program = rawProgram;
      } else {
        const foundProgram = await Program.findOne({ program_id: rawProgram })
          .select("_id")
          .lean();

        if (!foundProgram) {
          const res = NextResponse.json(
            { ok: true, total: 0, page, limit, items: [] },
            { status: 200 },
          );
          return applyCors(req, res);
        }

        where.program = foundProgram._id;
      }
    }

    // ---------- skill filter ----------
    // รองรับ:
    // - ?skill=<ObjectId>
    // - ?skill=<skill_id>
    // - ?skill_id=<skill_id>
    const rawSkill = skillIdParam || skillParam;
    if (rawSkill) {
      if (isObjectIdLike(rawSkill)) {
        where.skills = rawSkill;
      } else {
        const foundSkill = await Skill.findOne({ skill_id: rawSkill })
          .select("_id")
          .lean();

        if (!foundSkill) {
          const res = NextResponse.json(
            { ok: true, total: 0, page, limit, items: [] },
            { status: 200 },
          );
          return applyCors(req, res);
        }

        where.skills = foundSkill._id;
      }
    }

    const total = await OnlineCourse.countDocuments(where);

    const items = await OnlineCourse.find(where)
      // ไม่ใส่ .select() = ดึงครบทุก field ของ OnlineCourse
      .populate(
        "program",
        "program_id program_name programiconurl programcolor sort_order",
      )
      .populate("skills", "skill_id skill_name skilliconurl skillcolor")
      .populate({
        path: "related_courses",
        select:
          "o_course_id o_course_name o_course_teaser o_course_cover_url o_course_price o_number_lessons o_course_traininghours",
      })
      .sort({ sort_order: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const res = NextResponse.json(
      { ok: true, total, page, limit, items },
      { status: 200 },
    );

    return applyCors(req, res);
  } catch (err) {
    console.error("GET /api/ai/online-courses error:", err);

    const res = NextResponse.json(
      { ok: false, error: err?.message || "Internal Server Error" },
      { status: 500 },
    );
    return applyCors(req, res);
  }
}
