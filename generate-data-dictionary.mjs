import ExcelJS from "exceljs";

// ============================================================
// Data dictionary extracted from src/models/*.js (Mongoose schemas)
// ============================================================

const rows = [];

function add(file, schema, prop, type, required, description, parent) {
  rows.push({
    file,
    schema,
    property: parent ? `${parent}.${prop}` : prop,
    type,
    required: required ? "Required" : "Optional",
    description,
  });
}

// ---------- Program.js ----------
const f1 = "Program.js";
add(f1, "Program", "program_id", "String", true, "Unique program identifier");
add(f1, "Program", "program_name", "String", true, "Program name");
add(f1, "Program", "programiconurl", "String", false, "Icon URL");
add(f1, "Program", "programcolor", "String", false, "Color code");
add(f1, "Program", "program_teaser", "String", false, "Short teaser text");
add(f1, "Program", "program_roadmap_url", "String", false, "Roadmap URL");
add(f1, "Program", "createdAt", "Date", false, "Auto-generated timestamp");
add(f1, "Program", "updatedAt", "Date", false, "Auto-generated timestamp");

// ---------- Skill.js ----------
const f2 = "Skill.js";
add(f2, "Skill", "skill_id", "String", true, "Unique skill identifier");
add(f2, "Skill", "skill_name", "String", true, "Skill name");
add(f2, "Skill", "skilliconurl", "String", false, "Icon URL");
add(f2, "Skill", "skillcolor", "String", false, "Color code");
add(f2, "Skill", "skill_teaser", "String", false, "Short teaser text");
add(f2, "Skill", "skill_roadmap_url", "String", false, "Roadmap URL");
add(f2, "Skill", "createdAt", "Date", false, "Auto-generated timestamp");
add(f2, "Skill", "updatedAt", "Date", false, "Auto-generated timestamp");

// ---------- AdminUser.js ----------
const f3 = "AdminUser.js";
add(f3, "AdminUser", "name", "String", false, "Admin user name");
add(f3, "AdminUser", "email", "String", true, "Email (unique, lowercase)");
add(f3, "AdminUser", "passwordHash", "String", true, "Hashed password");
add(f3, "AdminUser", "role", "String", false, 'User role (default: "admin"). Future: superadmin, editor, etc.');
add(f3, "AdminUser", "isActive", "Boolean", false, "Whether account is active (default: true)");
add(f3, "AdminUser", "createdAt", "Date", false, "Auto-generated timestamp");
add(f3, "AdminUser", "updatedAt", "Date", false, "Auto-generated timestamp");

// ---------- AboutPage.js ----------
const f4 = "AboutPage.js";
add(f4, "AboutPage", "key", "String", true, "Unique page key");
add(f4, "AboutPage", "title", "String", false, 'Page title (default: "About 9Expert Training")');
add(f4, "AboutPage", "content_html", "String", false, "HTML content");
add(f4, "AboutPage", "content_text", "String", false, "Plain text content");
add(f4, "AboutPage", "update_by", "String", false, "Last updated by");
add(f4, "AboutPage", "createdAt", "Date", false, "Auto-generated timestamp");
add(f4, "AboutPage", "updatedAt", "Date", false, "Auto-generated timestamp");

