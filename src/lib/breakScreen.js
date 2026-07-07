// src/lib/breakScreen.js
// SINGLE SOURCE OF TRUTH for turning an MSDB PublicCourse into the 9Expert
// Break Screen's config shape. Reuse these helpers everywhere a course is
// shaped for the break screen — do NOT re-map inline.
//
// The break screen (a separate static site) consumes a partial config with the
// keys: `label`, `courses[]` ({badge,title,meta,desc,img,url}) and
// `videos` ({mode:"same"|"daily", same:[], byDay:{}}). Everything else falls
// back to the static site's DEFAULTS via its own `mergeCfg`.

/**
 * Maps a lean PublicCourse -> the break screen's course card shape.
 * Pure, null-safe, no DB calls. Accepts a lean object (or Mongoose doc-ish).
 */
export function toBreakScreenCourse(c) {
  c = c && typeof c === "object" ? c : {};
  const price = c.course_netprice ?? c.course_price ?? null;
  const hrs = c.course_traininghours || 0;
  const days = c.course_trainingdays || 0;
  const metaBits = [];
  if (days) metaBits.push(`${days} วัน`);
  if (hrs) metaBits.push(`(${hrs} ชม.)`);
  if (price != null) metaBits.push(`${Number(price).toLocaleString("th-TH")}.-`);
  return {
    badge: c.course_promote_status ? "แนะนำ" : "",
    title: c.course_name || "",
    meta: metaBits.join(" · "),
    desc: c.course_teaser || "",
    img: c.course_cover_url || "",
    url: (Array.isArray(c.website_urls) && c.website_urls[0]) || "",
  };
}

/**
 * Build the partial-config profile object in the break screen's exact shape.
 * `label` is included here (the generator keeps it for the ?course= /
 * profiles.json flow); the static side strips `label` before `mergeCfg` when
 * decoding a #cfg= hash. `videos` is normalized to {mode,same,byDay}.
 */
export function buildProfile({ label, courses, videos } = {}) {
  const v = videos && typeof videos === "object" ? videos : {};
  const mode = v.mode === "daily" ? "daily" : "same";
  return {
    label: label || "",
    courses: Array.isArray(courses) ? courses : [],
    videos: {
      mode,
      same: Array.isArray(v.same) ? v.same : [],
      byDay: v.byDay && typeof v.byDay === "object" ? v.byDay : {},
    },
  };
}

// The lean `.select(...)` projection every break-screen course query needs so
// that toBreakScreenCourse() has all the fields it reads. Kept here so the
// /suggest, /search and /profile routes stay in sync.
export const BREAK_SCREEN_COURSE_SELECT =
  "course_id course_name course_teaser course_cover_url website_urls " +
  "course_netprice course_price course_traininghours course_trainingdays " +
  "course_promote_status program sort_order";

export default toBreakScreenCourse;
