import mongoose, { Schema } from "mongoose";

/** Sub schema: Training Topics (หัวข้อ + ย่อย) */
const TrainingTopicSchema = new Schema(
  {
    title: { type: String, default: "" },
    bullets: { type: [String], default: [] },
  },
  { _id: false }
);

/** Sub schema: Course Outline (English) — external link OR file stored in MSDB (GridFS) */
const CourseOutlineSchema = new Schema(
  {
    kind: { type: String, enum: ["", "link", "file"], default: "" }, // "" = none
    url: { type: String, default: "" }, // used when kind === "link"
    file_id: { type: Schema.Types.ObjectId, default: null }, // GridFS file id when kind === "file"
    filename: { type: String, default: "" },
    content_type: { type: String, default: "" },
    size: { type: Number, default: 0 },
    uploaded_at: { type: Date, default: null },
  },
  { _id: false }
);

const PublicCourseSchema = new Schema(
  {
    // basics
    course_id: { type: String, required: true, unique: true, index: true },
    course_name: { type: String, required: true, index: true },
    course_teaser: { type: String, default: "" },

    // time & price & level
    course_trainingdays: { type: Number, default: 0 },
    course_traininghours: { type: Number, default: 0 },
    course_price: { type: Number, default: 0 },
    course_netprice: { type: Number, default: null },
    course_cover_url: { type: String, default: "" },
    // roadmap images (svg/png/jpg) — desktop & mobile variants
    course_roadmap_desktop_url: { type: String, default: "" },
    course_roadmap_mobile_url: { type: String, default: "" },
    course_levels: { type: String, default: "1" }, // "1".."4"

    // flags
    course_type_public: { type: Boolean, default: true },
    course_type_inhouse: { type: Boolean, default: false },
    course_workshop_status: { type: Boolean, default: false },
    course_certificate_status: { type: Boolean, default: false },
    course_promote_status: { type: Boolean, default: false },

    // sorting (ยิ่งน้อยยิ่งขึ้นก่อน)
    sort_order: { type: Number, default: 0, index: true },

    // relations
    program: { type: Schema.Types.ObjectId, ref: "Program", index: true },
    skills: [{ type: Schema.Types.ObjectId, ref: "Skill" }],

    // bullets (plain)
    course_objectives: { type: [String], default: [] },
    course_target_audience: { type: [String], default: [] },
    course_prerequisites: { type: [String], default: [] },
    course_system_requirements: { type: [String], default: [] },

    // topics with sub bullets
    training_topics: { type: [TrainingTopicSchema], default: [] },

    // resources / urls
    course_lab_paths: { type: [String], default: [] },
    course_case_study_paths: { type: [String], default: [] },
    website_urls: { type: [String], default: [] },
    exam_links: { type: [String], default: [] },

    // Course outline: external link OR file stored in MSDB (GridFS) — EN & TH
    course_outline_en: { type: CourseOutlineSchema, default: () => ({}) },
    course_outline_th: { type: CourseOutlineSchema, default: () => ({}) },

    // optional link to previous course
    previous_course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PublicCourse",
      default: null,
    },

    // Related courses (same type only — Public → Public)
    related_courses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PublicCourse",
      },
    ],
  },
  { timestamps: true }
);

/** text index ช่วยค้นหา */
PublicCourseSchema.index({
  course_name: "text",
  course_teaser: "text",
  course_id: "text",
});

export default mongoose.models.PublicCourse ||
  mongoose.model("PublicCourse", PublicCourseSchema);
