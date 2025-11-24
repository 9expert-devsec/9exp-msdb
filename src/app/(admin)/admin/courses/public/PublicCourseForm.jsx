"use client";

import { useEffect, useState } from "react";

/* ---------- constants ---------- */
const LEVELS = [
  { value: "1", label: "1 (Beginner)" },
  { value: "2", label: "2 (Intermediate)" },
  { value: "3", label: "3 (Advanced)" },
  { value: "4", label: "4 (Expert)" },
];

const DEFAULT = {
  course_id: "",
  course_name: "",
  course_teaser: "",
  course_trainingdays: 0,
  course_traininghours: 0,
  course_price: 0,
  course_netprice: null,
  course_cover_url: "",
  course_levels: "1",
  course_type_public: true,
  course_type_inhouse: false,
  course_workshop_status: false,
  course_certificate_status: false,
  course_promote_status: false,
  sort_order: 0,

  program: "",
  skills: [],

  course_objectives: "",
  course_target_audience: "",
  course_prerequisites: "",
  course_system_requirements: "",

  // topics แบบ object (รองรับหัวข้อย่อย)
  training_topics: [], // [{ title:'หัวข้อ', bullets:['ย่อย1','ย่อย2'] }]

  // paths/URLs (เก็บเป็น array ของ string)
  course_doc_paths: [],
  course_lab_paths: [],
  course_case_study_paths: [],
  website_urls: [],
  exam_links: [],

  previous_course: "",
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
    • {title}: <b>1 บรรทัด = 1 bullet</b> (กด Enter เพื่อขึ้นบรรทัดใหม่)
  </div>
);

