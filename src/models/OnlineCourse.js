import mongoose, { Schema } from "mongoose";

const OnlineCourseSchema = new Schema(
  {
    o_course_id: { type: String, required: true, unique: true, trim: true },
    o_course_name: { type: String, required: true, trim: true },
    o_course_teaser: String,
    o_number_lessons: Number,
    o_traininghours: Number,

    o_course_price: { type: Number, default: 0 }, // 0 ได้ถ้าฟรี
    o_course_netprice: { type: Number, default: null },
    o_course_cover_url: String,
    o_course_levels: String,
    o_workshop_status: { type: Boolean, default: false },
    o_certificate_status: { type: Boolean, default: false },
    o_coursepromote_status: { type: Boolean, default: false },

    o_course_objectives: [String],
    o_course_target_audience: [String],
    o_course_prerequisites: [String],
    o_course_system_requirements: [String],
    o_course_training_topics: [String],

    program: { type: Schema.Types.ObjectId, ref: "Program", required: true },
    skills: [{ type: Schema.Types.ObjectId, ref: "Skill" }],
  },
  { timestamps: true }
);

OnlineCourseSchema.index({ o_course_name: "text", o_course_teaser: "text" });

export default mongoose.models.OnlineCourse || mongoose.model("OnlineCourse", OnlineCourseSchema);
