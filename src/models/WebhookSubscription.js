// src/models/WebhookSubscription.js
import mongoose, { Schema } from "mongoose";

const WebhookSubscriptionSchema = new Schema(
  {
    // ชื่อ subscriber เช่น "Genesis Production"
    name: { type: String, required: true, trim: true },

    // endpoint ที่รับ webhook
    url: { type: String, required: true, trim: true },

    // shared secret สำหรับ sign HMAC-SHA256
    secret: { type: String, required: true },

    // รายชื่อ event ที่สนใจ (รองรับ wildcard เช่น "course.*")
    events: { type: [String], default: [] },

    // เปิด/ปิดการส่ง
    is_active: { type: Boolean, default: true, index: true },

    // metadata หลังยิงล่าสุด
    last_triggered_at: { type: Date, default: null },
    last_status_code: { type: Number, default: null },
    last_error: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.WebhookSubscription ||
  mongoose.model("WebhookSubscription", WebhookSubscriptionSchema);
