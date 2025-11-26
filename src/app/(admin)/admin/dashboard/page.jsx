"use client";
import { useEffect, useState } from "react";

function ProgramBadge({ program }) {
  if (program?.programiconurl) {
    return (
      <img
        src={program.programiconurl}
        alt={`${program.program_name} icon`}
        className="h-5 w-5 rounded-md object-contain bg-white/5 ring-1 ring-white/10"
      />
    );
  }
  return (
    <span
      className="inline-block size-3 rounded-full ring-1 ring-white/10"
      style={{ background: program?.programcolor || "#64748b" }}
    />
  );
}

const StatCard = ({ title, value, subtitle }) => (
  <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
    <div className="text-sm text-slate-300">{title}</div>
    <div className="text-3xl font-semibold mt-1">
      {value?.toLocaleString?.() ?? value}
    </div>
    {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
  </div>
);

/* ตัดชื่อให้สั้นสำหรับ label ในกราฟ (เผื่อใช้ภายหลัง) */
function shortenName(name, max = 10) {
  if (!name) return "";
  return name.length > max ? name.slice(0, max - 1) + "…" : name;
}

/* กล่องเล็ก ๆ สำหรับ Public / Online / Total ใช้ซ้ำใน Program Breakdown */
function ProgramStatsGroup({ publicCount, onlineCount, total }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-900/80 ring-1 ring-white/10 overflow-hidden text-center text-xs">
      <div className="px-3 py-1.5 min-w-[70px]">
        <div className="text-[10px] text-emerald-300 uppercase tracking-wide">
          Public
        </div>
        <div className="text-lg font-semibold text-emerald-200 leading-tight">
          {publicCount}
        </div>
      </div>
      <div className="px-3 py-1.5 min-w-[70px] border-l border-slate-700/60">
        <div className="text-[10px] text-sky-300 uppercase tracking-wide">
          Online
        </div>
        <div className="text-lg font-semibold text-sky-200 leading-tight">
          {onlineCount}
        </div>
      </div>
      <div className="px-3 py-1.5 min-w-[70px] border-l border-slate-700/60">
        <div className="text-[10px] text-slate-300 uppercase tracking-wide">
          Total
        </div>
        <div className="text-lg font-semibold text-slate-50 leading-tight">
          {total}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // กำหนดให้แสดง 12 คอร์สต่อหน้า

  const fetchStats = async () => {
    setLoading(true);
    const res = await fetch("/api/stats", { cache: "no-store" });
    const d = await res.json();
    setData(d);
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-44 rounded bg-white/10" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-white/5 animate-pulse"
            />
          ))}
        </div>
        <div className="h-6 w-40 rounded bg-white/10" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-white/5 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const totals = data?.totals || {};
  const byProgram = data?.byProgram || [];
  const instructorStats = data?.instructorStats || {};
  const topInstructors = instructorStats.topInstructors || [];

  /* ---------- chart data ---------- */
  const barData = (byProgram || []).map((p) => ({
    id: p._id,
    code: p.program_id || "",
    name: p.program_name || "",
    total: p.total || 0,
  }));
  const maxTotal =
    barData.length > 0 ? Math.max(...barData.map((b) => b.total)) || 1 : 1;

  // คำนวณจำนวนหน้าทั้งหมด
  const totalPages = Math.ceil(barData.length / itemsPerPage);

  // คำนวณจุดเริ่มต้นและจุดสิ้นสุดของการ slice ข้อมูล
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const currentPrograms = barData.slice(startIndex, endIndex);

  const topPrograms = [...byProgram]
    .sort((a, b) => (b.total || 0) - (a.total || 0))
    .slice(0, 5);

  const maxProgramTotal = byProgram.length
    ? Math.max(...byProgram.map((p) => p.total || 0)) || 1
    : 1;

  const totalInstructors = instructorStats.totalInstructors || 0;
  const avgProgramsPerInstructor =
    instructorStats.avgProgramsPerInstructor || 0;
  const maxProgramsPerInstructor =
    instructorStats.maxProgramsPerInstructor || 0;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            ภาพรวมคอร์สและวิทยากรทั้งหมดในระบบ 9Expert
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/20 text-sm"
        >
          Refresh
        </button>
      </header>

      {/* TOP KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Public Courses"
          value={totals.publicCourses}
          subtitle="จำนวนคอร์ส Public ทั้งหมด"
        />
        <StatCard
          title="Online Courses"
          value={totals.onlineCourses}
          subtitle="จำนวนคอร์ส Online ทั้งหมด"
        />
        <StatCard
          title="Programs"
          value={totals.programs}
          subtitle="จำนวนโปรแกรมทั้งหมด"
        />
        <StatCard
          title="Skills"
          value={totals.skills}
          subtitle="จำนวนสกิลทั้งหมด"
        />
      </div>

      {/* MIDDLE ROW: 3 CARDS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* 1) Course by Program (Total) */}
        <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-semibold">
                Course by Program (Total)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                เปรียบเทียบจำนวนคอร์สในแต่ละ Program (แสดงเป็นรหัสโปรแกรม)
              </p>
            </div>
            <div className="text-xs text-slate-400 text-right">
              All Courses:{" "}
              <span className="text-slate-200 font-semibold">
                {totals.allCourses?.toLocaleString?.()}
              </span>
            </div>
          </div>

          {/* ranked horizontal bar */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            {currentPrograms.map((b) => {
              const pct = b.total && maxTotal ? (b.total / maxTotal) * 100 : 0;
              return (
                <div key={b.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex items-center justify-center rounded-lg bg-slate-900/80 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-slate-50">
                        {b.code || "—"}
                      </span>
                      <span className="truncate text-slate-300">
                        {b.name || "-"}
                      </span>
                    </div>
                    <span className="text-slate-400 font-medium ml-2">
                      {b.total}
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-slate-900/80 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-cyan-300"
                      style={{ width: `${pct || 0}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {!barData.length && (
              <div className="text-xs text-slate-400 col-span-full">
                ยังไม่มีข้อมูล Program
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-700/60">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1 text-xs text-slate-400 disabled:text-slate-600 hover:text-slate-200 disabled:cursor-not-allowed"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M15.79 14.773a.75.75 0 0 1-1.06-.011L10 9.539l-4.73 5.223a.75.75 0 0 1-1.12-.996l5.25-5.875a.75.75 0 0 1 1.12 0l5.25 5.875a.75.75 0 0 1-.06 1.007ZM4.21 6.545a.75.75 0 0 1 1.06.011L10 11.261l4.73-5.223a.75.75 0 1 1 1.12.996l-5.25 5.875a.75.75 0 0 1-1.12 0L4.21 7.541a.75.75 0 0 1 0-1.007Z"
                    clipRule="evenodd"
                  />
                </svg>
                Previous
              </button>

              <div className="text-xs text-slate-300 font-semibold">
                หน้า {currentPage} จาก {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 text-xs text-slate-400 disabled:text-slate-600 hover:text-slate-200 disabled:cursor-not-allowed"
              >
                Next
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4 rotate-180"
                >
                  <path
                    fillRule="evenodd"
                    d="M15.79 14.773a.75.75 0 0 1-1.06-.011L10 9.539l-4.73 5.223a.75.75 0 0 1-1.12-.996l5.25-5.875a.75.75 0 0 1 1.12 0l5.25 5.875a.75.75 0 0 1-.06 1.007ZM4.21 6.545a.75.75 0 0 1 1.06.011L10 11.261l4.73-5.223a.75.75 0 1 1 1.12.996l-5.25 5.875a.75.75 0 0 1-1.12 0L4.21 7.541a.75.75 0 0 1 0-1.007Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* 2) Instructor Overview */}
        <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold">Instructors</h2>
              <p className="text-xs text-slate-400 mt-1">
                สรุปจำนวนวิทยากร และ Program ที่สอนได้
              </p>
            </div>
            <div className="text-[11px] text-slate-400 text-right">
              Updated{" "}
              {instructorStats.generatedAt
                ? new Date(instructorStats.generatedAt).toLocaleDateString(
                    "th-TH",
                    { day: "2-digit", month: "short", year: "numeric" }
                  )
                : ""}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="relative inline-flex items-center justify-center">
                <div className="h-20 w-20 rounded-full bg-slate-900/80 border border-emerald-400/40 shadow-[0_0_25px_rgba(16,185,129,0.45)] flex items-center justify-center">
                  <span className="text-3xl font-semibold text-emerald-300">
                    {totalInstructors}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                วิทยากรทั้งหมดในระบบ
              </div>
            </div>

            <div className="flex-1 space-y-2 text-[11px]">
              <div className="rounded-xl bg-slate-900/70 px-3 py-2 flex items-center justify-between">
                <span className="text-slate-400">เฉลี่ย Program / คน</span>
                <span className="font-semibold text-emerald-300">
                  {avgProgramsPerInstructor.toFixed
                    ? avgProgramsPerInstructor.toFixed(1)
                    : avgProgramsPerInstructor}
                </span>
              </div>
              <div className="rounded-xl bg-slate-900/70 px-3 py-2 flex items-center justify-between">
                <span className="text-slate-400">สอนได้มากที่สุด</span>
                <span className="font-semibold text-sky-300">
                  {maxProgramsPerInstructor} Program
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Top Instructors</span>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {topInstructors.length ? (
                topInstructors.map((ins, idx) => (
                  <div
                    key={ins._id || idx}
                    className="flex items-center justify-between rounded-lg bg-slate-900/70 px-2.5 py-1.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] text-slate-500 w-4">
                        #{idx + 1}
                      </span>
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-emerald-500/70 to-sky-500/70 flex items-center justify-center text-[11px] text-white font-semibold">
                        {(ins.name || "I").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[11px] text-slate-100 truncate">
                        {ins.name}
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-300">
                      {ins.programCount} Program
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-slate-500">
                  ยังไม่มีข้อมูล Instructor
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3) Top Programs summary */}
        <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 space-y-3">
          <h2 className="text-sm font-semibold">Top Programs</h2>
          <p className="text-xs text-slate-400">
            Program ที่มีจำนวนคอร์สรวมมากที่สุด
          </p>
          <div className="space-y-2 mt-2">
            {topPrograms.map((p, idx) => (
              <div
                key={p._id}
                className="flex items-center justify-between rounded-xl bg-slate-900/40 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-slate-400 w-4">#{idx + 1}</span>
                  <ProgramBadge program={p} />
                  <div className="min-w-0">
                    <div className="text-sm truncate">
                      {p.program_name || "Untitled"}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Public {p.publicCount} • Online {p.onlineCount}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-semibold">{p.total ?? 0}</div>
              </div>
            ))}
            {!topPrograms.length && (
              <div className="text-xs text-slate-400">ยังไม่มี Program</div>
            )}
          </div>
        </div>
      </div>

      {/* BY PROGRAM: DETAIL CARDS */}
      <div className="flex items-center justify-between mt-4">
        <h2 className="text-lg font-semibold">Program Breakdown</h2>
        <div className="text-xs text-slate-400">
          แสดงรายละเอียด Public / Online / Total แยกตาม Program
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {byProgram.map((p) => {
          const pct =
            maxProgramTotal > 0 ? (p.total / maxProgramTotal) * 100 : 0;

          return (
            <div
              key={p._id}
              className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 flex flex-col gap-3"
            >
              {/* header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <ProgramBadge program={p} />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.program_name}</div>
                    <div className="text-[11px] text-slate-400">
                      {p.program_id}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-400 whitespace-nowrap">
                  Programs:{" "}
                  <span className="font-semibold text-slate-100">
                    {p.total}
                  </span>
                </div>
              </div>

              {/* stats + progress */}
              <div className="flex items-center justify-between gap-4">
                <ProgramStatsGroup
                  publicCount={p.publicCount}
                  onlineCount={p.onlineCount}
                  total={p.total}
                />

                <div className="flex-1">
                  <div className="h-1.5 w-full rounded-full bg-slate-900/80 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-cyan-300"
                      style={{ width: `${pct || 0}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-right text-slate-500">
                    รวม {p.total} คอร์ส
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!byProgram.length && (
          <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-6 text-center text-slate-400">
            ยังไม่มี Program
          </div>
        )}
      </div>
    </div>
  );
}
