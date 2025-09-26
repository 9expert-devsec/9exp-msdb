import mongoose from "mongoose";

const PublicCourseSchema = new mongoose.Schema(
  {
    course_id: { type: String, required: true, unique: true },
    course_name: { type: String, required: true },
    course_teaser: String,

    course_trainingdays: Number,
    course_traininghours: Number,

    course_price: { type: Number, default: 0 },
    course_netprice: { type: Number, default: null },

    course_cover_url: String,
    course_levels: { type: String, default: "1" },

    course_type_public: { type: Boolean, default: true },
    course_type_inhouse: { type: Boolean, default: false },
    course_workshop_status: { type: Boolean, default: false },
    course_certificate_status: { type: Boolean, default: false },
    course_promote_status: { type: Boolean, default: false },

    course_objectives: [String],
    course_target_audience: [String],
    course_prerequisites: [String],
    course_system_requirements: [String],
    course_training_topics: [String],

    // 🔹 ใหม่: เก็บลิงก์ประกอบ (เป็นลิสต์ URL)
    course_doc_paths: [String],
    course_lab_paths: [String],
    course_case_study_paths: [String],

    // 🔹 ใหม่: ลำดับจัดเรียง
    sort_order: { type: Number, default: 0 },

    program: { type: mongoose.Schema.Types.ObjectId, ref: "Program" },
    skills: [{ type: mongoose.Schema.Types.ObjectId, ref: "Skill" }],
  },
  { timestamps: true }
);

export default mongoose.models.PublicCourse ||
  mongoose.model("PublicCourse", PublicCourseSchema);
