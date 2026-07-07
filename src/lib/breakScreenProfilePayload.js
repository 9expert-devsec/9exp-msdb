// src/lib/breakScreenProfilePayload.js
// Server-side normalizer for BreakScreenProfile create/update bodies. Shared by
// POST /profiles and PUT /profiles/[id] so the snapshot mapping stays in one
// place. Reuses toBreakScreenCourse (single-source mapper from 04-A).
import PublicCourse from "@/models/PublicCourse";
import {
  toBreakScreenCourse,
  BREAK_SCREEN_COURSE_SELECT,
} from "@/lib/breakScreen";

const clean = (x) => String(x ?? "").trim();

function normalizeVideos(v) {
  const obj = v && typeof v === "object" ? v : {};
  const mode = obj.mode === "daily" ? "daily" : "same";
  const same = Array.isArray(obj.same)
    ? obj.same.map(clean).filter(Boolean)
    : [];
  const byDay = {};
  const src = obj.byDay && typeof obj.byDay === "object" ? obj.byDay : {};
  for (const k of Object.keys(src)) {
    const arr = Array.isArray(src[k]) ? src[k].map(clean).filter(Boolean) : [];
    if (arr.length) byDay[String(k)] = arr;
  }
  return { mode, same, byDay };
}

// Keep only the break-screen card keys (+ provenance) from a pre-mapped course.
function sanitizeCourseCard(c) {
  const o = c && typeof c === "object" ? c : {};
  return {
    badge: clean(o.badge),
    title: clean(o.title),
    meta: clean(o.meta),
    desc: String(o.desc ?? ""),
    img: clean(o.img),
    url: clean(o.url),
    sourceCourseId: clean(o.sourceCourseId),
  };
}

/**
 * Build the persisted course snapshots.
 * - If `courseIds` given → load PublicCourses (authoritative) and map via
 *   toBreakScreenCourse, preserving the provided order + tagging sourceCourseId.
 * - Else if pre-mapped `courses` given (from the generator) → accept as-is but
 *   re-validate the shape (strip unknown keys).
 */
async function buildCourses({ courseIds, courses }) {
  const ids = Array.isArray(courseIds)
    ? courseIds.map(clean).filter(Boolean)
    : [];

  if (ids.length) {
    const docs = await PublicCourse.find({ course_id: { $in: ids } })
      .select(BREAK_SCREEN_COURSE_SELECT)
      .lean();
    const byId = new Map(docs.map((d) => [d.course_id, d]));
    return ids
      .map((id) => {
        const doc = byId.get(id);
        if (!doc) return null;
        return { ...toBreakScreenCourse(doc), sourceCourseId: doc.course_id };
      })
      .filter(Boolean);
  }

  if (Array.isArray(courses)) {
    return courses.map(sanitizeCourseCard).filter((c) => c.title || c.img);
  }

  return [];
}

/**
 * Normalize a full create/update body into a persist-ready payload.
 * `partial=true` (for PUT) only returns keys present in the body.
 */
export async function normalizeProfilePayload(body, { partial = false } = {}) {
  const b = body && typeof body === "object" ? body : {};
  const payload = {};

  if (!partial || "slug" in b) payload.slug = clean(b.slug).toLowerCase();
  if (!partial || "label" in b) payload.label = clean(b.label);
  if (!partial || "instructor" in b)
    payload.instructor = b.instructor ? b.instructor : null;
  if (!partial || "descMaxLen" in b)
    payload.descMaxLen = Math.max(0, parseInt(b.descMaxLen, 10) || 0);
  if (!partial || "status" in b)
    payload.status = clean(b.status) === "archived" ? "archived" : "active";
  if (!partial || "videos" in b) payload.videos = normalizeVideos(b.videos);

  // courses: rebuild when EITHER courseIds or courses supplied
  if (!partial || "courseIds" in b || "courses" in b) {
    payload.courses = await buildCourses({
      courseIds: b.courseIds,
      courses: b.courses,
    });
  }

  return payload;
}

export default normalizeProfilePayload;
