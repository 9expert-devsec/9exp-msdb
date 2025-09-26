import mongoose, { Schema } from "mongoose";

const ProgramSchema = new Schema(
  {
    program_id: { type: String, required: true, unique: true, trim: true },
    program_name: { type: String, required: true, trim: true },
    programiconurl: String,
    programcolor: String,
    program_teaser: String,
    program_roadmap_url: String,
  },
  { timestamps: true }
);

export default mongoose.models.Program || mongoose.model("Program", ProgramSchema);
