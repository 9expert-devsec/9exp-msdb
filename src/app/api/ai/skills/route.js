// src/app/api/ai/skills/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Skill from "@/models/Skill";
import Program from "@/models/Program";
import PublicCourse from "@/models/PublicCourse";
import OnlineCourse from "@/models/OnlineCourse";
import { checkAiApiKey } from "@/lib/ai-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= CORS helpers ================= */

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "https://9experttraining.com",
  "https://www.9experttraining.com",
]);

function buildCorsHeaders(req) {
  const origin = req.headers.get("origin");
  if (!origin) return {};
  if (!ALLOWED_ORIGINS.has(origin)) return { Vary: "Origin" };

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function withCors(req, res) {
  const h = buildCorsHeaders(req);
  for (const [k, v] of Object.entries(h)) res.headers.set(k, v);
  return res;
}

export async function OPTIONS(req) {
  const res = new NextResponse(null, { status: 204 });
  return withCors(req, res);
}

/* ================= helpers ================= */

function truthyParam(v) {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "y";
}

async function buildSkillToProgramIdsMap(programSelect) {
  // สร้าง map: skillId -> Set(programId) จากทั้ง PublicCourse และ OnlineCourse
  // NOTE: สมมติ schema course มี fields:
  //   - program: ObjectId (ref Program)
  //   - skills: [ObjectId] (ref Skill)
  const pipes = [
    { $match: { program: { $ne: null }, skills: { $exists: true, $ne: [] } } },
    { $unwind: "$skills" },
    {
      $group: {
        _id: "$skills",
        programIds: { $addToSet: "$program" },
      },
    },
  ];

  const [pubAgg, onAgg] = await Promise.all([
    PublicCourse.aggregate(pipes),
    OnlineCourse.aggregate(pipes),
  ]);

  const map = new Map(); // key: String(skillId) -> Set(String(programId))

  function addRows(rows) {
    for (const r of rows || []) {
      const sid = String(r._id);
      if (!map.has(sid)) map.set(sid, new Set());
      const set = map.get(sid);
      for (const pid of r.programIds || []) {
        if (pid) set.add(String(pid));
      }
    }
  }

  addRows(pubAgg);
  addRows(onAgg);

  // รวม program ids ทั้งหมดเพื่อ query ครั้งเดียว
  const allProgramIds = [];
  for (const set of map.values()) {
    for (const pid of set) allProgramIds.push(pid);
  }
  const uniqProgramIds = [...new Set(allProgramIds)];

  const programs = uniqProgramIds.length
    ? await Program.find({ _id: { $in: uniqProgramIds } })
        .select(programSelect)
        .lean()
    : [];

  const programMap = new Map(programs.map((p) => [String(p._id), p]));
  return { skillToProgramIds: map, programMap };
}

/* ================= Handlers ================= */

export async function GET(req) {
  const authError = checkAiApiKey(req);
  if (authError) return withCors(req, authError);

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const withPrograms = truthyParam(searchParams.get("withPrograms"));

    const items = await Skill.find()
      .select(
        "skill_id skill_name skilliconurl skillcolor skill_teaser skill_roadmap_url createdAt updatedAt",
      )
      .sort({ skill_name: 1 })
      .lean();

    if (withPrograms && items.length) {
      const programSelect =
        "_id program_id program_name programcolor programiconurl";

      const { skillToProgramIds, programMap } =
        await buildSkillToProgramIdsMap(programSelect);

      for (const s of items) {
        const set = skillToProgramIds.get(String(s._id)) || new Set();
        const programs = [...set]
          .map((pid) => programMap.get(pid))
          .filter(Boolean);

        s.programs = programs;
        s.programCount = programs.length;
      }
    }

    const res = NextResponse.json({ ok: true, items }, { status: 200 });
    return withCors(req, res);
  } catch (err) {
    const res = NextResponse.json(
      { ok: false, error: err?.message || "Server Error" },
      { status: 500 },
    );
    return withCors(req, res);
  }
}

export async function POST(req) {
  const res = NextResponse.json(
    { ok: false, error: "POST not allowed on AI route" },
    { status: 405 },
  );
  return withCors(req, res);
}
