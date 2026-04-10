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

    // Instructor profile photo
    photo_url:       { type: String, default: "" },
    photo_public_id: { type: String, default: "" },

    // Instructor signature image
    signature_url:       { type: String, default: "" },
    signature_public_id: { type: String, default: "" },

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
