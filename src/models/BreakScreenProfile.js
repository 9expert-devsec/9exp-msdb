// src/models/BreakScreenProfile.js
// Persisted 9Expert Break Screen profile. DB is the source of truth; the static
// break screen consumes an EXPORTED profiles.json (keyed by slug) — the
// projector never calls MSDB at runtime.
//
// Courses are stored as SNAPSHOTS (already-mapped break-screen card shape) so
// the exported JSON is deploy-ready and immune to later masterdata edits —
// matching the CareerPath snapshot philosophy. `sourceCourseId` is kept per
// course purely for future re-sync.
import mongoose from "mongoose";
import { toProfileValue as toProfileValuePure } from "@/lib/breakScreen";
const { Schema } = mongoose;

/* Snapshot of one course card (the shape the break screen renders). */
const CourseCardSchema = new Schema(
  {
    badge: { type: String, default: "" },
    title: { type: String, default: "" },
    meta: { type: String, default: "" },
    desc: { type: String, default: "" },
    img: { type: String, default: "" },
    url: { type: String, default: "" },
    // provenance only — NOT emitted to the break screen (see profileValueFromDoc)
    sourceCourseId: { type: String, default: "" },
  },
  { _id: false }
);

const VideosSchema = new Schema(
  {
    mode: { type: String, enum: ["same", "daily"], default: "same" },
    same: { type: [String], default: [] },
    byDay: { type: Map, of: [String], default: {} }, // keys "0".."6"
  },
  { _id: false }
);

const BreakScreenProfileSchema = new Schema(
  {
    // ?course=<slug> key — kebab, url-safe, unique
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, "slug must be kebab-case [a-z0-9-]"],
    },

    label: { type: String, default: "" },

    // provenance: which instructor this was generated for (nullable / manual)
    instructor: { type: Schema.Types.ObjectId, ref: "Instructor", default: null },

    courses: { type: [CourseCardSchema], default: [] },
    videos: { type: VideosSchema, default: () => ({}) },

    // 0 = no truncation; N = cap each course.desc to N graphemes (shrinks the
    // on-screen card AND the #cfg= hash).
    descMaxLen: { type: Number, default: 0 },

    status: { type: String, enum: ["active", "archived"], default: "active", index: true },
  },
  { timestamps: true }
);

/* ---------- toProfileValue (pure) ----------
 * Returns the partial-config the break screen expects:
 *   { label, courses:[{badge,title,meta,desc,img,url}], videos:{mode,same,byDay} }
 * Strips Mongo internals + `sourceCourseId`, converts the byDay Map to a plain
 * object, and applies descMaxLen truncation when set (via the single-source
 * helper in @/lib/breakScreen). Works on a hydrated doc OR a lean object.
 */
export function profileValueFromDoc(doc) {
  const d = doc || {};
  const v = d.videos || {};

  // byDay may be a Mongoose Map (hydrated) or a plain object (lean)
  let byDay = {};
  if (v.byDay instanceof Map) {
    for (const [k, val] of v.byDay.entries())
      byDay[k] = Array.isArray(val) ? val : [];
  } else if (v.byDay && typeof v.byDay === "object") {
    byDay = v.byDay;
  }

  return toProfileValuePure({
    label: d.label,
    courses: d.courses,
    videos: { mode: v.mode, same: v.same, byDay },
    descMaxLen: d.descMaxLen,
  });
}

BreakScreenProfileSchema.methods.toProfileValue = function () {
  return profileValueFromDoc(this);
};

// Static form for lean objects (used by the export route).
BreakScreenProfileSchema.statics.toProfileValue = function (doc) {
  return profileValueFromDoc(doc);
};

export default mongoose.models.BreakScreenProfile ||
  mongoose.model("BreakScreenProfile", BreakScreenProfileSchema);
