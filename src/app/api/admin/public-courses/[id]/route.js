// /src/app/api/admin/public-courses/[id]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import PublicCourse from "@/models/PublicCourse";
import "@/models/Program";
import "@/models/Skill";

import { requireRole } from "@/lib/requireRole";
import { withRateLimit } from "@/lib/ratelimit";
import { dispatchWebhook } from "@/lib/webhook";
import { shapePublicCourseForExternal } from "@/lib/shapeCourseForExternal";
import { PublicCourseSchema, cleanArray, toInt, normalizeOutline } from "../route";

/* -------- GET /api/admin/public-courses/:id -------- */
export const GET = withRateLimit({ points: 60, duration: 60 })(
  async (req, { params }) => {
    try {
      await requireRole(req, ["admin", "editor"]);
      await dbConnect();

      const { id } = await params;
      const item = await PublicCourse.findById(id)
        .populate("program")
        .populate("skills")
        .populate("previous_course")
        .populate("related_courses", "course_id course_name")
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

      const { id } = await params;
      const raw = await req.text();
      const json = raw ? JSON.parse(raw) : {};

      // Capture which keys the client ACTUALLY sent, BEFORE any mutation, so
      // this stays a true partial update (omitted fields are never fabricated).
      const providedKeys = new Set(Object.keys(json));
      const normalized = { ...json };

      // Only normalize array fields that were actually provided.
      const ARRAY_FIELDS = [
        "course_objectives",
        "course_target_audience",
        "course_prerequisites",
        "course_system_requirements",
        "course_lab_paths",
        "course_case_study_paths",
        "website_urls",
        "exam_links",
      ];
      for (const key of ARRAY_FIELDS) {
        if (providedKeys.has(key)) {
          normalized[key] = cleanArray(normalized[key]);
        }
      }

      // Normalize outline objects only when actually sent (valid file_id/null).
      for (const key of ["course_outline_en", "course_outline_th"]) {
        if (providedKeys.has(key)) {
          normalized[key] = normalizeOutline(normalized[key]);
        }
      }

      // Only coerce numeric fields that were actually provided.
      const INT_FIELDS = [
        "course_trainingdays",
        "course_traininghours",
        "course_price",
        "sort_order",
      ];
      for (const key of INT_FIELDS) {
        if (providedKeys.has(key)) {
          normalized[key] = toInt(normalized[key], 0);
        }
      }
      if (providedKeys.has("course_netprice")) {
        normalized.course_netprice =
          normalized.course_netprice === "" || normalized.course_netprice == null
            ? null
            : toInt(normalized.course_netprice, null);
      }

      // Only coerce previous_course "" -> null when the key was actually sent.
      if (
        providedKeys.has("previous_course") &&
        normalized.previous_course === ""
      ) {
        normalized.previous_course = null;
      }

      // partial validate (training_topics cleaning is handled inline by the
      // schema transform, so no separate cleanTopics step is needed).
      const parsed = PublicCourseSchema.partial().parse(normalized);

      // CRITICAL: Zod fills .default() values for fields the client never sent.
      // Rebuild `updates` from providedKeys so Zod-injected defaults are
      // dropped and findByIdAndUpdate only touches fields the client provided.
      const updates = {};
      for (const key of providedKeys) {
        if (key === "_id") continue;
        if (key in parsed) updates[key] = parsed[key];
      }

      const updated = await PublicCourse.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: false,
      })
        .populate("program")
        .populate("skills")
        .populate("previous_course")
        .populate("related_courses", "course_id course_name")
        .lean();

      if (!updated) {
        return NextResponse.json(
          { ok: false, error: "Not found" },
          { status: 404 }
        );
      }

      const shaped = shapePublicCourseForExternal(updated);
      dispatchWebhook("course.updated", shaped);

      return NextResponse.json({ ok: true, item: shaped }, { status: 200 });
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

      const { id } = await params;
      const removed = await PublicCourse.findByIdAndDelete(id).lean();
      if (!removed) {
        return NextResponse.json(
          { ok: false, error: "Not found" },
          { status: 404 }
        );
      }
      dispatchWebhook("course.deleted", { _id: id });
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