// ---------- ContactInfo.js ----------
const f5 = "ContactInfo.js";
add(f5, "ContactInfo", "key", "String", true, 'Unique key (fixed as "company-contact")');
add(f5, "ContactInfo", "company_name", "String", false, "Company display name");
add(f5, "ContactInfo", "company_legal_name", "String", false, "Legal company name");
add(f5, "ContactInfo", "tagline", "String", false, "Company tagline");
add(f5, "ContactInfo", "address_line1", "String", false, "Address line 1");
add(f5, "ContactInfo", "address_line2", "String", false, "Address line 2");
add(f5, "ContactInfo", "district", "String", false, "District");
add(f5, "ContactInfo", "province", "String", false, "Province");
add(f5, "ContactInfo", "postcode", "String", false, "Postcode");
add(f5, "ContactInfo", "country", "String", false, 'Country (default: "Thailand")');
add(f5, "ContactInfo", "phone_main", "String", false, "Main phone number");
add(f5, "ContactInfo", "phone_secondary", "String", false, "Secondary phone number");
add(f5, "ContactInfo", "fax", "String", false, "Fax number");
add(f5, "ContactInfo", "email_main", "String", false, "Main email address");
add(f5, "ContactInfo", "email_support", "String", false, "Support email");
add(f5, "ContactInfo", "email_sales", "String", false, "Sales email");
add(f5, "ContactInfo", "line_id", "String", false, "LINE ID");
add(f5, "ContactInfo", "line_oa_url", "String", false, "LINE Official Account URL");
add(f5, "ContactInfo", "line_qr_url", "String", false, "LINE QR code URL");
add(f5, "ContactInfo", "website_url", "String", false, "Website URL");
add(f5, "ContactInfo", "facebook_url", "String", false, "Facebook URL");
add(f5, "ContactInfo", "instagram_url", "String", false, "Instagram URL");
add(f5, "ContactInfo", "youtube_url", "String", false, "YouTube URL");
add(f5, "ContactInfo", "tiktok_url", "String", false, "TikTok URL");
add(f5, "ContactInfo", "linkedin_url", "String", false, "LinkedIn URL");
add(f5, "ContactInfo", "google_map_url", "String", false, "Google Maps URL");
add(f5, "ContactInfo", "google_map_embed", "String", false, "Google Maps iframe HTML");
add(f5, "ContactInfo", "social_links", "Array<SocialLink>", false, "Additional social links (dynamic)");
add(f5, "ContactInfo", "social_links.key", "String", true, 'Platform key (e.g. "facebook", "line", "youtube")');
add(f5, "ContactInfo", "social_links.label", "String", true, 'Display label (e.g. "Facebook Page", "LINE OA")');
add(f5, "ContactInfo", "social_links.url", "String", true, "Link URL");
add(f5, "ContactInfo", "social_links.icon", "String", false, 'Icon slug for frontend (e.g. "facebook", "line")');
add(f5, "ContactInfo", "extra_notes", "String", false, "Extra notes");
add(f5, "ContactInfo", "updated_by", "String", false, "Last updated by");
add(f5, "ContactInfo", "createdAt", "Date", false, "Auto-generated timestamp");
add(f5, "ContactInfo", "updatedAt", "Date", false, "Auto-generated timestamp");

// ---------- Event.js ----------
const f6 = "Event.js";
add(f6, "Event", "title", "String", true, "Event title");
add(f6, "Event", "slug", "String", false, "URL slug (unique, indexed)");
add(f6, "Event", "banner_url", "String", false, "Banner image URL");
add(f6, "Event", "description", "String", false, "Event description");
add(f6, "Event", "start_date", "Date", false, "Event start date");
add(f6, "Event", "location", "String", false, "Event location");
add(f6, "Event", "form_fields", "Array<Field>", false, "Dynamic form fields");
add(f6, "Event", "form_fields.key", "String", true, 'Field key (e.g. "full_name")');
add(f6, "Event", "form_fields.label", "String", true, 'Field label (e.g. "ชื่อ-นามสกุล")');
add(f6, "Event", "form_fields.type", "String (enum)", false, 'Field type. Enum: "short_text", "long_text", "email", "phone", "select", "radio", "checkbox". Default: "short_text"');
add(f6, "Event", "form_fields.required", "Boolean", false, "Whether field is required (default: false)");
add(f6, "Event", "form_fields.options", "Array<String>", false, "Options for select/radio/checkbox fields");
add(f6, "Event", "email_field_key", "String", false, "Key of the main email field in form_fields");
add(f6, "Event", "published", "Boolean", false, "Published status (default: true)");
add(f6, "Event", "createdAt", "Date", false, "Auto-generated timestamp");
add(f6, "Event", "updatedAt", "Date", false, "Auto-generated timestamp");

