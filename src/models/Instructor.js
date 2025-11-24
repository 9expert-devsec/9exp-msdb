// src/models/Instructor.js
import mongoose, { Schema } from "mongoose";

const InstructorSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    bio: {
      type: String,
      default: "",
      trim: true,
    },
    // คนเดียวสอนได้หลาย Program
    programs: [
      {
        type: Schema.Types.ObjectId,
        ref: "Program",
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.Instructor ||
  mongoose.model("Instructor", InstructorSchema);
