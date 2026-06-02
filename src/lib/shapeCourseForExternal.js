// src/lib/shapeCourseForExternal.js
// Single source of truth for how a Public course is exposed to EXTERNAL
// consumers (AI API responses, public GET endpoints, and webhook payloads
// consumed by Genesis).
//
// READ-SIDE ONLY: this enriches output. It must NEVER feed back into the Zod
// parse / findByIdAndUpdate write path — writes use the providedKeys rebuild.
import { absoluteUrl } from "@/lib/publicUrl";

/**
 * Enrich a single outline object with a ready-to-use `download_url`.
 * - kind "file" -> absolute URL to the public streaming route (keeps file_id).
 * - kind "link" -> the original pasted url.
 * - kind ""     -> download_url stays "".
 * Null-safe: a missing/invalid outline yields an empty enriched object.
 */
export function shapeOutline(outline) {
  const o = outline && typeof outline === "object" ? outline : {};
  const kind = o.kind || "";
  const url = o.url || "";
  const file_id = o.file_id != null ? String(o.file_id) : null;

  let download_url = "";
  if (kind === "file" && file_id) {
    download_url = absoluteUrl(`/api/public-courses/outline/${file_id}`);
  } else if (kind === "link" && url) {
    download_url = url;
  }

  return {
    kind,
    url,
    file_id, // KEEP the original GridFS id for consumers that want it
    filename: o.filename || "",
    content_type: o.content_type || "",
    size: o.size || 0,
    uploaded_at: o.uploaded_at ?? null,
    download_url, // NEW resolved field (works for link OR file)
  };
}

/**
 * Shape a lean PublicCourse doc for external consumption.
 * ADDS resolved media/outline fields WITHOUT removing existing ones.
 * Pure, null-safe, no DB calls. Accepts a lean object (or Mongoose doc-ish).
 */
export function shapePublicCourseForExternal(course) {
  if (!course || typeof course !== "object") return course;

  return {
    ...course,
    // roadmap images pass through as-is (already absolute Cloudinary URLs)
    course_roadmap_desktop_url: course.course_roadmap_desktop_url || "",
    course_roadmap_mobile_url: course.course_roadmap_mobile_url || "",
    // enriched outlines (Thai + English)
    course_outline_th: shapeOutline(course.course_outline_th),
    course_outline_en: shapeOutline(course.course_outline_en),
  };
}

export default shapePublicCourseForExternal;
