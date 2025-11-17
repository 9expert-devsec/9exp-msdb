import mongoose, { Schema } from "mongoose";

const ScheduleSchema = new Schema(
  {
    // อ้างอิงเฉพาะ PublicCourse (คอร์ส classroom)
    course: { type: Schema.Types.ObjectId, ref: "PublicCourse", required: true },

    // วันที่อบรม (หลายวัน)
    dates: { type: [Date], required: true, validate: v => v.length > 0 },

    // สถานะรอบ
    status: { type: String, enum: ["open", "nearly_full", "full"], default: "open" },

    // ประเภทการอบรม: classroom / hybrid
    type: { type: String, enum: ["classroom", "hybrid"], default: "classroom" },

    // ลิงก์สมัคร (ให้เปิดแท็บใหม่ตอนคลิกวันที่ในตาราง)
    signup_url: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Schedule || mongoose.model("Schedule", ScheduleSchema);