// ---------- EventResponse.js ----------
const f7 = "EventResponse.js";
add(f7, "EventResponse", "eventId", "ObjectId (ref: Event)", false, "Reference to parent Event");
add(f7, "EventResponse", "answers", "Mixed", false, "Key-value pairs of form answers");
add(f7, "EventResponse", "createdAt", "Date", false, "Auto-generated timestamp");
add(f7, "EventResponse", "updatedAt", "Date", false, "Auto-generated timestamp");

// ---------- Faq.js ----------
const f8 = "Faq.js";
add(f8, "Faq", "category", "String", true, "FAQ category (indexed)");
add(f8, "Faq", "question", "String", true, "Question text");
add(f8, "Faq", "answer_html", "String", false, "Answer in HTML (for admin/preview)");
add(f8, "Faq", "answer_plain", "String", false, "Plain text answer (for search/summary)");
add(f8, "Faq", "is_published", "Boolean", false, "Published status (default: true, indexed)");
add(f8, "Faq", "order", "Number", false, "Sort order within category (lower = higher, indexed)");
add(f8, "Faq", "createdAt", "Date", false, "Auto-generated timestamp");
add(f8, "Faq", "updatedAt", "Date", false, "Auto-generated timestamp");

// ---------- Instructor.js ----------
const f9 = "Instructor.js";
add(f9, "Instructor", "name", "String", true, "Instructor name (Thai)");
add(f9, "Instructor", "name_en", "String", false, "Instructor name (English)");
add(f9, "Instructor", "bio", "String", false, "Biography");
add(f9, "Instructor", "programs", "Array<ObjectId> (ref: Program)", false, "Programs this instructor teaches");
add(f9, "Instructor", "createdAt", "Date", false, "Auto-generated timestamp");
add(f9, "Instructor", "updatedAt", "Date", false, "Auto-generated timestamp");

// ---------- OnlineCourse.js ----------
const f10 = "OnlineCourse.js";
add(f10, "OnlineCourse", "o_course_id", "String", true, "Unique online course ID");
add(f10, "OnlineCourse", "o_course_name", "String", true, "Course name");
add(f10, "OnlineCourse", "o_course_teaser", "String", false, "Short teaser");
add(f10, "OnlineCourse", "o_number_lessons", "Number", false, "Number of lessons");
add(f10, "OnlineCourse", "o_course_traininghours", "Number", false, "Training hours");
add(f10, "OnlineCourse", "o_course_price", "Number", false, "Course price (default: 0)");
add(f10, "OnlineCourse", "o_course_netprice", "Number", false, "Net price (default: null)");
add(f10, "OnlineCourse", "o_course_cover_url", "String", false, "Cover image URL");
add(f10, "OnlineCourse", "o_course_levels", "String", false, 'Course level (default: "1")');
add(f10, "OnlineCourse", "o_course_workshop_status", "Boolean", false, "Has workshop (default: false)");
add(f10, "OnlineCourse", "o_course_certificate_status", "Boolean", false, "Has certificate (default: false)");
add(f10, "OnlineCourse", "o_course_promote_status", "Boolean", false, "Promoted (default: false)");
add(f10, "OnlineCourse", "o_course_objectives", "Array<String>", false, "Course objectives");
add(f10, "OnlineCourse", "o_course_target_audience", "Array<String>", false, "Target audience");
add(f10, "OnlineCourse", "o_course_prerequisites", "Array<String>", false, "Prerequisites");
add(f10, "OnlineCourse", "o_course_system_requirements", "Array<String>", false, "System requirements");
add(f10, "OnlineCourse", "o_course_training_topics", "Array<TrainingTopic>", false, "Training topics with sub-bullets");
add(f10, "OnlineCourse", "o_course_training_topics.title", "String", false, "Topic title");
add(f10, "OnlineCourse", "o_course_training_topics.bullets", "Array<String>", false, "Sub-bullet points");
add(f10, "OnlineCourse", "o_course_doc_paths", "Array<String>", false, "Document paths");
add(f10, "OnlineCourse", "o_course_lab_paths", "Array<String>", false, "Lab paths");
add(f10, "OnlineCourse", "o_course_case_study_paths", "Array<String>", false, "Case study paths");
add(f10, "OnlineCourse", "website_urls", "Array<String>", false, "Related website URLs");
add(f10, "OnlineCourse", "exam_links", "Array<String>", false, "Exam links");
add(f10, "OnlineCourse", "sort_order", "Number", false, "Sort order (default: 0)");
add(f10, "OnlineCourse", "previous_course", "ObjectId (ref: OnlineCourse)", false, "Previous course reference");
add(f10, "OnlineCourse", "program", "ObjectId (ref: Program)", false, "Parent program reference");
add(f10, "OnlineCourse", "skills", "Array<ObjectId> (ref: Skill)", false, "Related skills");
add(f10, "OnlineCourse", "createdAt", "Date", false, "Auto-generated timestamp");
add(f10, "OnlineCourse", "updatedAt", "Date", false, "Auto-generated timestamp");

