import mongoose from "mongoose";

const OnlineCourseSchema = new mongoose.Schema(
  {
    o_course_id: { type: String, required: true, unique: true },
    o_course_name: { type: String, required: true },
    o_course_teaser: String,

    o_number_lessons: Number,
    o_course_traininghours: Number,

    o_course_price: { type: Number, default: 0 },
    o_course_netprice: { type: Number, default: null },

    o_course_cover_url: String,
    o_course_levels: { type: String, default: "1" },

    o_course_workshop_status: { type: Boolean, default: false },
    o_course_certificate_status: { type: Boolean, default: false },
    o_course_promote_status: { type: Boolean, default: false },

    o_course_objectives: [String],
    o_course_target_audience: [String],
    o_course_prerequisites: [String],
    o_course_system_requirements: [String],
    o_course_training_topics: [String],

    // 🔹 ใหม่: เก็บลิงก์ประกอบ
    o_course_doc_paths: [String],
    o_course_lab_paths: [String],
    o_course_case_study_paths: [String],

    // 🔹 ใหม่: ลำดับจัดเรียง
    sort_order: { type: Number, default: 0 },

    program: { type: mongoose.Schema.Types.ObjectId, ref: "Program" },
    skills: [{ type: mongoose.Schema.Types.ObjectId, ref: "Skill" }],
  },
  { timestamps: true }
);

export default mongoose.models.OnlineCourse ||
  mongoose.model("OnlineCourse", OnlineCourseSchema);
