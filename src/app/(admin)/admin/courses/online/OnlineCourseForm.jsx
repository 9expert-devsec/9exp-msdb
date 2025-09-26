"use client";
import { useEffect, useMemo, useState } from "react";

/* ---------- constants ---------- */
const LEVELS = [
  { value: "1", label: "1 (Beginner)" },
  { value: "2", label: "2 (Intermediate)" },
  { value: "3", label: "3 (Advanced)" },
  { value: "4", label: "4 (Expert)" },
];

const DEFAULT = {
  o_course_id: "",
  o_course_name: "",
  o_course_teaser: "",
  o_number_lessons: 0,
  o_course_traininghours: 0,
  o_course_price: 0,
  o_course_netprice: null,
  o_course_cover_url: "",
  o_course_levels: "1",
  o_course_workshop_status: false,
  o_course_certificate_status: false,
  o_course_promote_status: false,
  o_course_objectives: "",
  o_course_target_audience: "",
  o_course_prerequisites: "",
  o_course_system_requirements: "",
  o_course_training_topics: "",

  // new: multi-URL fields (1 บรรทัด = 1 URL)
  o_course_doc_paths: "",
  o_course_lab_paths: "",
  o_course_case_study_paths: "",

  sort_order: 0,

  program: "",
  skills: [],
};

/* ---------- tiny helpers ---------- */
const FieldLabel = ({ children, hint }) => (
  <label className="block text-sm font-medium text-slate-200">
    {children}
    {hint && <span className="ml-2 text-xs text-slate-400">{hint}</span>}
  </label>
);

const Section = ({ title, desc, children }) => (
  <section className="rounded-xl bg-white/5 ring-1 ring-white/10 p-4 space-y-3">
    <div>
      <div className="text-slate-100 font-semibold">{title}</div>
      {desc && <div className="text-xs text-slate-400 mt-1">{desc}</div>}
    </div>
    {children}
  </section>
);

const BulletHint = ({ title }) => (
  <div className="text-xs text-slate-400">
    • {title}: <b>1 บรรทัด = 1 รายการ</b> (กด Enter เพื่อขึ้นบรรทัดใหม่)
  </div>
);