// ---------- Promotion.js ----------
const f11 = "Promotion.js";
add(f11, "Promotion", "name", "String", true, "Promotion name");
add(f11, "Promotion", "slug", "String", false, "URL slug (indexed, sparse)");
add(f11, "Promotion", "image_url", "String", false, "Cover image URL");
add(f11, "Promotion", "image_alt", "String", false, "Image alt text");
add(f11, "Promotion", "detail_html", "String", false, "Full HTML detail");
add(f11, "Promotion", "detail_plain", "String", false, "Plain text summary");
add(f11, "Promotion", "external_url", "String", false, "External landing/signup URL");
add(f11, "Promotion", "tags", "Array<Tag>", false, "Tags for the promotion");
add(f11, "Promotion", "tags.label", "String", true, "Tag label");
add(f11, "Promotion", "tags.color", "String", false, 'Tag color (default: "#0ea5e9")');
add(f11, "Promotion", "related_public_courses", "Array<ObjectId> (ref: PublicCourse)", false, "Related public courses");
add(f11, "Promotion", "related_online_courses", "Array<ObjectId> (ref: OnlineCourse)", false, "Related online courses");
add(f11, "Promotion", "start_at", "Date", false, "Promotion start date");
add(f11, "Promotion", "end_at", "Date", false, "Promotion end date");
add(f11, "Promotion", "is_published", "Boolean", false, "Published status (default: true)");
add(f11, "Promotion", "is_pinned", "Boolean", false, "Pinned status (default: false)");
add(f11, "Promotion", "createdAt", "Date", false, "Auto-generated timestamp");
add(f11, "Promotion", "updatedAt", "Date", false, "Auto-generated timestamp");

