import mongoose, { Schema } from "mongoose";

const SkillSchema = new Schema(
  {
    skill_id: { type: String, required: true, unique: true, trim: true },
    skill_name: { type: String, required: true, trim: true },
    skilliconurl: String,
    skillcolor: String,
    skill_teaser: String,
    skill_roadmap_url: String,
  },
  { timestamps: true }
);

export default mongoose.models.Skill || mongoose.model("Skill", SkillSchema);
