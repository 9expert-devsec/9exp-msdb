// /src/app/api/all-courses/route.js
// Public (no-auth) endpoint that returns ALL public courses in one payload,
// slimmed to exactly what the /9expert-all-courses catalog page needs, plus
// pre-derived filter facets (programs / skills / levels) so the frontend can
// build slicers without extra round-trips.
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import PublicCourse from "@/models/PublicCourse";
// Import related models so Mongoose registers them before populate runs.
import "@/models/Program";
import "@/models/Skill";

import { withCors } from "@/lib/cors";
import { withRateLimit } from "@/lib/ratelimit";
import { shapePublicCourseForExternal } from "@/lib/shapeCourseForExternal";

export const dynamic = "force-dynamic";

/* ---------------- helpers ---------------- */

// Slim an enriched outline down to just what the table/card needs.
const slimOutline = (o) => ({
  kind: o?.kind || "",
  filename: o?.filename || "",
  download_url: o?.download_url || "",
});

/* ---------------- GET (Public) ---------------- */
// CORS + RL: 60 req/min/IP
export const GET = withCors(
  withRateLimit({ points: 60, duration: 60 })(async () => {
    try {
      await dbConnect();

      // Fetch the ENTIRE PublicCourse collection (public + in-house). The type
      // filtering is done client-side via the `types` facet below.
      const docs = await PublicCourse.find({})
        .select(
          "course_id course_name course_teaser course_trainingdays course_traininghours course_price course_netprice course_levels course_cover_url sort_order program skills course_outline_en course_outline_th course_type_public course_type_inhouse"
        )
        .populate("program", "program_id program_name programiconurl programcolor")
        .populate("skills", "skill_id skill_name skilliconurl skillcolor")
        .sort({ sort_order: 1, course_name: 1 })
        .lean();

      const shaped = docs.map(shapePublicCourseForExternal);

      // Facet accumulators keyed by slug so we can count occurrences.
      const programMap = new Map();
      const skillMap = new Map();
      const levelSet = new Set();
      // Independent type counts (public & inhouse may overlap — not additive).
      let publicCount = 0;
      let inhouseCount = 0;

      const items = shaped.map((c) => {
        const program = c.program
          ? {
              program_id: c.program.program_id || "",
              program_name: c.program.program_name || "",
              programiconurl: c.program.programiconurl || "",
              programcolor: c.program.programcolor || "",
            }
          : null;

        const skills = Array.isArray(c.skills)
          ? c.skills.map((s) => ({
              skill_id: s.skill_id || "",
              skill_name: s.skill_name || "",
              skilliconurl: s.skilliconurl || "",
              skillcolor: s.skillcolor || "",
            }))
          : [];

        // Accumulate program facet.
        if (program && program.program_id) {
          const prev = programMap.get(program.program_id);
          if (prev) prev.count += 1;
          else programMap.set(program.program_id, { ...program, count: 1 });
        }

        // Accumulate skill facets.
        for (const s of skills) {
          if (!s.skill_id) continue;
          const prev = skillMap.get(s.skill_id);
          if (prev) prev.count += 1;
          else skillMap.set(s.skill_id, { ...s, count: 1 });
        }

        // Accumulate level facet.
        const lvl = parseInt(c.course_levels, 10);
        if (Number.isFinite(lvl)) levelSet.add(lvl);

        // Accumulate independent type counts.
        const isPublic = c.course_type_public === true;
        const isInhouse = c.course_type_inhouse === true;
        if (isPublic) publicCount += 1;
        if (isInhouse) inhouseCount += 1;

        return {
          course_id: c.course_id || "",
          course_name: c.course_name || "",
          course_teaser: c.course_teaser || "",
          course_trainingdays: c.course_trainingdays || 0,
          course_traininghours: c.course_traininghours || 0,
          course_price: c.course_price || 0,
          course_netprice: c.course_netprice ?? null,
          course_levels: c.course_levels || "1",
          course_cover_url: c.course_cover_url || "",
          course_type_public: isPublic,
          course_type_inhouse: isInhouse,
          program,
          skills,
          course_outline_en: slimOutline(c.course_outline_en),
          course_outline_th: slimOutline(c.course_outline_th),
        };
      });

      const filters = {
        programs: Array.from(programMap.values()).sort((a, b) =>
          a.program_name.localeCompare(b.program_name, "th")
        ),
        skills: Array.from(skillMap.values()).sort((a, b) =>
          a.skill_name.localeCompare(b.skill_name, "th")
        ),
        levels: Array.from(levelSet).sort((a, b) => a - b),
        // Independent type counts; public + inhouse may overlap.
        types: {
          all: items.length,
          public: publicCount,
          inhouse: inhouseCount,
        },
      };

      return NextResponse.json(
        { ok: true, total: items.length, items, filters },
        { status: 200 }
      );
    } catch (e) {
      console.error("GET /api/all-courses error:", e);
      return NextResponse.json(
        { ok: false, error: e.message || "Internal error" },
        { status: 500 }
      );
    }
  })
);

/* ---------------- OPTIONS (Preflight) ---------------- */
export const OPTIONS = withCors(async () => new Response(null, { status: 204 }));
