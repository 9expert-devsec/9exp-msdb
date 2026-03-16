import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Skill from "@/models/Skill";
import Program from "@/models/Program";
import PublicCourse from "@/models/PublicCourse";
import OnlineCourse from "@/models/OnlineCourse";
import { checkAiApiKey } from "@/lib/ai-auth";
import { corsHeaders, handleOptions } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = handleOptions;

/* ================= helpers ================= */

function applyCors(req, res) {
  const h = corsHeaders(req.headers.get("origin"));
  for (const [k, v] of Object.entries(h)) {
    res.headers.set(k, v);
  }
  return res;
}

function falseyParam(v) {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === "0" || s === "false" || s === "no" || s === "n";
}

async function buildSkillToProgramIdsMap(programSelect) {
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

  const map = new Map();

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
  if (authError) return applyCors(req, authError);

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);

    // default = true
    const withPrograms = searchParams.has("withPrograms")
      ? !falseyParam(searchParams.get("withPrograms"))
      : true;

    const items = await Skill.find()
      .select(
        "skill_id skill_name skilliconurl skillcolor skill_teaser skill_roadmap_url createdAt updatedAt",
      )
      .sort({ skill_name: 1 })
      .lean();

    for (const s of items) {
      s.programs = [];
      s.programCount = 0;
    }

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
    return applyCors(req, res);
  } catch (err) {
    const res = NextResponse.json(
      { ok: false, error: err?.message || "Server Error" },
      { status: 500 },
    );
    return applyCors(req, res);
  }
}

export async function POST(req) {
  const res = NextResponse.json(
    { ok: false, error: "POST not allowed on AI route" },
    { status: 405 },
  );
  return applyCors(req, res);
}
