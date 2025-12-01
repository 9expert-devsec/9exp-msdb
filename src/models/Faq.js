// src/models/Faq.js
import mongoose, { Schema } from "mongoose";

const FaqSchema = new Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    // เก็บคำตอบแบบ HTML ดิบ (ใช้ในหน้า admin / preview)
    answer_html: {
      type: String,
      default: "",
    },
    // เก็บเวอร์ชัน plain text สำหรับ search / แสดงย่อ
    answer_plain: {
      type: String,
      default: "",
    },
    is_published: {
      type: Boolean,
      default: true,
      index: true,
    },
    // ลำดับในหมวด (ตัวเลขน้อยอยู่บน)
    order: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Faq || mongoose.model("Faq", FaqSchema);
