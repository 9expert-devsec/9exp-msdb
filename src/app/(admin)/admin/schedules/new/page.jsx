"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

/* ตัวเลือกคงที่ */
const STATUS_OPTS = [
  { value: "open",        label: "เปิดรับสมัคร" },
  { value: "nearly_full", label: "ใกล้เต็ม" },
  { value: "full",        label: "เต็ม" },
];

const TYPE_OPTS = [
  { value: "classroom", label: "Classroom", dot: "bg-sky-500" },
  { value: "hybrid",    label: "Hybrid",    dot: "bg-fuchsia-500" },
];

/* ปฏิทินช่วย (ตัวอย่างเดิมของคุณ) */
function startOfMonth(d = new Date()) { const x = new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; }
function addMonths(d, n) { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }

export default function NewSchedulePage() {
  const searchParams = useSearchParams();
  const defaultCourseId = searchParams.get("course") || "";
  const [courseId, setCourseId] = useState(defaultCourseId);
  const [courses, setCourses] = useState([]);
  const [status, setStatus] = useState("open");
  const [type, setType] = useState("classroom");            // 🆕
  const [signupUrl, setSignupUrl] = useState("");           // 🆕
  const [dates, setDates] = useState([]); // Array<Date>

  /* โหลดคอร์ส public */
  useEffect(() => {
    (async () => {
      const r = await fetch("/api/public-courses?fields=_id,course_id,course_name&limit=1000");
      const j = await r.json();
      setCourses(j.items || []);
      // ถ้า param มี และยังไม่ตั้งค่า ให้ตั้งเลย
      if (defaultCourseId && !courseId) setCourseId(defaultCourseId);
    })();
  }, [defaultCourseId, courseId]);

  /* แปลงเก็บวันที่เป็น ISO */
  const isoDates = useMemo(() => dates.map(d => new Date(d).toISOString()), [dates]);

  async function handleSave() {
    if (!courseId) return alert("กรุณาเลือกคอร์ส");
    if (isoDates.length === 0) return alert("กรุณาเลือกวันที่อบรมอย่างน้อย 1 วัน");

    const r = await fetch("/api/admin/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        course: courseId,
        dates: isoDates,
        status,
        type,                 // 🆕 ส่งประเภท
        signup_url: signupUrl // 🆕 ส่งลิงก์สมัคร
      }),
    });

    const j = await r.json();
    if (!r.ok || !j.ok) return alert(j.error || "Create failed");
    alert("สร้างรอบอบรมสำเร็จ");
    window.location.href = "/admin/schedules";
  }

  /* ---------------- Render ---------------- */
  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-bold mb-6">Add Schedule</h1>

      <div className="grid lg:grid-cols-[1fr_520px] gap-6">
        {/* ซ้าย: ฟอร์ม */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">Public Course</label>
            <select
              className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">— เลือกคอร์ส —</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.course_id} — {c.course_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* 🆕 ประเภทการอบรม */}
          <div>
            <label className="block text-sm font-medium mb-1">ประเภทการอบรม</label>
            <div className="flex gap-3">
              {TYPE_OPTS.map(o => (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => setType(o.value)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                    type === o.value ? "border-sky-400/60 bg-sky-400/10" : "border-white/10 bg-slate-900/40"
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${o.dot}`} />
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* 🆕 ลิงก์สมัคร */}
          <div>
            <label className="block text-sm font-medium mb-1">ลิงก์หน้าสมัคร (ถ้ามี)</label>
            <input
              type="url"
              placeholder="https://example.com/registration/..."
              value={signupUrl}
              onChange={(e) => setSignupUrl(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2"
            />
            <p className="text-xs text-slate-400 mt-1">ใช้เปิดแท็บใหม่เมื่อคลิกวันที่บนตาราง</p>
          </div>

          <div className="pt-2">
            <div className="text-sm opacity-70 mb-2">รวม {dates.length} วันอบรม</div>
            <button
              onClick={handleSave}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 font-medium"
            >
              Save
            </button>
          </div>
        </div>

        {/* ขวา: ปฏิทินเลือกหลายวัน (คงโค้ดเดิมของคุณได้) */}
        <CalendarPanel dates={dates} setDates={setDates} />
      </div>
    </div>
  );
}

/* ====== ตัวอย่าง Panel ปฏิทินเลือกหลายวันแบบง่าย ====== */
function CalendarPanel({ dates, setDates }) {
  const start = startOfMonth(new Date());
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => addMonths(start, i)), [start]);
  const setToggle = (d) => {
    const key = new Date(d).toDateString();
    const has = dates.some(x => new Date(x).toDateString() === key);
    if (has) setDates(dates.filter(x => new Date(x).toDateString() !== key));
    else setDates([...dates, d]);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/30 p-4">
      <div className="text-sm mb-3 opacity-80">Date(s): คลิกเลือกได้หลายวัน</div>
      <div className="space-y-6 max-h-[70vh] overflow-auto pr-2">
        {months.map(m => (
          <Month key={m.toISOString()} month={m} value={dates} onToggle={setToggle} />
        ))}
      </div>
    </div>
  );
}

/* …(คอมโพเนนท์ Month / Day ตามที่คุณมีอยู่เดิม)… */
/* ===== เพิ่มไว้ท้ายไฟล์ page.jsx ===== */
function Month({ month, value = [], onToggle }) {
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const monthName = month.toLocaleString("th-TH", { month: "long", year: "numeric" });

  return (
    <div className="rounded-lg border border-white/10 p-3">
      <div className="mb-2 text-center font-medium text-slate-200">{monthName}</div>
      <div className="grid grid-cols-7 gap-1 text-center text-[13px]">
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = new Date(month.getFullYear(), month.getMonth(), i + 1);
          const key = day.toDateString();
          const selected = value.some((d) => new Date(d).toDateString() === key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(day)}
              className={`rounded-md py-1 transition ${
                selected
                  ? "bg-emerald-500/80 text-white"
                  : "bg-transparent text-slate-300 hover:bg-slate-700/50"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

