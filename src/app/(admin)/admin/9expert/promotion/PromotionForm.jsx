"use client";

import { useEffect, useMemo, useState } from "react";

/* ---------- constants ---------- */
const PRESET_TAGS = [
  { label: "Public Course", color: "#22c55e" },
  { label: "Online Course", color: "#0ea5e9" },
  { label: "Event", color: "#f97316" },
  { label: "ประจำปี", color: "#6366f1" },
  { label: "ประจำเดือน", color: "#ec4899" },
];

const DEFAULT = {
  name: "",
  slug: "",
  image_url: "",
  image_alt: "",
  detail_html: "",
  detail_plain: "",
  external_url: "",
  tags: [], // [{label,color}]

  related_public_courses: [],
  related_online_courses: [],

  start_at: "",
  end_at: "",

  is_published: true,
  is_pinned: false,
};

const FieldLabel = ({ children, hint }) => (
  <label className="block text-sm font-medium text-slate-200">
    {children}
    {hint && <span className="ml-2 text-xs text-slate-400">{hint}</span>}
  </label>
);

const Section = ({ title, desc, children }) => (
  <section className="rounded-xl bg-white/5 ring-1 ring-white/10 p-4 space-y-3 mb-4">
    <div>
      <div className="text-slate-100 font-semibold">{title}</div>
      {desc && <div className="text-xs text-slate-400 mt-1">{desc}</div>}
    </div>
    {children}
  </section>
);

function TagPill({ tag, onRemove }) {
  const color = tag.color || "#0ea5e9";
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium mr-1 mb-1"
      style={{
        backgroundColor: color + "22",
        color,
        border: `1px solid ${color}55`,
      }}
    >
      <span>{tag.label}</span>
      <span className="text-[10px] opacity-80">✕</span>
    </button>
  );
}

