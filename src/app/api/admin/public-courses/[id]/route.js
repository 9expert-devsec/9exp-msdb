// /src/app/api/admin/public-courses/[id]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import PublicCourse from "@/models/PublicCourse";
import "@/models/Program";
import "@/models/Skill";

import { requireRole } from "@/lib/requireRole";
import { withRateLimit } from "@/lib/ratelimit";
import { CourseSchema, cleanArray, cleanTopics, toInt } from "../route";

/* -------- GET /api/admin/public-courses/:id -------- */
export const GET = withRateLimit({ points: 60, duration: 60 })(
  async (req, { params }) => {
    try {
      await requireRole(req, ["admin", "editor"]);
      await dbConnect();

      const id = params.id;
      const item = await PublicCourse.findById(id)
        .populate("program")
        .populate("skills")
        .populate("previous_course")
        .lean();

      if (!item) {
        return NextResponse.json(
          { ok: false, error: "Not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ ok: true, item }, { status: 200 });
    } catch (e) {
      if (e instanceof Response) return e;
      console.error("❌ GET one error:", e);
      const msg = e?.message || "Fetch failed";
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }
  }
);

/* -------- PATCH /api/admin/public-courses/:id -------- */
export const PATCH = withRateLimit({ points: 20, duration: 60 })(
  async (req, { params }) => {
    try {
      await requireRole(req, ["admin", "editor"]);
      await dbConnect();

      const id = params.id;
      const raw = await req.text();
      const json = raw ? JSON.parse(raw) : {};

      // ทำความสะอาดเหมือน POST
      json.course_objectives = cleanArray(json.course_objectives);
      json.course_target_audience = cleanArray(json.course_target_audience);
      json.course_prerequisites = cleanArray(json.course_prerequisites);
      json.course_system_requirements = cleanArray(
        json.course_system_requirements
      );
      json.training_topics = cleanTopics(json.training_topics);
      json.course_doc_paths = cleanArray(json.course_doc_paths);
      json.course_lab_paths = cleanArray(json.course_lab_paths);
      json.course_case_study_paths = cleanArray(json.course_case_study_paths);
      json.website_urls = cleanArray(json.website_urls);
      json.exam_links = cleanArray(json.exam_links);

      json.course_trainingdays = toInt(json.course_trainingdays, 0);
      json.course_traininghours = toInt(json.course_traininghours, 0);
      json.course_price = toInt(json.course_price, 0);
      json.sort_order = toInt(json.sort_order, 0);
      json.course_netprice =
        json.course_netprice === "" || json.course_netprice == null
          ? null
          : toInt(json.course_netprice, null);

      // partial validate
      const PartialSchema = CourseSchema.partial();
      const updates = PartialSchema.parse(json);

      const updated = await PublicCourse.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: false,
      })
        .populate("program")
        .populate("skills")
        .populate("previous_course")
        .lean();

      if (!updated) {
        return NextResponse.json(
          { ok: false, error: "Not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ ok: true, item: updated }, { status: 200 });
    } catch (e) {
      if (e instanceof Response) return e;
      console.error("❌ PATCH by id error:", e);
      const msg = e?.errors?.[0]?.message || e?.message || "Update failed";
      const code = /Unauthorized|Forbidden/i.test(msg) ? 401 : 400;
      return NextResponse.json({ ok: false, error: msg }, { status: code });
    }
  }
);

/* -------- DELETE /api/admin/public-courses/:id -------- */
export const DELETE = withRateLimit({ points: 10, duration: 60 })(
  async (req, { params }) => {
    try {
      await requireRole(req, ["admin"]);
      await dbConnect();

      const id = params.id;
      const removed = await PublicCourse.findByIdAndDelete(id).lean();
      if (!removed) {
        return NextResponse.json(
          { ok: false, error: "Not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ ok: true, id }, { status: 200 });
    } catch (e) {
      if (e instanceof Response) return e;
      console.error("❌ DELETE by id error:", e);
      const msg = e?.errors?.[0]?.message || e?.message || "Delete failed";
      const code = /Unauthorized|Forbidden/i.test(msg) ? 401 : 400;
      return NextResponse.json({ ok: false, error: msg }, { status: code });
    }
  }
);
