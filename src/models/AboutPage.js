import mongoose from "mongoose";

const AboutPageSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    title: { type: String, default: "About 9Expert Training" },
    content_html: { type: String, default: "" },
    content_text: { type: String, default: "" },
    update_by: { type: String, default: "" },
  },
  { timestamps: true }
);

const AboutPage =
  mongoose.models.AboutPage || mongoose.model("AboutPage", AboutPageSchema);

export default AboutPage;
