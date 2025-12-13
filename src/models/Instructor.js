// models/Instructor.js
import mongoose from "mongoose";

const InstructorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // ✅ NEW: English name
    name_en: {
      type: String,
      trim: true,
      default: "",
    },

    bio: {
      type: String,
      trim: true,
      default: "",
    },

    programs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Program",
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Instructor ||
  mongoose.model("Instructor", InstructorSchema);