// ---------- PublicCourse.js ----------
const f12 = "PublicCourse.js";
add(f12, "PublicCourse", "course_id", "String", true, "Unique course ID (indexed)");
add(f12, "PublicCourse", "course_name", "String", true, "Course name (indexed, text search)");
add(f12, "PublicCourse", "course_teaser", "String", false, "Course teaser (text search)");
add(f12, "PublicCourse", "course_trainingdays", "Number", false, "Training days (default: 0)");
add(f12, "PublicCourse", "course_traininghours", "Number", false, "Training hours (default: 0)");
add(f12, "PublicCourse", "course_price", "Number", false, "Course price (default: 0)");
add(f12, "PublicCourse", "course_netprice", "Number", false, "Net price (default: null)");
add(f12, "PublicCourse", "course_cover_url", "String", false, "Cover image URL");
add(f12, "PublicCourse", "course_levels", "String", false, 'Course level "1".."4" (default: "1")');
add(f12, "PublicCourse", "course_type_public", "Boolean", false, "Public course flag (default: true)");
add(f12, "PublicCourse", "course_type_inhouse", "Boolean", false, "In-house course flag (default: false)");
add(f12, "PublicCourse", "course_workshop_status", "Boolean", false, "Has workshop (default: false)");
add(f12, "PublicCourse", "course_certificate_status", "Boolean", false, "Has certificate (default: false)");
add(f12, "PublicCourse", "course_promote_status", "Boolean", false, "Promoted (default: false)");
add(f12, "PublicCourse", "sort_order", "Number", false, "Sort order (lower = higher, indexed)");
add(f12, "PublicCourse", "program", "ObjectId (ref: Program)", false, "Parent program (indexed)");
add(f12, "PublicCourse", "skills", "Array<ObjectId> (ref: Skill)", false, "Related skills");
add(f12, "PublicCourse", "course_objectives", "Array<String>", false, "Course objectives");
add(f12, "PublicCourse", "course_target_audience", "Array<String>", false, "Target audience");
add(f12, "PublicCourse", "course_prerequisites", "Array<String>", false, "Prerequisites");
add(f12, "PublicCourse", "course_system_requirements", "Array<String>", false, "System requirements");
add(f12, "PublicCourse", "training_topics", "Array<TrainingTopic>", false, "Training topics with sub-bullets");
add(f12, "PublicCourse", "training_topics.title", "String", false, "Topic title");
add(f12, "PublicCourse", "training_topics.bullets", "Array<String>", false, "Sub-bullet points");
add(f12, "PublicCourse", "course_doc_paths", "Array<String>", false, "Document paths");
add(f12, "PublicCourse", "course_lab_paths", "Array<String>", false, "Lab paths");
add(f12, "PublicCourse", "course_case_study_paths", "Array<String>", false, "Case study paths");
add(f12, "PublicCourse", "website_urls", "Array<String>", false, "Related website URLs");
add(f12, "PublicCourse", "exam_links", "Array<String>", false, "Exam links");
add(f12, "PublicCourse", "previous_course", "ObjectId (ref: PublicCourse)", false, "Previous course reference");
add(f12, "PublicCourse", "createdAt", "Date", false, "Auto-generated timestamp");
add(f12, "PublicCourse", "updatedAt", "Date", false, "Auto-generated timestamp");

// ---------- Schedule.js ----------
const f13 = "Schedule.js";
add(f13, "Schedule", "course", "ObjectId (ref: PublicCourse)", true, "Reference to classroom course");
add(f13, "Schedule", "dates", "Array<Date>", true, "Training dates (must have at least 1)");
add(f13, "Schedule", "status", "String (enum)", false, 'Schedule status. Enum: "open", "nearly_full", "full". Default: "open"');
add(f13, "Schedule", "type", "String (enum)", false, 'Training type. Enum: "classroom", "hybrid". Default: "classroom"');
add(f13, "Schedule", "signup_url", "String", false, "Signup URL (opens in new tab)");
add(f13, "Schedule", "createdAt", "Date", false, "Auto-generated timestamp");
add(f13, "Schedule", "updatedAt", "Date", false, "Auto-generated timestamp");

