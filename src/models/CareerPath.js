// src/models/CareerPath.js
import mongoose from "mongoose";
const { Schema } = mongoose;

/* ---------- sub schemas ---------- */

const ImageSchema = new Schema(
  {
    url: { type: String, default: "" },
    publicId: { type: String, default: "" },
    alt: { type: String, default: "" },
  },
  { _id: false },
);

const LinkSchema = new Schema(
  {
    detailUrl: { type: String, default: "" },
    signupUrl: { type: String, default: "" },
    outlineUrl: { type: String, default: "" },
  },
  { _id: false },
);

const PriceSchema = new Schema(
  {
    fullPrice: { type: Number, default: 0 },
    salePrice: { type: Number, default: 0 },
    discountPct: { type: Number, default: 0 },
    currency: { type: String, default: "THB" },
  },
  { _id: false },
);

const CourseSnapshotSchema = new Schema(
  {
    code: { type: String, default: "" },
    name: { type: String, default: "" },
    teaser: { type: String, default: "" },
    days: { type: Number, default: 0 },
    hours: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    imageUrl: { type: String, default: "" },
    publicUrl: { type: String, default: "" },
  },
  { _id: false },
);

const CurriculumItemSchema = new Schema(
  {
    kind: {
      type: String,
      enum: ["public", "online", "external"],
      default: "public",
    },

    publicCourse: {
      type: Schema.Types.ObjectId,
      ref: "PublicCourse",
      default: null,
    },
    onlineCourse: {
      type: Schema.Types.ObjectId,
      ref: "OnlineCourse",
      default: null,
    },

    externalName: { type: String, default: "" },
    externalUrl: { type: String, default: "" },

    note: { type: String, default: "" },
    snap: { type: CourseSnapshotSchema, default: () => ({}) },

    sortOrder: { type: Number, default: 0 },
  },
  { _id: false },
);

const CurriculumBlockSchema = new Schema(
  {
    kind: { type: String, enum: ["fixed", "choice"], default: "fixed" },
    title: { type: String, default: "" },
    description: { type: String, default: "" },

    chooseMin: { type: Number, default: 1 },
    chooseMax: { type: Number, default: 1 },

    items: { type: [CurriculumItemSchema], default: [] },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false },
);

const DetailSchema = new Schema(
  {
    tagline: { type: String, default: "" },
    intro: { type: String, default: "" },

    objectives: { type: [String], default: [] },
    suitableFor: { type: [String], default: [] },
    prerequisites: { type: [String], default: [] },
    benefits: { type: [String], default: [] },

    contentHtml: { type: String, default: "" },
  },
  { _id: false },
);

const StatsSchema = new Schema(
  {
    courseCount: { type: Number, default: 0 },
    dayCount: { type: Number, default: 0 },
    hourCount: { type: Number, default: 0 },

    minCourseCount: { type: Number, default: 0 },
    maxCourseCount: { type: Number, default: 0 },
    minDayCount: { type: Number, default: 0 },
    maxDayCount: { type: Number, default: 0 },
  },
  { _id: false },
);

/* ---------- main schema ---------- */

const CareerPathSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, index: true },

    status: {
      type: String,
      enum: ["active", "offline"],
      default: "offline",
      index: true,
    },

    isPinned: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },

    coverImage: { type: ImageSchema, default: () => ({}) },
    cardDetail: { type: String, default: "" },
    price: { type: PriceSchema, default: () => ({}) },
    links: { type: LinkSchema, default: () => ({}) },

    roadmapImage: { type: ImageSchema, default: () => ({}) },
    detail: { type: DetailSchema, default: () => ({}) },

    curriculum: { type: [CurriculumBlockSchema], default: [] },

    stats: { type: StatsSchema, default: () => ({}) },
  },
  { timestamps: true },
);

CareerPathSchema.index({ slug: 1 }, { unique: true });
CareerPathSchema.index({
  status: 1,
  isPinned: -1,
  sortOrder: 1,
  createdAt: -1,
});

export default mongoose.models.CareerPath ||
  mongoose.model("CareerPath", CareerPathSchema);
