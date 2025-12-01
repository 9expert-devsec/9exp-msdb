// models/Promotion.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const TagSchema = new Schema(
  {
    label: { type: String, required: true },
    color: { type: String, default: "#0ea5e9" },
  },
  { _id: false }
);

const PromotionSchema = new Schema(
  {
    // ชื่อโปรโมชัน
    name: { type: String, required: true },

    // slug ไว้ใช้ใน URL / API
    slug: { type: String, index: true, sparse: true },

    // รูปปก
    image_url: { type: String },
    image_alt: { type: String },

    // HTML เต็ม ๆ (detail_html) + plain text สรุป (detail_plain)
    detail_html: { type: String, default: "" },
    detail_plain: { type: String, default: "" },

    // ลิงก์ไปหน้า Landing / สมัคร
    external_url: { type: String },

    // Tag ต่าง ๆ
    tags: [TagSchema],

    // ผูกคอร์ส Public / Online
    related_public_courses: [
      { type: Schema.Types.ObjectId, ref: "PublicCourse" },
    ],
    related_online_courses: [
      { type: Schema.Types.ObjectId, ref: "OnlineCourse" },
    ],

    // ช่วงเวลาโปรโมชัน
    start_at: { type: Date, default: null },
    end_at: { type: Date, default: null },

    // สถานะ
    is_published: { type: Boolean, default: true },
    is_pinned: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// ไว้ sort สวย ๆ: pin ก่อน / เริ่มใหม่ก่อน
PromotionSchema.index({ is_pinned: -1, start_at: -1, createdAt: -1 });

export default mongoose.models.Promotion ||
  mongoose.model("Promotion", PromotionSchema);