/* ---------- main form ---------- */
export default function PromotionForm({ item = {}, onSaved, onDeleted }) {
  const [form, setForm] = useState(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [publicCourses, setPublicCourses] = useState([]);
  const [onlineCourses, setOnlineCourses] = useState([]);

  const [customTagLabel, setCustomTagLabel] = useState("");
  const [customTagColor, setCustomTagColor] = useState("#0ea5e9");

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  /* load options for courses */
  useEffect(() => {
    (async () => {
      try {
        const [pubRes, onlRes] = await Promise.all([
          fetch("/api/public-courses?limit=1000").then((r) => r.json()),
          fetch("/api/online-courses?limit=1000").then((r) => r.json()),
        ]);
        setPublicCourses(pubRes.items || []);
        setOnlineCourses(onlRes.items || []);
      } catch (e) {
        console.error("Load courses for promotion error:", e);
      }
    })();
  }, []);

  /* load item into form */
  useEffect(() => {
    const safeTags = Array.isArray(item.tags)
      ? item.tags
          .filter((t) => t && t.label)
          .map((t) => ({
            label: t.label,
            color: t.color || "#0ea5e9",
          }))
      : [];

    setForm({
      ...DEFAULT,
      ...item,
      tags: safeTags,
      related_public_courses: Array.isArray(item.related_public_courses)
        ? item.related_public_courses.map((c) =>
            typeof c === "string" ? c : c._id
          )
        : [],
      related_online_courses: Array.isArray(item.related_online_courses)
        ? item.related_online_courses.map((c) =>
            typeof c === "string" ? c : c._id
          )
        : [],
      start_at: item.start_at
        ? new Date(item.start_at).toISOString().slice(0, 16)
        : "",
      end_at: item.end_at
        ? new Date(item.end_at).toISOString().slice(0, 16)
        : "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?._id]);

  /* upload cover image */
  const onUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "promotions/covers");
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      set("image_url", data.url);
    } catch (e) {
      alert("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  /* tag helpers */
  const togglePresetTag = (preset) => {
    const exists = (form.tags || []).some((t) => t.label === preset.label);
    if (exists) {
      set(
        "tags",
        (form.tags || []).filter((t) => t.label !== preset.label)
      );
    } else {
      set("tags", [...(form.tags || []), preset]);
    }
  };

  const addCustomTag = () => {
    const label = customTagLabel.trim();
    if (!label) return;
    set("tags", [
      ...(form.tags || []),
      { label, color: customTagColor || "#0ea5e9" },
    ]);
    setCustomTagLabel("");
  };

  /* summary for preview */
  const courseSummary = useMemo(() => {
    const p = publicCourses.filter((c) =>
      (form.related_public_courses || []).includes(c._id)
    );
    const o = onlineCourses.filter((c) =>
      (form.related_online_courses || []).includes(c._id)
    );
    return { p, o };
  }, [form.related_public_courses, form.related_online_courses, publicCourses, onlineCourses]);

  /* submit */
    /* submit */
  const onSubmit = async (e) => {
    e.preventDefault();

    // ✅ กันไว้ก่อนเลย ถ้าไม่มีชื่อโปรโมชัน
    const trimmedName = (form.name || "").trim();
    if (!trimmedName) {
      alert("กรุณากรอกชื่อโปรโมชัน (Name) อย่างน้อย 1 ตัวอักษร");
      return;
    }

    setSaving(true);
    try {
      const cleanTags = (form.tags || [])
        .filter((t) => t && t.label)
        .map((t) => ({
          label: String(t.label),
          color: String(t.color || "#0ea5e9"),
        }));

      const payload = {
        ...form,
        name: trimmedName, // ✅ ส่งเป็นค่าที่ trim แล้ว
        tags: cleanTags,
        related_public_courses: form.related_public_courses || [],
        related_online_courses: form.related_online_courses || [],
        start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
        end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      };

      // auto detail_plain ถ้ายังว่าง → ตัด html ออก
      if (!payload.detail_plain && payload.detail_html) {
        const tmp = payload.detail_html
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        payload.detail_plain = tmp.slice(0, 260);
      }

      const method = item && item._id ? "PATCH" : "POST";
      const url = `/api/admin/promotions`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          ...(item && item._id ? { _id: item._id } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "Save failed");
      }
      onSaved?.(data.item);
    } catch (e) {
      console.error(e);
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };


  const handleDelete = async () => {
    if (!item?._id) return;
    if (!confirm("ลบโปรโมชันนี้หรือไม่?")) return;
    try {
      const res = await fetch(
        `/api/admin/promotions?id=${encodeURIComponent(item._id)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "Delete failed");
      }
      onDeleted?.();
    } catch (e) {
      alert(e.message);
    }
  };

  /* UI */
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Row: Basic + Image */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section
          title="ข้อมูลหลัก"
          desc="ชื่อโปรโมชัน, slug และสถานะเผยแพร่"
        >
          <div className="space-y-3">
            <div>
              <FieldLabel>Name</FieldLabel>
              <input
                className="input"
                placeholder="เช่น ปีใหม่ลดทั้งเว็บ 9Expert"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div>
              <FieldLabel hint="ใช้ใน URL หรืออ้างอิง API">
                Slug (optional)
              </FieldLabel>
              <input
                className="input"
                placeholder="new-year-9expert"
                value={form.slug || ""}
                onChange={(e) => set("slug", e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={!!form.is_published}
                  onChange={(e) => set("is_published", e.target.checked)}
                />
                Published
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={!!form.is_pinned}
                  onChange={(e) => set("is_pinned", e.target.checked)}
                />
                Pin on top
              </label>
            </div>
          </div>
        </Section>

        <Section
          title="รูปปกโปรโมชัน"
          desc="อัปโหลดรูป หรือวางลิงก์รูปเอง (เช่นจาก Cloudinary)"
        >
          <div className="space-y-2">
            <FieldLabel hint={uploading ? "กำลังอัปโหลด..." : ""}>
              Upload / URL
            </FieldLabel>
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-lg px-3 py-2 bg-white/10 hover:bg-white/20 ring-1 ring-white/10 text-sm">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onUpload(e.target.files?.[0])}
                />
                Upload Image
              </label>
              <input
                className="input flex-1 min-w-[200px]"
                placeholder="หรือวางลิงก์รูป https://..."
                value={form.image_url || ""}
                onChange={(e) => set("image_url", e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Alt text (สำหรับ SEO)</FieldLabel>
              <input
                className="input"
                placeholder="เช่น โปรโมชันปีใหม่ ลดราคาคอร์ส Excel"
                value={form.image_alt || ""}
                onChange={(e) => set("image_alt", e.target.value)}
              />
            </div>
            {form.image_url && (
              <div className="mt-2">
                <img
                  src={form.image_url}
                  alt={form.image_alt || ""}
                  className="w-full max-h-40 object-cover rounded-lg ring-1 ring-white/15"
                />
              </div>
            )}
          </div>
        </Section>

        <Section
          title="ช่วงเวลาโปรโมชัน"
          desc="ใช้กำหนดว่าจะให้แสดงโปรโมชันช่วงไหนได้บ้าง"
        >
          <div className="space-y-2">
            <div>
              <FieldLabel>Start at</FieldLabel>
              <input
                type="datetime-local"
                className="input"
                value={form.start_at || ""}
                onChange={(e) => set("start_at", e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>End at</FieldLabel>
              <input
                type="datetime-local"
                className="input"
                value={form.end_at || ""}
                onChange={(e) => set("end_at", e.target.value)}
              />
            </div>
            <div>
              <FieldLabel hint="optional">
                Promotion link (หน้า landing / สมัคร)
              </FieldLabel>
              <input
                className="input"
                placeholder="https://9experttraining.com/promotion/..."
                value={form.external_url || ""}
                onChange={(e) => set("external_url", e.target.value)}
              />
            </div>
          </div>
        </Section>
      </div>

      {/* Detail editor */}
      <Section
        title="รายละเอียดโปรโมชัน"
        desc="สามารถวาง Text, รูปภาพ หรือโค้ด HTML/CSS/JavaScript ได้ (เก็บเป็น HTML ดิบ)"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <FieldLabel hint="เก็บเป็น HTML ดิบในฐานข้อมูล">
              Detail (HTML / Text)
            </FieldLabel>
            <textarea
              className="textarea min-h-[260px] font-mono text-xs"
              placeholder={`ตัวอย่าง:
<h2>โปรโมชันพิเศษ</h2>
<p>สมัครคอร์ส Excel วันนี้ลด 30% เมื่อใช้โค้ด <strong>EXCEL30</strong></p>
<ul>
  <li>ใช้ได้ทั้ง Public และ Online</li>
  <li>จำกัด 50 ที่นั่งแรกเท่านั้น</li>
</ul>`}
              value={form.detail_html || ""}
              onChange={(e) => set("detail_html", e.target.value)}
            />
            <FieldLabel hint="ใช้สำหรับแสดงสรุปย่อบน Card / SEO">
              Plain summary (optional)
            </FieldLabel>
            <textarea
              className="textarea min-h-[80px] text-xs"
              placeholder="สรุปสั้น ๆ ของโปรโมชัน ถ้าไม่กรอก ระบบจะสร้างจาก HTML ให้โดยอัตโนมัติ"
              value={form.detail_plain || ""}
              onChange={(e) => set("detail_plain", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Live Preview (HTML rendered)</FieldLabel>
            <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3 text-sm overflow-auto max-h-[320px]">
              {form.detail_html ? (
                <div
                  className="prose prose-sm prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: form.detail_html }}
                />
              ) : (
                <div className="text-xs text-slate-500">
                  ยังไม่ได้ใส่ HTML / Text สำหรับโปรโมชัน
                </div>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Tags */}
      <Section
        title="Tags"
        desc="ใช้จัดกลุ่มโปรโมชัน เช่น Public Course, Online, Event, ประจำปี, ประจำเดือน หรือสร้าง tag เอง"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {PRESET_TAGS.map((t) => {
              const active = (form.tags || []).some(
                (x) => x.label === t.label
              );
              return (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => togglePresetTag(t)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                    active
                      ? "bg-emerald-500/20 border-emerald-400 text-emerald-200"
                      : "bg-white/5 border-white/15 text-slate-200"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FieldLabel>Custom tag</FieldLabel>
            <input
              className="input w-40"
              placeholder="เช่น Flash Sale"
              value={customTagLabel}
              onChange={(e) => setCustomTagLabel(e.target.value)}
            />
            <input
              type="color"
              className="h-9 w-9 rounded-md bg-transparent border border-white/20"
              value={customTagColor}
              onChange={(e) => setCustomTagColor(e.target.value)}
            />
            <button
              type="button"
              onClick={addCustomTag}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs"
            >
              + Add tag
            </button>
          </div>

          <div className="mt-1">
            {(form.tags || []).map((t, idx) => (
              <TagPill
                key={`${t.label}-${idx}`}
                tag={t}
                onRemove={() =>
                  set(
                    "tags",
                    (form.tags || []).filter(
                      (x, i) => !(i === idx)
                    )
                  )
                }
              />
            ))}
            {!form.tags?.length && (
              <div className="text-xs text-slate-500">
                ยังไม่ได้เลือก tag ใดเลย
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Related courses */}
      <Section
        title="ผูกคอร์สที่เกี่ยวข้อง"
        desc="เลือกคอร์ส Public / Online ที่เกี่ยวข้องกับโปรโมชันนี้ (ใช้ไปแสดงในหน้า landing หรือ API อื่นในอนาคต)"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Public Courses</FieldLabel>
            <select
              multiple
              className="input h-40"
              value={form.related_public_courses}
              onChange={(e) =>
                set(
                  "related_public_courses",
                  Array.from(e.target.selectedOptions, (o) => o.value)
                )
              }
            >
              {publicCourses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.course_name} ({c.course_id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Online Courses</FieldLabel>
            <select
              multiple
              className="input h-40"
              value={form.related_online_courses}
              onChange={(e) =>
                set(
                  "related_online_courses",
                  Array.from(e.target.selectedOptions, (o) => o.value)
                )
              }
            >
              {onlineCourses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.o_course_name} ({c.o_course_id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* small summary */}
        <div className="mt-2 text-xs text-slate-400">
          ผูก Public {courseSummary.p.length} คอร์ส, Online{" "}
          {courseSummary.o.length} คอร์ส
        </div>
      </Section>

      {/* sticky footer */}
      <div className="sticky bottom-0 bg-slate-950/95 backdrop-blur border-t border-white/10 -mx-4 px-4 py-3 flex items-center justify-between">
        {item?._id ? (
          <button
            type="button"
            onClick={handleDelete}
            className="px-3 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 text-sm"
          >
            Delete
          </button>
        ) : (
          <div />
        )}
        <button
          disabled={saving}
          className="rounded-xl px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-sm font-medium"
        >
          {saving ? "Saving..." : "Save Promotion"}
        </button>
      </div>

      {/* local styles */}
      <style jsx>{`
        .input {
          width: 100%;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.4);
          border-radius: 0.75rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: #e5e7eb;
        }
        .textarea {
          width: 100%;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.5);
          border-radius: 0.75rem;
          padding: 0.5rem 0.75rem;
          color: #e5e7eb;
          outline: none;
          transition: box-shadow 120ms, border-color 120ms;
        }
        .textarea:focus,
        .input:focus {
          border-color: rgba(52, 211, 153, 0.7);
          box-shadow: 0 0 0 2px rgba(52, 211, 153, 0.35);
        }
      `}</style>
    </form>
  );
}
