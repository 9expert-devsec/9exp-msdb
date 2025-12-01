import mongoose from "mongoose";

const SocialLinkSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // เช่น "facebook", "line", "youtube"
    label: { type: String, required: true }, // เช่น "Facebook Page", "LINE OA"
    url: { type: String, required: true },
    icon: { type: String, default: "" }, // เก็บชื่อ icon/slug ไว้ใช้ฝั่ง FE เช่น "facebook", "line"
  },
  { _id: false }
);

const ContactInfoSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // fix เป็น "company-contact"

    company_name: { type: String, default: "" },
    company_legal_name: { type: String, default: "" },
    tagline: { type: String, default: "" },

    address_line1: { type: String, default: "" },
    address_line2: { type: String, default: "" },
    district: { type: String, default: "" },
    province: { type: String, default: "" },
    postcode: { type: String, default: "" },
    country: { type: String, default: "Thailand" },

    phone_main: { type: String, default: "" },
    phone_secondary: { type: String, default: "" },
    fax: { type: String, default: "" },

    email_main: { type: String, default: "" },
    email_support: { type: String, default: "" },
    email_sales: { type: String, default: "" },

    line_id: { type: String, default: "" },
    line_oa_url: { type: String, default: "" },
    line_qr_url: { type: String, default: "" },

    website_url: { type: String, default: "" },

    facebook_url: { type: String, default: "" },
    instagram_url: { type: String, default: "" },
    youtube_url: { type: String, default: "" },
    tiktok_url: { type: String, default: "" },
    linkedin_url: { type: String, default: "" },

    google_map_url: { type: String, default: "" },
    google_map_embed: { type: String, default: "" }, // iframe HTML

    // ช่องทางอื่น ๆ เผื่อในอนาคต / UI dynamic
    social_links: [SocialLinkSchema],

    extra_notes: { type: String, default: "" },

    updated_by: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.ContactInfo ||
  mongoose.model("ContactInfo", ContactInfoSchema);
