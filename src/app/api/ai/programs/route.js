import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Program from "@/models/Program";
import Skill from "@/models/Skill";
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

function truthyParam(v) {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "y";
}

function falseyParam(v) {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === "0" || s === "false" || s === "no" || s === "n";
}

async function buildProgramToSkillIdsMap(skillSelect) {
  const pipes = [
    { $match: { program: { $ne: null }, skills: { $exists: true, $ne: [] } } },
    { $unwind: "$skills" },
    {
      $group: {
        _id: "$program",
        skillIds: { $addToSet: "$skills" },
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
      const pid = String(r._id);
      if (!map.has(pid)) map.set(pid, new Set());
      const set = map.get(pid);
      for (const sid of r.skillIds || []) {
        if (sid) set.add(String(sid));
      }
    }
  }

  addRows(pubAgg);
  addRows(onAgg);

  const allSkillIds = [];
  for (const set of map.values()) {
    for (const sid of set) allSkillIds.push(sid);
  }
  const uniqSkillIds = [...new Set(allSkillIds)];

  const skills = uniqSkillIds.length
    ? await Skill.find({ _id: { $in: uniqSkillIds } })
        .select(skillSelect)
        .lean()
    : [];

  const skillMap = new Map(skills.map((s) => [String(s._id), s]));
  return { programToSkillIds: map, skillMap };
}

/* ================= Handlers ================= */

export async function GET(req) {
  const authError = checkAiApiKey(req);
  if (authError) return applyCors(req, authError);

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);

    const withCounts = truthyParam(searchParams.get("withCounts"));

    // default = true
    const withSkills = searchParams.has("withSkills")
      ? !falseyParam(searchParams.get("withSkills"))
      : true;

    const items = await Program.find()
      .select(
        "program_id program_name programiconurl programcolor sort_order createdAt updatedAt",
      )
      .sort({ program_name: 1 })
      .lean();

    let countsMapPub = new Map();
    let countsMapOn = new Map();

    if (withCounts && items.length) {
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

      countsMapPub = new Map(pubCounts.map((i) => [String(i._id), i.n]));
      countsMapOn = new Map(onCounts.map((i) => [String(i._id), i.n]));
    }

    let programToSkillIds = null;
    let skillMap = null;

    if (withSkills && items.length) {
      const skillSelect =
        "_id skill_id skill_name skilliconurl skillcolor skill_teaser";
      const built = await buildProgramToSkillIdsMap(skillSelect);
      programToSkillIds = built.programToSkillIds;
      skillMap = built.skillMap;
    }

    const enriched = items.map((p) => {
      const out = {
        ...p,
        skills: [],
        skillCount: 0,
      };

      if (withCounts) {
        out.counts = {
          public: countsMapPub.get(String(p._id)) || 0,
          online: countsMapOn.get(String(p._id)) || 0,
        };
      }

      if (withSkills && programToSkillIds && skillMap) {
        const set = programToSkillIds.get(String(p._id)) || new Set();
        const skills = [...set].map((sid) => skillMap.get(sid)).filter(Boolean);
        out.skills = skills;
        out.skillCount = skills.length;
      }

      return out;
    });

    const res = NextResponse.json(
      {
        ok: true,
        summary: { total: enriched.length },
        items: enriched,
      },
      { status: 200 },
    );

    return applyCors(req, res);
  } catch (err) {
    const res = NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
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
