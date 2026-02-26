"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  ArrowRight,
  Globe,
  Laptop,
  GraduationCap,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Users,
  Trophy,
} from "lucide-react";

/* ---------------- helpers ---------------- */

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

function Skeleton({ className = "" }) {
  return (
    <div className={cx("animate-pulse rounded-lg bg-white/10", className)} />
  );
}

function formatTHDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ProgramBadge({ program }) {
  if (program?.programiconurl) {
    return (
      <img
        src={program.programiconurl}
        alt={`${program.program_name} icon`}
        className="h-6 w-6 rounded-lg object-contain bg-white/5 ring-1 ring-white/10"
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

/* ---------- UI shells ---------- */

function GlassCard({ children, className = "" }) {
  return (
    <div
      className={cx(
        "relative rounded-3xl p-[1px]",
        "bg-gradient-to-br from-white/14 via-white/6 to-white/10",
        className,
      )}
    >
      {children}
      {/* <div className=" bg-slate-950/35 ring-1 ring-white/10 backdrop-blur shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
        
      </div> */}
    </div>
  );
}

function IconBox({ icon: Icon, tone = "emerald" }) {
  const toneCls =
    tone === "sky"
      ? "bg-sky-500/15 text-sky-200 ring-sky-400/30 shadow-[0_0_22px_rgba(56,189,248,0.18)]"
      : tone === "amber"
        ? "bg-amber-500/15 text-amber-200 ring-amber-400/30 shadow-[0_0_22px_rgba(251,191,36,0.14)]"
        : tone === "rose"
          ? "bg-rose-500/15 text-rose-200 ring-rose-400/30 shadow-[0_0_22px_rgba(244,63,94,0.14)]"
          : "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30 shadow-[0_0_22px_rgba(16,185,129,0.16)]";

  return (
    <div
      className={cx(
        "h-10 w-10 rounded-2xl flex items-center justify-center ring-1",
        toneCls,
      )}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}

function StatCard({ title, value, subtitle, tone, icon, href }) {
  const content = (
    <div
      className={cx(
        "group rounded-2xl bg-white/5 ring-1 ring-white/10 p-4",
        "hover:bg-white/[0.075] hover:ring-white/20 transition bg-gradient-to-br from-white/10 via-white/6 to-white/5",
        "shadow-[0_12px_42px_rgba(0,0,0,0.25)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-slate-400">{title}</div>
          <div className="text-3xl font-semibold mt-1 text-slate-50">
            {value?.toLocaleString?.() ?? value}
          </div>
          {subtitle && (
            <div className="text-xs text-slate-400 mt-1">{subtitle}</div>
          )}
        </div>

        <IconBox tone={tone} icon={icon} />
      </div>

      <div className="mt-3 h-px bg-white/10" />

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
        <span className={href ? "text-slate-300" : ""}>
          {href ? "View details" : "Summary"}
        </span>
        {href ? (
          <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition text-slate-200" />
        ) : null}
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

/* ---------- Program breakdown small group ---------- */

function ProgramStatsGroup({ publicCount, onlineCount, total }) {
  return (
    <div className="inline-flex rounded-2xl bg-slate-900/70 ring-1 ring-white/10 overflow-hidden text-center text-xs">
      <div className="px-3 py-2 min-w-[74px]">
        <div className="text-[10px] text-emerald-300 uppercase tracking-wide">
          Public
        </div>
        <div className="text-lg font-semibold text-emerald-100 leading-tight">
          {publicCount}
        </div>
      </div>
      <div className="px-3 py-2 min-w-[74px] border-l border-slate-700/60">
        <div className="text-[10px] text-sky-300 uppercase tracking-wide">
          Online
        </div>
        <div className="text-lg font-semibold text-sky-100 leading-tight">
          {onlineCount}
        </div>
      </div>
      <div className="px-3 py-2 min-w-[74px] border-l border-slate-700/60">
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

/* ---------------- page ---------------- */

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute top-20 -right-24 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
        </div>

        <div className="space-y-6">
          <GlassCard>
            <div className="p-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-72 mt-2" />
              <div className="mt-4 flex gap-2">
                <Skeleton className="h-9 w-28 rounded-xl" />
                <Skeleton className="h-9 w-24 rounded-xl" />
              </div>
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4"
              >
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-24 mt-3" />
                <Skeleton className="h-4 w-40 mt-3" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-4"
              >
                <Skeleton className="h-5 w-52" />
                <Skeleton className="h-4 w-80 mt-2" />
                <div className="mt-4 space-y-2">
                  {[...Array(7)].map((__, j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <GlassCard>
            <div className="p-4">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-4 w-80 mt-2" />
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4"
              >
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-12 w-full mt-4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totals = data?.totals || {};
  const byProgram = data?.byProgram || [];
  const instructorStats = data?.instructorStats || {};
  const topInstructors = instructorStats.topInstructors || [];

  const barData = (byProgram || []).map((p) => ({
    id: p._id,
    code: p.program_id || "",
    name: p.program_name || "",
    total: p.total || 0,
  }));
  const maxTotal =
    barData.length > 0 ? Math.max(...barData.map((b) => b.total)) || 1 : 1;

  const totalPages = Math.max(1, Math.ceil(barData.length / itemsPerPage));
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

  const updatedAtLabel = instructorStats.generatedAt
    ? formatTHDate(instructorStats.generatedAt)
    : "";

  return (
    <div className="relative">
      {/* soft background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute top-20 -right-24 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="space-y-6">
        {/* HEADER */}
        <GlassCard>
          <div className="p-4 flex items-center justify-between gap-4">
            <div>
              <h1 className="mt-2 text-xl font-semibold text-slate-50">
                Dashboard Overview
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                ภาพรวมคอร์สและวิทยากรทั้งหมดในระบบ 9Expert
              </p>

              {updatedAtLabel ? (
                <div className="mt-2 text-[11px] text-slate-500">
                  Updated:{" "}
                  <span className="text-slate-300">{updatedAtLabel}</span>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin/career-path"
                className="hidden sm:inline-flex rounded-xl px-3 py-2 bg-white/5 hover:bg-white/10 text-sm ring-1 ring-white/10 hover:ring-white/20 transition"
              >
                Career Path
              </Link>

              <button
                onClick={fetchStats}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-white/10 hover:bg-white/20 text-sm ring-1 ring-white/10 hover:ring-white/20 transition"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </GlassCard>

        {/* TOP KPIs (View details ไปหน้าจริง) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            title="Public Courses"
            value={totals.publicCourses}
            subtitle="จำนวนคอร์ส Public ทั้งหมด"
            tone="emerald"
            icon={Globe}
            href="/admin/courses/public"
          />
          <StatCard
            title="Online Courses"
            value={totals.onlineCourses}
            subtitle="จำนวนคอร์ส Online ทั้งหมด"
            tone="sky"
            icon={Laptop}
            href="/admin/courses/online"
          />
          <StatCard
            title="Programs"
            value={totals.programs}
            subtitle="จำนวนโปรแกรมทั้งหมด"
            tone="amber"
            icon={GraduationCap}
            href="/admin/programs"
          />
          <StatCard
            title="Skills"
            value={totals.skills}
            subtitle="จำนวนสกิลทั้งหมด"
            tone="rose"
            icon={Sparkles}
            href="/admin/skills"
          />
        </div>

        {/* MIDDLE ROW */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* 1) Course by Program */}
          <GlassCard>
            <div className="p-4 h-full min-h-0 flex flex-col">
              <div className="flex items-start justify-between mb-2 gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-50">
                    Course by Program (Total)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    เปรียบเทียบจำนวนคอร์สในแต่ละ Program (แสดงเป็นรหัสโปรแกรม)
                  </p>
                </div>
                <div className="text-xs text-slate-400 text-right whitespace-nowrap">
                  All Courses:{" "}
                  <span className="text-slate-200 font-semibold">
                    {totals.allCourses?.toLocaleString?.() ?? 0}
                  </span>
                </div>
              </div>

              {/* ranked horizontal bar */}
              <div className="mt-4 flex-1 min-h-0">
                <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  {currentPrograms.map((b) => {
                    const pct =
                      b.total && maxTotal ? (b.total / maxTotal) * 100 : 0;
                    return (
                      <div key={b.id} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="inline-flex items-center justify-center rounded-lg bg-slate-900/70 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-slate-50 ring-1 ring-white/10">
                              {b.code || "—"}
                            </span>
                            <span className="truncate text-slate-300">
                              {b.name || "-"}
                            </span>
                          </div>
                          <span className="text-slate-200 font-semibold ml-2">
                            {b.total}
                          </span>
                        </div>

                        <div className="h-2 w-full rounded-full bg-slate-900/70 overflow-hidden ring-1 ring-white/5">
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
              </div>

              {/* ✅ Pagination: Previous / Next แบบไล่หน้า */}
              {totalPages > 1 && (
                <div className="mt-auto pt-4 ">
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 disabled:text-slate-600 hover:text-slate-200 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>

                    <div className="text-xs text-slate-300 font-semibold">
                      หน้า {currentPage} จาก {totalPages}
                    </div>

                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 disabled:text-slate-600 hover:text-slate-200 disabled:cursor-not-allowed"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>

          {/* 2) Instructor Overview */}
          <GlassCard className="h-[390px]">
            <div className="p-4 h-full min-h-0 flex flex-col">
              <div className="flex items-start justify-between mb-3 gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-50 inline-flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-300" />
                    Instructors
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    สรุปจำนวนวิทยากร และ Program ที่สอนได้
                  </p>
                </div>
                {updatedAtLabel ? (
                  <div className="text-[11px] text-slate-500 text-right whitespace-nowrap">
                    Updated {updatedAtLabel}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="h-20 w-20 rounded-full bg-slate-900/70 border border-emerald-400/30 shadow-[0_0_28px_rgba(16,185,129,0.35)] flex items-center justify-center">
                    <span className="text-3xl font-semibold text-emerald-300">
                      {totalInstructors}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    วิทยากรทั้งหมดในระบบ
                  </div>
                </div>

                <div className="flex-1 space-y-2 text-[11px]">
                  <div className="rounded-xl bg-slate-900/60 px-3 py-2 flex items-center justify-between ring-1 ring-white/10">
                    <span className="text-slate-400">เฉลี่ย Program / คน</span>
                    <span className="font-semibold text-emerald-300">
                      {avgProgramsPerInstructor?.toFixed
                        ? avgProgramsPerInstructor.toFixed(1)
                        : avgProgramsPerInstructor}
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-900/60 px-3 py-2 flex items-center justify-between ring-1 ring-white/10">
                    <span className="text-slate-400">สอนได้มากที่สุด</span>
                    <span className="font-semibold text-sky-300">
                      {maxProgramsPerInstructor} Program
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">
                    Top Instructors
                  </span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-1 space-y-1.5">
                  {topInstructors.length ? (
                    topInstructors.map((ins, idx) => (
                      <div
                        key={ins._id || idx}
                        className="flex items-center justify-between rounded-xl bg-slate-900/55 ring-1 ring-white/10 px-2.5 py-1.5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] text-slate-500 w-6">
                            #{idx + 1}
                          </span>
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-500/70 to-sky-500/70 flex items-center justify-center text-[11px] text-white font-semibold">
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
          </GlassCard>

          {/* 3) Top Programs */}
          <GlassCard>
            <div className="p-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-50 inline-flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-300" />
                Top Programs
              </h2>
              <p className="text-xs text-slate-400">
                Program ที่มีจำนวนคอร์สรวมมากที่สุด
              </p>

              <div className="space-y-2 mt-2">
                {topPrograms.map((p, idx) => (
                  <div
                    key={p._id}
                    className="flex items-center justify-between rounded-xl bg-slate-900/45 ring-1 ring-white/10 px-3 py-2 hover:bg-slate-900/60 transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-slate-400 w-6">
                        #{idx + 1}
                      </span>
                      <ProgramBadge program={p} />
                      <div className="min-w-0">
                        <div className="text-sm truncate text-slate-100">
                          {p.program_name || "Untitled"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Public {p.publicCount} • Online {p.onlineCount}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-slate-50">
                      {p.total ?? 0}
                    </div>
                  </div>
                ))}

                {!topPrograms.length && (
                  <div className="text-xs text-slate-400">ยังไม่มี Program</div>
                )}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* BY PROGRAM: DETAIL CARDS */}
        <div className="flex items-end justify-between mt-2 gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">
              Program Breakdown
            </h2>
            <div className="text-xs text-slate-400">
              แสดงรายละเอียด Public / Online / Total แยกตาม Program
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {byProgram.map((p) => {
            const pct =
              maxProgramTotal > 0 ? (p.total / maxProgramTotal) * 100 : 0;

            return (
              <div
                key={p._id}
                className={cx(
                  "rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 flex flex-col gap-3",
                  "hover:bg-white/[0.075] hover:ring-white/20 transition bg-gradient-to-br from-white/10 via-white/6 to-white/5",
                  "shadow-[0_12px_40px_rgba(0,0,0,0.18)]",
                )}
              >
                {/* header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <ProgramBadge program={p} />
                    <div className="min-w-0">
                      <div className="font-medium truncate text-slate-100">
                        {p.program_name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {p.program_id}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 whitespace-nowrap">
                    Total:{" "}
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
                    <div className="h-1.5 w-full rounded-full bg-slate-900/70 overflow-hidden ring-1 ring-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-cyan-300"
                        style={{ width: `${pct || 0}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-right text-slate-500">
                      สัดส่วน {pct.toFixed ? pct.toFixed(1) : pct}% ของ top
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
    </div>
  );
}
