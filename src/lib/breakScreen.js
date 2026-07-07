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

// ── Pure, dependency-free helpers (safe in both server + browser bundles) ────
// This module must NOT import mongoose so the client can reuse these.

/**
 * Truncate to N "characters" by code point. Array.from() keeps surrogate pairs
 * (emoji) intact. LIMITATION: it does not keep multi-codepoint grapheme
 * clusters together — a Thai base char + combining vowel/tone mark can still be
 * split if the cut lands between them. Acceptable per spec.
 */
export function truncateGraphemes(str, n) {
  if (!n || n <= 0) return String(str || "");
  const chars = Array.from(String(str || ""));
  return chars.length <= n ? chars.join("") : chars.slice(0, n).join("");
}

/**
 * Turn a stored/raw profile into the partial-config the break screen consumes:
 *   { label, courses:[{badge,title,meta,desc,img,url}], videos:{mode,same,byDay} }
 * Strips `sourceCourseId` + any extra keys, applies descMaxLen truncation.
 * `videos.byDay` must already be a plain object (caller converts a Map first).
 */
export function toProfileValue({ label, courses, videos, descMaxLen } = {}) {
  const max = Number(descMaxLen || 0) || 0;
  const v = videos && typeof videos === "object" ? videos : {};
  return {
    label: label || "",
    courses: (Array.isArray(courses) ? courses : []).map((c) => ({
      badge: c.badge || "",
      title: c.title || "",
      meta: c.meta || "",
      desc: max > 0 ? truncateGraphemes(c.desc, max) : c.desc || "",
      img: c.img || "",
      url: c.url || "",
    })),
    videos: {
      mode: v.mode === "daily" ? "daily" : "same",
      same: Array.isArray(v.same) ? v.same : [],
      byDay: v.byDay && typeof v.byDay === "object" ? v.byDay : {},
    },
  };
}

/**
 * EXACT replica of the static break screen's `encodeCfg`. Must byte-match so a
 * #cfg= hash decodes on the static side (which runs mergeCfg(DEFAULTS, parsed)).
 * Do NOT "improve" — btoa+unescape+encodeURIComponent is the agreed wire format.
 */
export function encodeCfg(c) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(c))));
}

/**
 * #cfg= hash from a profile value: strip `label` (mirror the static side's
 * rule) then encode the partial {courses, videos}.
 */
export function cfgHash(profileValue) {
  const { label: _omit, ...partial } = profileValue || {};
  return encodeCfg(partial);
}

export default toBreakScreenCourse;