// ---------- CareerPath.js ----------
const f14 = "CareerPath.js";
// Main schema
add(f14, "CareerPath", "title", "String", true, "Career path title");
add(f14, "CareerPath", "slug", "String", true, "URL slug (unique, indexed)");
add(f14, "CareerPath", "status", "String (enum)", false, 'Status. Enum: "active", "offline". Default: "offline"');
add(f14, "CareerPath", "isPinned", "Boolean", false, "Pinned status (default: false)");
add(f14, "CareerPath", "sortOrder", "Number", false, "Sort order (default: 0)");
add(f14, "CareerPath", "coverImage", "Image (embedded)", false, "Cover image object");
add(f14, "CareerPath", "coverImage.url", "String", false, "Image URL");
add(f14, "CareerPath", "coverImage.publicId", "String", false, "Cloudinary public ID");
add(f14, "CareerPath", "coverImage.alt", "String", false, "Alt text");
add(f14, "CareerPath", "cardDetail", "String", false, "Card detail text");
add(f14, "CareerPath", "price", "Price (embedded)", false, "Pricing object");
add(f14, "CareerPath", "price.fullPrice", "Number", false, "Full price (default: 0)");
add(f14, "CareerPath", "price.salePrice", "Number", false, "Sale price (default: 0)");
add(f14, "CareerPath", "price.discountPct", "Number", false, "Discount percentage (default: 0)");
add(f14, "CareerPath", "price.currency", "String", false, 'Currency (default: "THB")');
add(f14, "CareerPath", "links", "Link (embedded)", false, "External links");
add(f14, "CareerPath", "links.detailUrl", "String", false, "Detail page URL");
add(f14, "CareerPath", "links.signupUrl", "String", false, "Signup URL");
add(f14, "CareerPath", "links.outlineUrl", "String", false, "Outline URL");
add(f14, "CareerPath", "roadmapImage", "Image (embedded)", false, "Roadmap image object");
add(f14, "CareerPath", "roadmapImage.url", "String", false, "Image URL");
add(f14, "CareerPath", "roadmapImage.publicId", "String", false, "Cloudinary public ID");
add(f14, "CareerPath", "roadmapImage.alt", "String", false, "Alt text");
add(f14, "CareerPath", "detail", "Detail (embedded)", false, "Detailed description");
add(f14, "CareerPath", "detail.tagline", "String", false, "Tagline");
add(f14, "CareerPath", "detail.intro", "String", false, "Introduction text");
add(f14, "CareerPath", "detail.objectives", "Array<String>", false, "Objectives");
add(f14, "CareerPath", "detail.suitableFor", "Array<String>", false, "Suitable for (target audience)");
add(f14, "CareerPath", "detail.prerequisites", "Array<String>", false, "Prerequisites");
add(f14, "CareerPath", "detail.benefits", "Array<String>", false, "Benefits");
add(f14, "CareerPath", "detail.contentHtml", "String", false, "HTML content");
add(f14, "CareerPath", "curriculum", "Array<CurriculumBlock>", false, "Curriculum blocks");
add(f14, "CareerPath", "curriculum.kind", "String (enum)", false, 'Block kind. Enum: "fixed", "choice". Default: "fixed"');
add(f14, "CareerPath", "curriculum.title", "String", false, "Block title");
add(f14, "CareerPath", "curriculum.description", "String", false, "Block description");
add(f14, "CareerPath", "curriculum.chooseMin", "Number", false, "Minimum choices (default: 1)");
add(f14, "CareerPath", "curriculum.chooseMax", "Number", false, "Maximum choices (default: 1)");
add(f14, "CareerPath", "curriculum.items", "Array<CurriculumItem>", false, "Items in this block");
add(f14, "CareerPath", "curriculum.items.kind", "String (enum)", false, 'Item kind. Enum: "public", "online", "external". Default: "public"');
add(f14, "CareerPath", "curriculum.items.publicCourse", "ObjectId (ref: PublicCourse)", false, "Reference to PublicCourse");
add(f14, "CareerPath", "curriculum.items.onlineCourse", "ObjectId (ref: OnlineCourse)", false, "Reference to OnlineCourse");
add(f14, "CareerPath", "curriculum.items.externalName", "String", false, "External course name");
add(f14, "CareerPath", "curriculum.items.externalUrl", "String", false, "External course URL");
add(f14, "CareerPath", "curriculum.items.note", "String", false, "Note");
add(f14, "CareerPath", "curriculum.items.snap", "CourseSnapshot (embedded)", false, "Snapshot of course data");
add(f14, "CareerPath", "curriculum.items.snap.code", "String", false, "Course code");
add(f14, "CareerPath", "curriculum.items.snap.name", "String", false, "Course name");
add(f14, "CareerPath", "curriculum.items.snap.teaser", "String", false, "Course teaser");
add(f14, "CareerPath", "curriculum.items.snap.days", "Number", false, "Training days (default: 0)");
add(f14, "CareerPath", "curriculum.items.snap.hours", "Number", false, "Training hours (default: 0)");
add(f14, "CareerPath", "curriculum.items.snap.price", "Number", false, "Course price (default: 0)");
add(f14, "CareerPath", "curriculum.items.snap.imageUrl", "String", false, "Image URL");
add(f14, "CareerPath", "curriculum.items.snap.publicUrl", "String", false, "Public URL");
add(f14, "CareerPath", "curriculum.items.sortOrder", "Number", false, "Sort order (default: 0)");
add(f14, "CareerPath", "curriculum.sortOrder", "Number", false, "Block sort order (default: 0)");
add(f14, "CareerPath", "stats", "Stats (embedded)", false, "Computed statistics");
add(f14, "CareerPath", "stats.courseCount", "Number", false, "Total course count (default: 0)");
add(f14, "CareerPath", "stats.dayCount", "Number", false, "Total day count (default: 0)");
add(f14, "CareerPath", "stats.hourCount", "Number", false, "Total hour count (default: 0)");
add(f14, "CareerPath", "stats.minCourseCount", "Number", false, "Min course count (default: 0)");
add(f14, "CareerPath", "stats.maxCourseCount", "Number", false, "Max course count (default: 0)");
add(f14, "CareerPath", "stats.minDayCount", "Number", false, "Min day count (default: 0)");
add(f14, "CareerPath", "stats.maxDayCount", "Number", false, "Max day count (default: 0)");
add(f14, "CareerPath", "createdAt", "Date", false, "Auto-generated timestamp");
add(f14, "CareerPath", "updatedAt", "Date", false, "Auto-generated timestamp");

