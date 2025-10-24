import mongoose, { Schema } from "mongoose";

const FieldSchema = new Schema({
  key: { type: String, required: true },   // ex. "full_name"
  label: { type: String, required: true }, // ex. "ชื่อ-นามสกุล"
  type: {
    type: String,
    enum: ["short_text","long_text","email","phone","select","radio","checkbox"],
    default: "short_text",
  },
  required: { type: Boolean, default: false },
  options: [{ type: String }],             // สำหรับ select/radio/checkbox
}, { _id: false });

const EventSchema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true, index: true },
  banner_url: { type: String, default: "" },
  description: { type: String, default: "" },
  start_date: { type: Date, default: null },
  location: { type: String, default: "" },
  form_fields: [FieldSchema],
  email_field_key: { type: String, default: "" }, // ช่องอีเมลหลัก
  published: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Event || mongoose.model("Event", EventSchema);
