import mongoose, { Schema } from "mongoose";

const PublicCourseSchema = new Schema(
  {
    course_id: { type: String, required: true, unique: true, trim: true }, // e.g. MSE-L1
    course_name: { type: String, required: true, trim: true },
    course_teaser: String,
    course_trainingdays: Number,
    course_traininghours: Number,
    course_price: { type: Number, default: 0 },
    course_netprice: { type: Number, default: null }, // nullable
    course_cover_url: String,

    course_type_public: { type: Boolean, default: true },
    course_type_inhouse: { type: Boolean, default: false },

    course_levels: String, // เก็บข้อความสั้นๆ เช่น "Intermediate" หรือ "1-4"
    course_workshop_status: { type: Boolean, default: false },
    course_certificate_status: { type: Boolean, default: false },
    course_promote_status: { type: Boolean, default: false },

    course_objectives: [String],
    course_target_audience: [String],
    course_prerequisites: [String],
    course_system_requirements: [String],
    course_training_topics: [String], // เก็บเป็นหัวข้อย่อยละบรรทัด

    program: { type: Schema.Types.ObjectId, ref: "Program", required: true },
    skills: [{ type: Schema.Types.ObjectId, ref: "Skill" }],
  },
  { timestamps: true }
);

PublicCourseSchema.index({ course_name: "text", course_teaser: "text" });

export default mongoose.models.PublicCourse || mongoose.model("PublicCourse", PublicCourseSchema);
