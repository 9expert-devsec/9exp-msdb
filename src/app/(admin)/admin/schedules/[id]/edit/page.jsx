// src/app/(admin)/admin/schedules/[id]/edit/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

/* ================= helpers ================= */

const TH_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toYMD(input) {
  // input can be Date or string
  const d = input instanceof Date ? input : new Date(String(input));
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  // dates are stored as UTC midnight already -> safe to slice
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function monthLabel(year, monthIndex) {
  return `${TH_MONTHS[monthIndex]} ${year + 543}`;
}

function daysInMonth(year, monthIndex) {
  // use UTC to avoid TZ shift
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function firstDowOfMonth(year, monthIndex) {
  // 0=Sun..6=Sat (UTC)
  return new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
}

function addMonths(date, delta) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d;
}

function sortYmd(arr) {
  return [...arr].filter(Boolean).sort((a, b) => a.localeCompare(b));
}

/* ================= Calendar Components ================= */

function CalendarMonth({ year, monthIndex, selectedSet, onToggle }) {
  const totalDays = daysInMonth(year, monthIndex);
  const firstDow = firstDowOfMonth(year, monthIndex);

  const blanks = Array.from({ length: firstDow }, (_, i) => `b${i}`);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/25 p-4">
      <div className="text-center text-sm font-semibold text-white/85">
        {monthLabel(year, monthIndex)}
      </div>

      {/* grid days */}
      <div className="mt-3 grid grid-cols-7 gap-2">
        {blanks.map((k) => (
          <div key={k} className="h-9" />
        ))}

        {days.map((day) => {
          const ymd = `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
          const isSel = selectedSet.has(ymd);

          return (
            <button
              key={ymd}
              type="button"
              onClick={() => onToggle(ymd)}
              className={cx(
                "h-9 rounded-lg text-sm transition select-none",
                isSel
                  ? "bg-emerald-500 text-white border border-emerald-300 ring-2 ring-emerald-200/70 shadow"
                  : "border border-white/10 bg-white/0 text-white/80 hover:bg-white/5",
              )}
              aria-pressed={isSel}
              title={ymd}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MultiMonthCalendar({ value, onChange, anchorYmd }) {
  const normalizedValue = useMemo(() => {
    return (Array.isArray(value) ? value : [])
      .map((v) => {
        if (typeof v === "string") return v.slice(0, 10); // ✅ เอาแค่ YYYY-MM-DD
        return toYMD(v);
      })
      .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));
  }, [value]);

  const selectedSet = useMemo(
    () => new Set(normalizedValue),
    [normalizedValue],
  );

  const anchorDate = useMemo(() => {
    const ymd = anchorYmd || (value && value[0]) || "";
    if (ymd && /^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      const [y, m] = ymd.split("-").map((x) => Number(x));
      return new Date(Date.UTC(y, (m || 1) - 1, 1));
    }
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }, [anchorYmd, value]);

  const months = useMemo(() => {
    // แสดง 6 เดือน เริ่มจากเดือน anchor
    const arr = [];
    for (let i = 0; i < 6; i++) {
      const d = addMonths(anchorDate, i);
      arr.push({ year: d.getUTCFullYear(), monthIndex: d.getUTCMonth() });
    }
    return arr;
  }, [anchorDate]);

  function toggle(ymd) {
    const next = new Set(selectedSet);
    if (next.has(ymd)) next.delete(ymd);
    else next.add(ymd);
    onChange(sortYmd(Array.from(next)));
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
      <div className="text-sm font-medium text-white/80">
        Date(s): <span className="text-white/50">คลิกเลือกได้หลายวัน</span>
      </div>

      <div className="mt-3 max-h-[560px] space-y-4 overflow-auto pr-2">
        {months.map((m) => (
          <CalendarMonth
            key={`${m.year}-${m.monthIndex}`}
            year={m.year}
            monthIndex={m.monthIndex}
            selectedSet={selectedSet}
            onToggle={toggle}
          />
        ))}
      </div>
    </div>
  );
}

/* ================= Page ================= */

export default function EditSchedulePage() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState(null);

  // ค่าที่จะแก้
  const [status, setStatus] = useState("open");
  const [type, setType] = useState("classroom");
  const [dates, setDates] = useState([]); // "YYYY-MM-DD"
  const [signupUrl, setSignupUrl] = useState("");

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    (async () => {
      try {
        const r = await fetch(`/api/admin/schedules/${id}`, {
          cache: "no-store",
        });
        const j = await r.json();

        if (cancelled) return;

        const it = j?.item || null;
        setItem(it);

        setStatus(it?.status || "open");
        setType(it?.type || "classroom");
        setSignupUrl(it?.signup_url || "");

        // ✅ สำคัญ: เก็บเป็น "YYYY-MM-DD" เพื่อให้ calendar toggle ตรง
        const ymds = (it?.dates || []).map(toYMD).filter(Boolean);
        setDates(sortYmd(ymds));

        setLoading(false);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setLoading(false);
          alert("โหลดข้อมูลรอบอบรมไม่สำเร็จ");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function onSave() {
    if (!dates.length) {
      alert("กรุณาเลือกวันอบรมอย่างน้อย 1 วัน");
      return;
    }

    const r = await fetch(`/api/admin/schedules/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status,
        type,
        signup_url: signupUrl || "",
        dates, // ✅ ส่ง "YYYY-MM-DD" ไปเลย API จะ normalize ให้
      }),
    });

    if (r.ok) {
      alert("อัปเดตรอบอบรมแล้ว");
      window.location.href = "/admin/schedules";
    } else {
      alert(await r.text());
    }
  }

  if (loading) return <div className="p-6 text-white/70">Loading…</div>;
  if (!item) return <div className="p-6 text-white/70">Not found</div>;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold text-white">Edit Schedule</h1>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* LEFT: form */}
        <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-5">
          <div className="text-white/85 mb-4">
            <div>
              คอร์ส: <b>{item?.course?.course_id}</b> —{" "}
              {item?.course?.course_name}
            </div>
          </div>

          {/* status / type */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-sm text-white/70 mb-1">Status</div>
              <select
                className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="open">เปิดรับสมัคร</option>
                <option value="nearly_full">ใกล้เต็ม</option>
                <option value="full">เต็ม</option>
              </select>
            </div>

            <div>
              <div className="text-sm text-white/70 mb-1">ประเภทการอบรม</div>
              <div className="flex gap-3">
                <button
                  type="button"
                  className={cx(
                    "flex-1 rounded-xl border px-3 py-2 text-sm",
                    type === "classroom"
                      ? "border-sky-400/70 text-sky-200"
                      : "border-white/10 text-white/60 hover:text-white/80",
                  )}
                  onClick={() => setType("classroom")}
                >
                  ● Classroom
                </button>
                <button
                  type="button"
                  className={cx(
                    "flex-1 rounded-xl border px-3 py-2 text-sm",
                    type === "hybrid"
                      ? "border-fuchsia-400/70 text-fuchsia-200"
                      : "border-white/10 text-white/60 hover:text-white/80",
                  )}
                  onClick={() => setType("hybrid")}
                >
                  ● Hybrid
                </button>
              </div>
            </div>
          </div>

          {/* signup url */}
          <div className="mt-4">
            <div className="text-sm text-white/70 mb-1">
              ลิงก์หน้าสมัคร (ถ้ามี)
            </div>
            <input
              className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
              placeholder="https://..."
              value={signupUrl}
              onChange={(e) => setSignupUrl(e.target.value)}
            />
          </div>

          {/* summary */}
          <div className="mt-4 text-sm text-white/70">
            รวม{" "}
            <span className="text-white/90 font-semibold">{dates.length}</span>{" "}
            วันอบรม
          </div>

          <div className="mt-5">
            <button
              onClick={onSave}
              className="rounded-xl bg-emerald-500 px-5 py-2.5 text-white hover:bg-emerald-600"
            >
              Save
            </button>
          </div>
        </div>

        {/* RIGHT: calendar */}
        <MultiMonthCalendar
          value={dates}
          onChange={setDates}
          anchorYmd={dates?.[0] || ""}
        />
      </div>
    </div>
  );
}