const useLinesCounter = (form) => {
  const parse = (t) =>
    (t || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  return useMemo(
    () => ({
      obj: parse(form.o_course_objectives).length,
      aud: parse(form.o_course_target_audience).length,
      pre: parse(form.o_course_prerequisites).length,
      sys: parse(form.o_course_system_requirements).length,
      top: parse(form.o_course_training_topics).length,
      doc: parse(form.o_course_doc_paths).length,
      lab: parse(form.o_course_lab_paths).length,
      cs: parse(form.o_course_case_study_paths).length,
    }),
    [
      form.o_course_objectives,
      form.o_course_target_audience,
      form.o_course_prerequisites,
      form.o_course_system_requirements,
      form.o_course_training_topics,
      form.o_course_doc_paths,
      form.o_course_lab_paths,
      form.o_course_case_study_paths,
    ]
  );
};

/* ---------- main ---------- */
export default function OnlineCourseForm({ item = {}, onSaved }) {
  const [programs, setPrograms] = useState([]);
  const [skills, setSkills] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState("");

  const [form, setForm] = useState(DEFAULT);
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const parseLines = (text) =>
    (text || "")
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);

  const counts = useLinesCounter(form);

  /* ---------- load options ---------- */
  useEffect(() => {
    (async () => {
      const [pg, sk] = await Promise.all([
        fetch("/api/programs").then((r) => r.json()),
        fetch("/api/skills").then((r) => r.json()),
      ]);
      setPrograms(pg.items || []);
      setSkills(sk.items || []);
    })();
  }, []);

  /* ---------- load item ---------- */
  useEffect(() => {
    const toText = (arr) =>
      Array.isArray(arr) && arr.length ? arr.join("\n") : "";

    setForm({
      ...DEFAULT,
      ...item,

      // normalize text-fields (array -> textarea)
      o_course_objectives: toText(item.o_course_objectives),
      o_course_target_audience: toText(item.o_course_target_audience),
      o_course_prerequisites: toText(item.o_course_prerequisites),
      o_course_system_requirements: toText(item.o_course_system_requirements),
      o_course_training_topics: toText(item.o_course_training_topics),

      // new url-list fields
      o_course_doc_paths: toText(item.o_course_doc_paths),
      o_course_lab_paths: toText(item.o_course_lab_paths),
      o_course_case_study_paths: toText(item.o_course_case_study_paths),

      program: item?.program?._id || item?.program || "",
      skills: Array.isArray(item?.skills)
        ? item.skills.map((s) => s._id || s)
        : [],

      o_course_levels: item.o_course_levels || "1",
      sort_order: item.sort_order ?? 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  /* ---------- upload ---------- */
  const onUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "online/covers"); // แยกโฟลเดอร์จาก public
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      set("o_course_cover_url", data.url);
    } catch (e) {
      alert("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  /* ---------- submit ---------- */
  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,

        // numeric
        o_number_lessons: +form.o_number_lessons || 0,
        o_course_traininghours: +form.o_course_traininghours || 0,
        o_course_price: form.o_course_price === "" ? 0 : +form.o_course_price,
        o_course_netprice:
          form.o_course_netprice === "" || form.o_course_netprice == null
            ? null
            : +form.o_course_netprice,
        sort_order: +form.sort_order || 0,

        // arrays
        o_course_objectives: parseLines(form.o_course_objectives),
        o_course_target_audience: parseLines(form.o_course_target_audience),
        o_course_prerequisites: parseLines(form.o_course_prerequisites),
        o_course_system_requirements: parseLines(
          form.o_course_system_requirements
        ),
        o_course_training_topics: parseLines(form.o_course_training_topics),

        // url lists
        o_course_doc_paths: parseLines(form.o_course_doc_paths),
        o_course_lab_paths: parseLines(form.o_course_lab_paths),
        o_course_case_study_paths: parseLines(form.o_course_case_study_paths),
      };

      const method = item && item._id ? "PATCH" : "POST";
      const url =
        item && item._id
          ? `/api/online-courses/${item._id}`
          : `/api/online-courses`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved?.();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  /* ---------- UI ---------- */
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Basics */}
      <Section
        title="ข้อมูลหลัก (Online)"
        desc="ระบุรหัสและชื่อคอร์ส พร้อมคำโปรย (Teaser)"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <FieldLabel>Course ID</FieldLabel>
            <input
              className="input"
              placeholder="เช่น PBI-OL-01"
              value={form.o_course_id}
              onChange={(e) => set("o_course_id", e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Course Name</FieldLabel>
            <input
              className="input"
              placeholder="เช่น Power BI Desktop for Business Analytics (Online)"
              value={form.o_course_name}
              onChange={(e) => set("o_course_name", e.target.value)}
            />
          </div>
          <div className="lg:col-span-2">
            <FieldLabel>Teaser</FieldLabel>
            <textarea
              className="textarea min-h-[96px]"
              placeholder="คำโปรยสั้นๆ ของคอร์ส"
              value={form.o_course_teaser}
              onChange={(e) => set("o_course_teaser", e.target.value)}
            />
          </div>
        </div>
      </Section>

      {/* Media, Schedule, Level, Price, Sort */}
      <Section title="สื่อ & เวลาเรียน & ระดับ & ราคา & ลำดับ">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Cover */}
          <div>
            <FieldLabel hint={uploading ? "กำลังอัปโหลด..." : ""}>
              Cover Image
            </FieldLabel>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer rounded-lg px-3 py-2 bg-white/10 hover:bg-white/20 ring-1 ring-white/10">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onUpload(e.target.files?.[0])}
                />
                {form.o_course_cover_url ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
              </label>
              {form.o_course_cover_url && (
                <>
                  <img
                    src={form.o_course_cover_url}
                    alt="cover"
                    className="h-12 w-20 rounded-md object-cover ring-1 ring-white/15 cursor-zoom-in"
                    title="คลิกเพื่อดูภาพใหญ่"
                    onClick={() => setLightbox(form.o_course_cover_url)}
                  />
                  <button
                    type="button"
                    onClick={() => set("o_course_cover_url", "")}
                    className="text-sm px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
                  >
                    ลบรูป
                  </button>
                  <a
                    target="_blank"
                    href={form.o_course_cover_url}
                    className="text-sm underline"
                  >
                    เปิดรูป
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Lessons */}
            <div>
              <FieldLabel>Lessons</FieldLabel>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "o_number_lessons",
                      Math.max(0, (+form.o_number_lessons || 0) - 1)
                    )
                  }
                  className="btn-step"
                >
                  −
                </button>
                <input
                  type="number"
                  className="input text-center"
                  value={form.o_number_lessons}
                  onChange={(e) => set("o_number_lessons", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() =>
                    set("o_number_lessons", (+form.o_number_lessons || 0) + 1)
                  }
                  className="btn-step"
                >
                  +
                </button>
              </div>
            </div>

            {/* Hours */}
            <div>
              <FieldLabel>Hours</FieldLabel>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "o_course_traininghours",
                      Math.max(0, (+form.o_course_traininghours || 0) - 1)
                    )
                  }
                  className="btn-step"
                >
                  −
                </button>
                <input
                  type="number"
                  className="input text-center"
                  value={form.o_course_traininghours}
                  onChange={(e) =>
                    set("o_course_traininghours", e.target.value)
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "o_course_traininghours",
                      (+form.o_course_traininghours || 0) + 1
                    )
                  }
                  className="btn-step"
                >
                  +
                </button>
              </div>
            </div>

            {/* Level */}
            <div>
              <FieldLabel>Level</FieldLabel>
              <select
                className="input"
                value={form.o_course_levels}
                onChange={(e) => set("o_course_levels", e.target.value)}
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Price & NetPrice */}
            <div className="col-span-3">
              <FieldLabel>Price</FieldLabel>
              <input
                type="number"
                className="input"
                placeholder="เช่น 1000 (ใส่ 0 ได้ถ้าฟรี)"
                value={form.o_course_price}
                onChange={(e) => set("o_course_price", e.target.value)}
              />
            </div>
            <div className="col-span-3">
              <FieldLabel>Net Price (nullable)</FieldLabel>
              <input
                type="number"
                className="input"
                placeholder="ปล่อยว่างถ้าไม่มี"
                value={form.o_course_netprice ?? ""}
                onChange={(e) => set("o_course_netprice", e.target.value)}
              />
            </div>

            {/* Sort order */}
            <div className="col-span-3">
              <FieldLabel>ลำดับการแสดงผล (Sort Order)</FieldLabel>
              <input
                type="number"
                className="input"
                value={form.sort_order}
                onChange={(e) => set("sort_order", e.target.value)}
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Flags */}
      <Section title="รูปแบบคอร์ส (Online)">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <label className="chk">
            <input
              type="checkbox"
              checked={!!form.o_course_workshop_status}
              onChange={(e) =>
                set("o_course_workshop_status", e.target.checked)
              }
            />{" "}
            Workshop
          </label>
          <label className="chk">
            <input
              type="checkbox"
              checked={!!form.o_course_certificate_status}
              onChange={(e) =>
                set("o_course_certificate_status", e.target.checked)
              }
            />{" "}
            Certificate
          </label>
          <label className="chk lg:col-span-2">
            <input
              type="checkbox"
              checked={!!form.o_course_promote_status}
              onChange={(e) => set("o_course_promote_status", e.target.checked)}
            />{" "}
            Promote
          </label>
        </div>
      </Section>

      {/* Program & Skills */}
      <Section
        title="หมวดโปรแกรม & สกิล"
        desc="เลือก Program หลัก 1 รายการ และเลือก Skill ได้หลายรายการ"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <FieldLabel>Program</FieldLabel>
            <select
              className="input"
              value={form.program}
              onChange={(e) => set("program", e.target.value)}
            >
              <option value="">-- Select Program --</option>
              {programs.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.program_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>Skills (เลือกได้หลายอัน)</FieldLabel>
            <select
              multiple
              className="input h-32 lg:h-44"
              value={form.skills}
              onChange={(e) =>
                set(
                  "skills",
                  Array.from(e.target.selectedOptions, (o) => o.value)
                )
              }
            >
              {skills.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.skill_name}
                </option>
              ))}
            </select>
            <div className="mt-2 flex flex-wrap gap-2">
              {form.skills.map((id) => {
                const s = skills.find((x) => x._id === id);
                if (!s) return null;
                return (
                  <span
                    key={id}
                    className="text-xs px-2 py-1 rounded-full bg-white/10 ring-1 ring-white/10"
                  >
                    {s.skill_name}
                  </span>
                );
              })}
              {!form.skills.length && (
                <span className="text-xs text-slate-400">ยังไม่ได้เลือก</span>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Course Details (bullets) */}
      <Section
        title="รายละเอียดคอร์ส"
        desc="ใส่รายการเป็นบรรทัด ๆ ระบบจะเก็บเป็นอาเรย์และไปเรนเดอร์เป็น bullet list ให้"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <FieldLabel>
              Objectives{" "}
              <span className="text-xs text-slate-400">({counts.obj} ข้อ)</span>
            </FieldLabel>
            <textarea
              className="textarea min-h-[120px]"
              placeholder="ใส่ทีละบรรทัด"
              value={form.o_course_objectives}
              onChange={(e) => set("o_course_objectives", e.target.value)}
            />
            <BulletHint title="Objectives" />
          </div>
          <div>
            <FieldLabel>
              Target Audience{" "}
              <span className="text-xs text-slate-400">({counts.aud} ข้อ)</span>
            </FieldLabel>
            <textarea
              className="textarea min-h-[120px]"
              placeholder="ใส่ทีละบรรทัด"
              value={form.o_course_target_audience}
              onChange={(e) => set("o_course_target_audience", e.target.value)}
            />
            <BulletHint title="Target Audience" />
          </div>
          <div>
            <FieldLabel>
              Prerequisites{" "}
              <span className="text-xs text-slate-400">({counts.pre} ข้อ)</span>
            </FieldLabel>
            <textarea
              className="textarea min-h-[120px]"
              placeholder="ใส่ทีละบรรทัด"
              value={form.o_course_prerequisites}
              onChange={(e) => set("o_course_prerequisites", e.target.value)}
            />
            <BulletHint title="Prerequisites" />
          </div>
          <div>
            <FieldLabel>
              System Requirements{" "}
              <span className="text-xs text-slate-400">({counts.sys} ข้อ)</span>
            </FieldLabel>
            <textarea
              className="textarea min-h-[120px]"
              placeholder="ใส่ทีละบรรทัด"
              value={form.o_course_system_requirements}
              onChange={(e) =>
                set("o_course_system_requirements", e.target.value)
              }
            />
            <BulletHint title="System Requirements" />
          </div>
          <div className="lg:col-span-2">
            <FieldLabel>
              Training Topics{" "}
              <span className="text-xs text-slate-400">({counts.top} ข้อ)</span>
            </FieldLabel>
            <textarea
              className="textarea min-h-[120px]"
              placeholder="ใส่ทีละบรรทัด"
              value={form.o_course_training_topics}
              onChange={(e) => set("o_course_training_topics", e.target.value)}
            />
            <BulletHint title="Training Topics" />
          </div>
        </div>
      </Section>

      {/* URL Paths */}
      <Section
        title="ลิงก์ประกอบคอร์ส"
        desc="ใส่ URL ต่อบรรทัด (1 บรรทัด = 1 URL)"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div>
            <FieldLabel>
              Doc Paths{" "}
              <span className="text-xs text-slate-400">({counts.doc})</span>
            </FieldLabel>
            <textarea
              className="textarea min-h-[120px]"
              placeholder="https://.../doc1.pdf\nhttps://.../doc2.pdf"
              value={form.o_course_doc_paths}
              onChange={(e) => set("o_course_doc_paths", e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>
              Lab Paths{" "}
              <span className="text-xs text-slate-400">({counts.lab})</span>
            </FieldLabel>
            <textarea
              className="textarea min-h-[120px]"
              placeholder="https://.../lab1.zip\nhttps://.../lab2.zip"
              value={form.o_course_lab_paths}
              onChange={(e) => set("o_course_lab_paths", e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>
              Case Study Paths{" "}
              <span className="text-xs text-slate-400">({counts.cs})</span>
            </FieldLabel>
            <textarea
              className="textarea min-h-[120px]"
              placeholder="https://.../case1\nhttps://.../case2"
              value={form.o_course_case_study_paths}
              onChange={(e) => set("o_course_case_study_paths", e.target.value)}
            />
          </div>
        </div>
      </Section>

      {/* sticky footer inside modal */}
      <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur border-t border-white/10 -mx-4 px-4 py-3 flex justify-end">
        <button
          disabled={saving}
          className="rounded-xl px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox("")}
        >
          <img
            src={lightbox}
            alt="preview"
            className="max-h-[90vh] max-w-[95vw] rounded-xl ring-1 ring-white/10"
          />
        </div>
      )}

      {/* local styles (tailwind-less helpers) */}
      <style jsx>{`
        .input {
          width: 100%;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 0.75rem;
          padding: 0.625rem 0.75rem;
        }
        .textarea {
          width: 100%;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 0.75rem;
          padding: 0.625rem 0.75rem;
        }
        .chk {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 0.75rem;
          padding: 0.5rem 0.75rem;
        }
        .btn-step {
          width: 2.25rem;
          height: 2.25rem;
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.08);
        }
      `}</style>
    </form>
  );
}