/* ---------- editor: training topics (with sub-bullets) ---------- */
function TopicsEditor({ value = [], onChange }) {
  const addTopic = () =>
    onChange([...(value || []), { title: "", bullets: [] }]);

  const removeTopic = (idx) => {
    const a = [...value];
    a.splice(idx, 1);
    onChange(a);
  };

  const setTopicTitle = (idx, t) => {
    const a = [...value];
    a[idx] = { ...(a[idx] || {}), title: t };
    onChange(a);
  };

  // ❗ ไม่ filter ตอนพิมพ์ เพื่อให้ Enter แล้วขึ้นบรรทัดใหม่ได้
  const setTopicBullets = (idx, text) => {
    const bullets = (text || "").split("\n").map((s) => s); // keep raw
    const a = [...value];
    a[idx] = { ...(a[idx] || {}), bullets };
    onChange(a);
  };

  return (
    <div className="space-y-3">
      {(value || []).map((t, i) => (
        <div
          key={i}
          className="rounded-lg bg-white/5 ring-1 ring-white/10 p-3 space-y-2"
        >
          <div className="flex items-center gap-2">
            <FieldLabel>หัวข้อที่ {i + 1}</FieldLabel>
            <button
              type="button"
              className="ml-auto text-xs px-2 py-1 rounded bg-red-500/80 hover:bg-red-500"
              onClick={() => removeTopic(i)}
            >
              ลบหัวข้อนี้
            </button>
          </div>
          <input
            className="input"
            placeholder="Topic title..."
            value={t?.title || ""}
            onChange={(e) => setTopicTitle(i, e.target.value)}
          />
          <div>
            <FieldLabel hint="1 บรรทัด = 1 ย่อย">หัวข้อย่อย</FieldLabel>
            <textarea
              className="textarea min-h-[100px]"
              placeholder="ใส่เป็นบรรทัดละ 1 ย่อย"
              value={(t?.bullets || []).join("\n")}
              onChange={(e) => setTopicBullets(i, e.target.value)}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        className="rounded-lg px-3 py-2 bg-white/10 hover:bg-white/20"
        onClick={addTopic}
      >
        + เพิ่มหัวข้อ
      </button>
    </div>
  );
}

/* ---------- main ---------- */
export default function PublicCourseForm({ item = {}, onSaved }) {
  const [programs, setPrograms] = useState([]);
  const [skills, setSkills] = useState([]);
  const [allCourses, setAllCourses] = useState([]);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(DEFAULT);

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const parseLines = (text) =>
    (text || "")
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);

  /* ---------- load options ---------- */
  useEffect(() => {
    (async () => {
      const [pg, sk, co] = await Promise.all([
        fetch("/api/programs").then((r) => r.json()),
        fetch("/api/skills").then((r) => r.json()),
        fetch("/api/public-courses?limit=1000").then((r) => r.json()),
      ]);
      setPrograms(pg.items || []);
      setSkills(sk.items || []);
      setAllCourses((co.items || []).filter((c) => c._id !== item?._id));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?._id]);

  /* ---------- load item ---------- */
  useEffect(() => {
    const toText = (arr) =>
      Array.isArray(arr) && arr.length ? arr.join("\n") : "";
    setForm({
      ...DEFAULT,
      ...item,
      course_levels: item.course_levels || "1",

      course_objectives: toText(item.course_objectives),
      course_target_audience: toText(item.course_target_audience),
      course_prerequisites: toText(item.course_prerequisites),
      course_system_requirements: toText(item.course_system_requirements),

      training_topics: Array.isArray(item.training_topics)
        ? item.training_topics.map((t) =>
            typeof t === "string"
              ? { title: t, bullets: [] }
              : {
                  title: t.title || "",
                  bullets: Array.isArray(t.bullets) ? t.bullets : [],
                }
          )
        : [],

      course_doc_paths: item.course_doc_paths || [],
      course_lab_paths: item.course_lab_paths || [],
      course_case_study_paths: item.course_case_study_paths || [],
      website_urls: item.website_urls || [],
      exam_links: item.exam_links || [],

      program: item?.program?._id || item?.program || "",
      skills: Array.isArray(item?.skills)
        ? item.skills.map((s) => s._id || s)
        : [],
      previous_course:
        item?.previous_course?._id ||
        (typeof item?.previous_course === "string" ? item.previous_course : ""),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  /* ---------- textarea (array) helper ---------- */
  const ArrayTextarea = ({ label, value, onChange, hint, placeholder }) => {
    // เก็บข้อความดิบใน state ภายใน ปลอดภัยกับ IME/ภาษาไทย
    const [text, setText] = useState((value || []).join("\n"));

    // ซิงค์เมื่อค่า value ภายนอกเปลี่ยน (เช่นตอนเปิดฟอร์ม/โหลดข้อมูล)
    useEffect(() => {
      setText((value || []).join("\n"));
    }, [value]);

    // แปลงเป็นอาเรย์เฉพาะตอน blur (ลด re-render ที่ทำให้หลุดโฟกัส)
    const commit = () => {
      const parsed = (text || "").split("\n"); // ไม่ trim ที่นี่ ปล่อยให้ไป clean ตอน submit
      onChange(parsed);
    };

    const liveCount = (text || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean).length;

    return (
      <div>
        <FieldLabel hint={hint}>{label}</FieldLabel>
        <textarea
          className="w-full min-h-[120px] rounded-xl bg-white/5 border border-white/10 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400/60"
          placeholder={placeholder || "https://... (1 บรรทัด = 1 ลิงก์)"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
        />
        <div className="text-xs text-slate-400 mt-1">
          รวม {liveCount} ลิงก์ (ก๊อป/วาง ได้ทีละหลายบรรทัด)
        </div>
      </div>
    );
  };

  /* ---------- upload ---------- */
  const onUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "courses/covers");
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      set("course_cover_url", data.url);
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
      const cleanArray = (arr) =>
        (arr || []).map((s) => (s || "").trim()).filter(Boolean);

      const payload = {
        ...form,
        course_trainingdays: +form.course_trainingdays || 0,
        course_traininghours: +form.course_traininghours || 0,
        course_price: form.course_price === "" ? 0 : +form.course_price,
        course_netprice:
          form.course_netprice === "" || form.course_netprice == null
            ? null
            : +form.course_netprice,
        sort_order: +form.sort_order || 0,

        // plain bullets
        course_objectives: parseLines(form.course_objectives),
        course_target_audience: parseLines(form.course_target_audience),
        course_prerequisites: parseLines(form.course_prerequisites),
        course_system_requirements: parseLines(form.course_system_requirements),

        // topics — clean ช่องว่างที่ submit
        training_topics: (form.training_topics || []).map((t) => ({
          title: (t.title || "").trim(),
          bullets: (t.bullets || [])
            .map((b) => (b || "").trim())
            .filter(Boolean),
        })),

        // URLs — clean ช่องว่างที่ submit
        course_doc_paths: cleanArray(form.course_doc_paths),
        course_lab_paths: cleanArray(form.course_lab_paths),
        course_case_study_paths: cleanArray(form.course_case_study_paths),
        website_urls: cleanArray(form.website_urls),
        exam_links: cleanArray(form.exam_links),

        // relations
        program: form.program || null,
        skills: form.skills || [],
        previous_course: form.previous_course || null,
      };

      const method = item && item._id ? "PATCH" : "POST";
      const url =
        item && item._id
          ? `/api/admin/public-courses/${item._id}`
          : `/api/admin/public-courses`;

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
        title="ข้อมูลหลัก"
        desc="ระบุรหัสและชื่อคอร์ส พร้อมคำโปรย (Teaser)"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <FieldLabel>Course ID</FieldLabel>
            <input
              className="input"
              placeholder="เช่น MSE-L1"
              value={form.course_id}
              onChange={(e) => set("course_id", e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Course Name</FieldLabel>
            <input
              className="input"
              placeholder="เช่น Microsoft Excel Intermediate"
              value={form.course_name}
              onChange={(e) => set("course_name", e.target.value)}
            />
          </div>
          <div className="lg:col-span-2">
            <FieldLabel>Teaser</FieldLabel>
            <textarea
              className="textarea min-h-[96px]"
              placeholder="คำโปรยสั้นๆ ของคอร์ส"
              value={form.course_teaser}
              onChange={(e) => set("course_teaser", e.target.value)}
            />
          </div>
        </div>
      </Section>

      {/* Cover & Schedule & Level & Price & Sort & Previous */}
      <Section title="สื่อ เวลา ราคา & ลำดับแสดงผล">
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
                {form.course_cover_url ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
              </label>
              {form.course_cover_url && (
                <>
                  <img
                    src={form.course_cover_url}
                    alt="cover"
                    className="h-12 w-20 rounded-md object-cover ring-1 ring-white/15"
                  />
                  <button
                    type="button"
                    onClick={() => set("course_cover_url", "")}
                    className="text-sm px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
                  >
                    ลบรูป
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(
                        form.course_cover_url || ""
                      );
                      alert("Copied!");
                    }}
                    className="text-sm px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
                  >
                    Copy Cover URL
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Days/Hours/Level/Price/Net/Sort/Previous */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <FieldLabel>Days</FieldLabel>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "course_trainingdays",
                      Math.max(0, (+form.course_trainingdays || 0) - 1)
                    )
                  }
                  className="btn-step"
                >
                  −
                </button>
                <input
                  type="number"
                  className="input text-center"
                  value={form.course_trainingdays}
                  onChange={(e) => set("course_trainingdays", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "course_trainingdays",
                      (+form.course_trainingdays || 0) + 1
                    )
                  }
                  className="btn-step"
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <FieldLabel>Hours</FieldLabel>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "course_traininghours",
                      Math.max(0, (+form.course_traininghours || 0) - 1)
                    )
                  }
                  className="btn-step"
                >
                  −
                </button>
                <input
                  type="number"
                  className="input text-center"
                  value={form.course_traininghours}
                  onChange={(e) => set("course_traininghours", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "course_traininghours",
                      (+form.course_traininghours || 0) + 1
                    )
                  }
                  className="btn-step"
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <FieldLabel>Level</FieldLabel>
              <select
                className="input"
                value={form.course_levels}
                onChange={(e) => set("course_levels", e.target.value)}
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-3">
              <FieldLabel>Price</FieldLabel>
              <input
                type="number"
                className="input"
                placeholder="เช่น 7900"
                value={form.course_price}
                onChange={(e) => set("course_price", e.target.value)}
              />
            </div>
            <div className="col-span-3">
              <FieldLabel>Net Price (nullable)</FieldLabel>
              <input
                type="number"
                className="input"
                placeholder="ปล่อยว่างถ้าไม่มี"
                value={form.course_netprice ?? ""}
                onChange={(e) => set("course_netprice", e.target.value)}
              />
            </div>
            <div className="col-span-3">
              <FieldLabel>แสดงเป็นลำดับที่ (sort order)</FieldLabel>
              <input
                type="number"
                className="input"
                value={form.sort_order}
                onChange={(e) => set("sort_order", e.target.value)}
              />
            </div>
            <div className="col-span-3">
              <FieldLabel>คอร์สก่อนหน้า (เลือก 1 รายการ)</FieldLabel>
              <select
                className="input"
                value={form.previous_course || ""}
                onChange={(e) => set("previous_course", e.target.value)}
              >
                <option value="">— ไม่ระบุ —</option>
                {(allCourses || []).map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.course_name} ({c.course_id})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Section>

      {/* Flags */}
      <Section title="รูปแบบคอร์ส">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <label className="chk">
            <input
              type="checkbox"
              checked={!!form.course_type_public}
              onChange={(e) => set("course_type_public", e.target.checked)}
            />{" "}
            Public
          </label>
          <label className="chk">
            <input
              type="checkbox"
              checked={!!form.course_type_inhouse}
              onChange={(e) => set("course_type_inhouse", e.target.checked)}
            />{" "}
            In-house
          </label>
          <label className="chk">
            <input
              type="checkbox"
              checked={!!form.course_workshop_status}
              onChange={(e) => set("course_workshop_status", e.target.checked)}
            />{" "}
            Workshop
          </label>
          <label className="chk">
            <input
              type="checkbox"
              checked={!!form.course_certificate_status}
              onChange={(e) =>
                set("course_certificate_status", e.target.checked)
              }
            />{" "}
            Certificate
          </label>
          <label className="chk lg:col-span-4">
            <input
              type="checkbox"
              checked={!!form.course_promote_status}
              onChange={(e) => set("course_promote_status", e.target.checked)}
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
            <div className="flex items-center gap-2">
              <select
                className="input flex-1"
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
              {(() => {
                const p = programs.find((x) => x._id === form.program);
                return (
                  <span
                    className="inline-block size-4 rounded-full ring-1 ring-white/15"
                    style={{ background: p?.programcolor || "#64748b" }}
                  />
                );
              })()}
            </div>
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

      {/* Bullets (plain) */}
      <Section
        title="รายละเอียดคอร์ส (หัวข้อหลัก)"
        desc="ใส่รายการเป็นบรรทัด ๆ ระบบจะเก็บเป็นอาเรย์และไปเรนเดอร์เป็น bullet list ให้"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <FieldLabel>Objectives</FieldLabel>
            <textarea
              className="textarea min-h-[120px]"
              placeholder="ใส่ทีละบรรทัด"
              value={form.course_objectives}
              onChange={(e) => set("course_objectives", e.target.value)}
            />
            <BulletHint title="Objectives" />
          </div>
          <div>
            <FieldLabel>Target Audience</FieldLabel>
            <textarea
              className="textarea min-h-[120px]"
              placeholder="ใส่ทีละบรรทัด"
              value={form.course_target_audience}
              onChange={(e) => set("course_target_audience", e.target.value)}
            />
            <BulletHint title="Target Audience" />
          </div>
          <div>
            <FieldLabel>Prerequisites</FieldLabel>
            <textarea
              className="textarea min-h-[120px]"
              placeholder="ใส่ทีละบรรทัด"
              value={form.course_prerequisites}
              onChange={(e) => set("course_prerequisites", e.target.value)}
            />
            <BulletHint title="Prerequisites" />
          </div>
          <div>
            <FieldLabel>System Requirements</FieldLabel>
            <textarea
              className="textarea min-h-[120px]"
              placeholder="ใส่ทีละบรรทัด"
              value={form.course_system_requirements}
              onChange={(e) =>
                set("course_system_requirements", e.target.value)
              }
            />
            <BulletHint title="System Requirements" />
          </div>
        </div>
      </Section>

      {/* Training topics with sub-bullets */}
      <Section
        title="Training Topics (หัวข้อ + หัวย่อย)"
        desc="เพิ่มหัวข้อและระบุหัวข้อย่อยของแต่ละหัวข้อ (สำหรับใช้เรนเดอร์เป็น bullet list แบบซ้อน)"
      >
        <TopicsEditor
          value={form.training_topics || []}
          onChange={(v) => set("training_topics", v)}
        />
      </Section>

      {/* URLs / Paths */}
      <Section title="เอกสาร/ลิงก์ประกอบ (URL)">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <ArrayTextarea
            label="Doc Paths"
            value={form.course_doc_paths}
            onChange={(v) => set("course_doc_paths", v)}
          />
          <ArrayTextarea
            label="Lab Paths"
            value={form.course_lab_paths}
            onChange={(v) => set("course_lab_paths", v)}
          />
          <ArrayTextarea
            label="Case Study Paths"
            value={form.course_case_study_paths}
            onChange={(v) => set("course_case_study_paths", v)}
          />
          <ArrayTextarea
            label="Website URLs"
            value={form.website_urls}
            onChange={(v) => set("website_urls", v)}
          />
          <ArrayTextarea
            label="Exam Links"
            value={form.exam_links}
            onChange={(v) => set("exam_links", v)}
          />
        </div>
      </Section>

      {/* sticky footer */}
      <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur border-t border-white/10 -mx-4 px-4 py-3 flex justify-end">
        <button
          disabled={saving}
          className="rounded-xl px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* local styles */}
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
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 0.75rem;
          padding: 0.625rem 0.75rem;
          color: #e5e7eb;
          outline: none;
          transition: box-shadow 120ms, border-color 120ms;
        }
        .textarea:focus {
          border-color: rgba(16, 185, 129, 0.55);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
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