// ============================================================
// Generate Excel
// ============================================================

const workbook = new ExcelJS.Workbook();
workbook.creator = "Data Dictionary Generator";
workbook.created = new Date();

const sheet = workbook.addWorksheet("Data Dictionary");

// Define columns
sheet.columns = [
  { header: "File Name", key: "file", width: 22 },
  { header: "Schema / Model", key: "schema", width: 20 },
  { header: "Property Name", key: "property", width: 38 },
  { header: "Type", key: "type", width: 36 },
  { header: "Required / Optional", key: "required", width: 18 },
  { header: "Description", key: "description", width: 60 },
];

// Style header row
const headerRow = sheet.getRow(1);
headerRow.font = { bold: true, size: 11 };
headerRow.fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF4472C4" },
};
headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
headerRow.alignment = { vertical: "middle", horizontal: "center" };

// Add data rows
for (const r of rows) {
  sheet.addRow(r);
}

// Auto-filter on all columns
sheet.autoFilter = {
  from: { row: 1, column: 1 },
  to: { row: rows.length + 1, column: 6 },
};

// Freeze header row
sheet.views = [{ state: "frozen", ySplit: 1 }];

// Alternate row shading for readability
for (let i = 2; i <= rows.length + 1; i++) {
  const row = sheet.getRow(i);
  if (i % 2 === 0) {
    row.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E2F3" },
    };
  }
  // Color "Required" cells
  const reqCell = row.getCell(5);
  if (reqCell.value === "Required") {
    reqCell.font = { bold: true, color: { argb: "FFC00000" } };
  }
}

const outPath = "./data-dictionary.xlsx";
await workbook.xlsx.writeFile(outPath);
console.log(`✅ Data dictionary written to ${outPath}`);
console.log(`   Total rows: ${rows.length}`);
