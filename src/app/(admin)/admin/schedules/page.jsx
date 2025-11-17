"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

/* ---------------- helpers ---------------- */
function startOfMonth(d = new Date()) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addMonths(d, n) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}
function monthLabel(d) {
  const m = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  return { top: m, bottom: String(d.getFullYear()) };
}
function toRanges(dates) {
  if (!dates?.length) return [];
  const sorted = [...dates].sort((a, b) => a - b);
  const out = [];
  let start = sorted[0],
    prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const next = new Date(prev);
    next.setDate(prev.getDate() + 1);
    if (cur.toDateString() !== next.toDateString()) {
      out.push([start, prev]);
      start = cur;
    }
    prev = cur;
  }
  out.push([start, prev]);
  return out;
}

/* ---------------- layout constants ---------------- */
const LEFT = { code: 112, name: 420, days: 64, price: 96 };
const LEFT_TOTAL = LEFT.code + LEFT.name + LEFT.days + LEFT.price;
const MONTH_W = 140; // กว้างต่อเดือน
const VISIBLE_MONTHS = 5; // แสดงครั้งละ 5 เดือน
const SCROLL_WIDTH = VISIBLE_MONTHS * MONTH_W;

/* ---------------- page ---------------- */
export default function AdminSchedulesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/schedules?months=12`, { cache: "no-store" });
    const j = await r.json();
    setItems(j.items || []);
    setLoading(false);
  }

  // แทนบล็อกโหลดเดิม
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`/api/schedules?months=12`, {
          cache: "no-store",
        });
        if (!r.ok) {
          // อ่านเป็น text เพื่อเห็นรายละเอียด error จาก API
          const t = await r.text();
          throw new Error(t);
        }
        const j = await r.json();
        setItems(j.items || []);
      } catch (e) {
        console.error("Load schedules failed:", e);
        alert("โหลดรอบอบรมไม่สำเร็จ:\n" + (e?.message || e));
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);


  // จำนวนเดือนที่ต้องการแสดง (12 เดือนถัดไป)
const MONTHS_COUNT = 12;

// สร้างอาเรย์เดือนตั้งแต่ต้นเดือนของเดือนปัจจุบันไปอีก 12 เดือน
const months = useMemo(() => {
  const start = startOfMonth(new Date());
  return Array.from({ length: MONTHS_COUNT }, (_, i) => addMonths(start, i));
}, []);
  // group: program -> course -> schedules
  const grouped = useMemo(() => {
    const byProgram = new Map();
    for (const it of items) {
      const course = it.course || {};
      const program = course.program || {};
      if (!program?._id) continue;

      if (!byProgram.has(program._id)) {
        byProgram.set(program._id, { program, courses: new Map() });
      }
      const g = byProgram.get(program._id);
      if (!g.courses.has(course._id)) {
        g.courses.set(course._id, { course, schedules: [] });
      }
      g.courses.get(course._id).schedules.push(it);
    }
    return Array.from(byProgram.values());
  }, [items]);

  // delete schedule
  async function handleDeleteSchedule(id) {
    if (!id) return;
    const ok = confirm("ต้องการลบรอบอบรมนี้หรือไม่?");
    if (!ok) return;
    const r = await fetch(`/api/admin/schedules/${id}`, { method: "DELETE" });
    if (!r.ok) {
      const msg = await r.text().catch(() => "");
      alert(`ลบไม่สำเร็จ\n${msg || r.status}`);
      return;
    }
    await load();
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Course Schedules</h1>
        <Link
          href="/admin/schedules/new"
          className="rounded-2xl bg-emerald-500 px-4 py-2 text-white hover:bg-emerald-600"
        >
          + Add
        </Link>
      </div>

      {loading && <div className="text-slate-300/80">Loading…</div>}
      {!loading && grouped.length === 0 && (
        <div className="text-slate-300/80">
          ไม่มีรอบอบรมในช่วง 12 เดือนถัดไป
        </div>
      )}

      <div className="space-y-10">
        {grouped.map(({ program, courses }) => (
          <ProgramCard
            key={program._id}
            program={program}
            months={months}
            courses={Array.from(courses.values())}
            onDeleteSchedule={handleDeleteSchedule}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------------- program card ---------------- */
function ProgramCard({ program, months, courses, onDeleteSchedule }) {
  // สกอร์บาร์รวม (อันเดียว) + sync header/body
  const scrollerRef = useRef(null);
  const [scrollX, setScrollX] = useState(0);
  const onScroll = (e) => setScrollX(e.currentTarget.scrollLeft);

  // เรียงคอร์สด้วย sort_order แล้วค่อยชื่อคอร์ส
  const orderedCourses = useMemo(() => {
    const list = Array.isArray(courses) ? [...courses] : [];
    return list.sort((A, B) => {
      const sa = A.course?.sort_order ?? 0;
      const sb = B.course?.sort_order ?? 0;
      if (sa !== sb) return sa - sb;
      return (A.course?.course_name || "").localeCompare(
        B.course?.course_name || ""
      );
    });
  }, [courses]);

  return (
    <section className="rounded-3xl border border-black/10 bg-white shadow-sm overflow-hidden">
      {/* header: program */}
      <div className="flex items-center gap-3 p-4">
        {program.programiconurl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={program.programiconurl}
            alt=""
            className="h-8 w-8 rounded-full border border-black/10 object-cover"
          />
        )}
        <h2 className="text-xl font-semibold text-slate-900">
          {program.program_name || program.program_id}
        </h2>
      </div>

      {/* ===== หัวตาราง: ซ้ายคงที่ + เดือนขวา (เลื่อนตาม scrollX) ===== */}
      <div className="px-4">
        <div className="flex">
          {/* ซ้ายคงที่ */}
          <table
            className="table-fixed text-sm bg-sky-100 text-sky-900 border-separate"
            style={{ width: LEFT_TOTAL, borderSpacing: 0 }}
          >
            <thead>
              <tr>
                <th className="p-3 text-left" style={{ width: LEFT.code }}>
                  รหัส
                </th>
                <th className="p-3 text-left" style={{ width: LEFT.name }}>
                  ชื่อหลักสูตร
                </th>
                <th className="p-3 text-center" style={{ width: LEFT.days }}>
                  วัน
                </th>
                <th className="p-3 text-right" style={{ width: LEFT.price }}>
                  ราคา
                </th>
              </tr>
            </thead>
          </table>

          {/* หัวเดือน */}
          <div className="overflow-hidden" style={{ width: SCROLL_WIDTH }}>
            <div
              className="will-change-transform"
              style={{
                width: months.length * MONTH_W,
                transform: `translateX(-${scrollX}px)`,
                transition: "transform 30ms linear",
              }}
            >
              <table
                className="text-sm bg-sky-100 text-sky-900 min-w-max border-separate"
                style={{ borderSpacing: 0 }}
              >
                <thead>
                  <tr>
                    {months.map((m) => {
                      const { top, bottom } = monthLabel(m);
                      return (
                        <th
                          key={m.toISOString()}
                          className="p-3 text-center"
                          style={{ width: MONTH_W, minWidth: MONTH_W }}
                        >
                          <div className="font-bold">{top}</div>
                          <div className="text-[11px] opacity-70">{bottom}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ===== บอดี้: ซ้ายคงที่ + เดือนขวา (เลื่อนตาม scrollX) ===== */}
      <div className="px-4">
        {orderedCourses.map(({ course, schedules }, idx) => {
          const zebra = idx % 2 === 1 ? "bg-slate-50" : "bg-white";
          const price = course.course_price ?? "-";
          const days =
            course.course_trainingdays ??
            (schedules?.[0]?.dates?.length || "-");

          return (
            <div key={course._id} className="flex">
              {/* ซ้ายคงที่ */}
              <table
                className={`table-fixed text-sm ${zebra} border-separate`}
                style={{ width: LEFT_TOTAL, borderSpacing: 0 }}
              >
                <tbody>
                  <tr>
                    <td
                      className="p-3 align-top text-slate-800"
                      style={{ width: LEFT.code }}
                    >
                      {course.course_id}
                    </td>
                    <td
                      className="p-3 align-top text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis group relative"
                      style={{ width: LEFT.name }}
                      title={course.course_name}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{course.course_name}</span>

                        {/* Action buttons — แสดงเมื่อ hover แถว */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* + รอบ : พา courseId ไปด้วย */}
                          <Link
                            href={`/admin/schedules/new?course=${course._id}`}
                            className="rounded-md bg-emerald-100 px-2 py-[2px] text-[12px] text-emerald-700 hover:bg-emerald-200"
                            title="เพิ่มรอบของคอร์สนี้"
                          >
                            + รอบ
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td
                      className="p-3 align-top text-center text-slate-800"
                      style={{ width: LEFT.days }}
                    >
                      {days}
                    </td>
                    <td
                      className="p-3 align-top text-right text-slate-800 tabular-nums"
                      style={{ width: LEFT.price }}
                    >
                      {typeof price === "number"
                        ? price.toLocaleString()
                        : price}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* ส่วนเดือนของแถวนี้ – ขยับตาม scrollX */}
              <div className="overflow-hidden" style={{ width: SCROLL_WIDTH }}>
                <div
                  className="will-change-transform"
                  style={{
                    width: months.length * MONTH_W,
                    transform: `translateX(-${scrollX}px)`,
                    transition: "transform 30ms linear",
                  }}
                >
                  <table
                    className={`text-sm ${zebra} min-w-max border-separate`}
                    style={{ borderSpacing: 0 }}
                  >
                    <tbody>
                      <tr>
                        {months.map((m) => (
                          <td
                            key={m.toISOString()}
                            className="p-3 align-top border-t border-l border-slate-200"
                            style={{ width: MONTH_W, minWidth: MONTH_W }}
                          >
                            <MonthCell
                              month={m}
                              schedules={schedules}
                              onDelete={onDeleteSchedule}
                            />
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}

        {/* ===== สกอร์บาร์รวม (อันเดียว) อยู่ล่างขวา ===== */}
        <div className="mt-2 flex items-center">
          <div style={{ width: LEFT_TOTAL }} />
          <div
            ref={scrollerRef}
            onScroll={onScroll}
            className="overflow-x-auto"
            style={{ width: SCROLL_WIDTH }}
            aria-label="Months horizontal scrollbar"
          >
            <div style={{ width: months.length * MONTH_W, height: 1 }} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- month cell (มีปุ่ม แก้ไข/ลบ รอบ) ---------------- */
function MonthCell({ month, schedules }) {
  const thisMonth = schedules
    .map((s) => ({
      ...s,
      dates: (s.dates || [])
        .map((d) => new Date(d))
        .filter(
          (d) =>
            d.getFullYear() === month.getFullYear() &&
            d.getMonth() === month.getMonth()
        ),
    }))
    .filter((s) => s.dates.length > 0);

  if (thisMonth.length === 0) return null;

  async function handleDelete(id) {
    if (!confirm("ลบรอบอบรมนี้ใช่ไหม?")) return;
    const r = await fetch(`/api/admin/schedules/${id}`, { method: "DELETE" });
    if (r.ok) {
      // เอาแบบง่ายๆ ชัวร์ๆ
      window.location.reload();
    } else {
      alert(await r.text());
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {thisMonth.map((s) => {
        // ช่วงวันที่
        const ranges = toRanges(s.dates);
        const label = ranges
          .map(([a, b]) =>
            a.getDate() === b.getDate()
              ? `${a.getDate()}`
              : `${a.getDate()}-${b.getDate()}`
          )
          .join(", ");

        // สีจุดตามประเภท
        const dot = s.type === "hybrid" ? "bg-fuchsia-500" : "bg-sky-500";

        // สีป้ายสถานะ
        const statusClass =
          s.status === "full"
            ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
            : s.status === "nearly_full"
            ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
            : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";

        const Top = (
          <>
            <div className="flex items-center gap-1 text-[13px] text-slate-800">
              <span
                className={`inline-block h-[7px] w-[7px] rounded-full ${dot}`}
              />
              <span className="font-medium">{label}</span>
            </div>
            <span
              className={`rounded-full px-2 py-[2px] text-[11px] ${statusClass}`}
            >
              {s.status === "open"
                ? "สมัคร"
                : s.status === "nearly_full"
                ? "ใกล้เต็ม"
                : "เต็ม"}
            </span>
          </>
        );

        return (
          <div key={s._id} className="flex flex-col items-center gap-1">
            {s.signup_url ? (
              <a
                href={s.signup_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-90"
                title="เปิดหน้าสมัคร"
              >
                {Top}
              </a>
            ) : (
              Top
            )}

            {/* ปุ่มอยู่ 'ใต้' วันอบรม */}
            <div className="flex gap-2 mt-1">
              <Link
                href={`/admin/schedules/${s._id}/edit`}
                className="rounded-md bg-amber-100 px-2 py-[2px] text-[12px] text-amber-700 hover:bg-amber-200"
              >
                แก้ไข
              </Link>
              <button
                onClick={() => handleDelete(s._id)}
                className="rounded-md bg-rose-100 px-2 py-[2px] text-[12px] text-rose-700 hover:bg-rose-200"
              >
                ลบ
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
