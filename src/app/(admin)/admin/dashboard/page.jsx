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
    <div className={cx("animate-pulse rounded-lg bg-[var(--bar-track)]", className)} />
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
        className="h-6 w-6 rounded-lg object-contain bg-[var(--surface-glass)] ring-1 ring-[var(--border-primary)]"
      />
    );
  }
  return (
    <span
      className="inline-block size-3 rounded-full ring-1 ring-[var(--border-primary)]"
      style={{ background: program?.programcolor || "#64748b" }}
    />
  );
}

/* ---------- UI shells ---------- */

function GlassCard({ children, className = "" }) {
  return (
    <div
      className={cx(
        "rounded-3xl bg-[var(--surface-card)] border border-[var(--border-primary)] shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function IconBox({ icon: Icon, tone = "emerald" }) {
  const varBg = `var(--icon-${tone}-bg)`;
  const varText = `var(--icon-${tone}-text)`;

  return (
    <div
      className="h-10 w-10 rounded-2xl flex items-center justify-center"
      style={{ backgroundColor: varBg, color: varText }}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}

function StatCard({ title, value, subtitle, tone, icon, href }) {
  const content = (
    <div
      className={cx(
        "group rounded-2xl bg-[var(--surface-card)] border border-[var(--border-primary)] p-4",
        "hover:bg-[var(--surface-card-hover)] hover:border-[var(--border-hover)] transition",
        "shadow-[var(--shadow-card)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-[var(--text-tertiary)]">{title}</div>
          <div className="text-3xl font-semibold mt-1 text-[var(--text-primary)]">
            {value?.toLocaleString?.() ?? value}
          </div>
          {subtitle && (
            <div className="text-xs text-[var(--text-tertiary)] mt-1">{subtitle}</div>
          )}
        </div>

        <IconBox tone={tone} icon={icon} />
      </div>

      <div className="mt-3 h-px bg-[var(--border-primary)]" />

      <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
        <span className={href ? "text-[var(--text-secondary)]" : ""}>
          {href ? "View details" : "Summary"}
        </span>
        {href ? (
          <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition text-[var(--text-secondary)]" />
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
    <div className="inline-flex rounded-2xl bg-[var(--bar-bg)] border border-[var(--border-primary)] overflow-hidden text-center text-xs">
      <div className="px-3 py-2 min-w-[74px]">
        <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--accent-emerald-text)" }}>
          Public
        </div>
        <div className="text-lg font-semibold leading-tight" style={{ color: "var(--accent-emerald-text)" }}>
          {publicCount}
        </div>
      </div>
      <div className="px-3 py-2 min-w-[74px] border-l border-[var(--border-primary)]">
        <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--accent-sky-text)" }}>
          Online
        </div>
        <div className="text-lg font-semibold leading-tight" style={{ color: "var(--accent-sky-text)" }}>
          {onlineCount}
        </div>
      </div>
      <div className="px-3 py-2 min-w-[74px] border-l border-[var(--border-primary)]">
        <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">
          Total
        </div>
        <div className="text-lg font-semibold text-[var(--text-primary)] leading-tight">
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
                className="rounded-2xl bg-[var(--surface-glass)] ring-1 ring-[var(--border-primary)] p-4"
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
                className="rounded-3xl bg-[var(--surface-glass)] ring-1 ring-[var(--border-primary)] p-4"
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
                className="rounded-2xl bg-[var(--surface-glass)] ring-1 ring-[var(--border-primary)] p-4"
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
              <h1 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                Dashboard Overview
              </h1>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                ภาพรวมคอร์สและวิทยากรทั้งหมดในระบบ 9Expert
              </p>

              {updatedAtLabel ? (
                <div className="mt-2 text-[11px] text-[var(--text-muted)]">
                  Updated:{" "}
                  <span className="text-[var(--text-secondary)]">{updatedAtLabel}</span>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin/career-path"
                className="hidden sm:inline-flex rounded-xl px-3 py-2 bg-[var(--surface-glass)] hover:bg-[var(--surface-glass-hover)] text-sm ring-1 ring-[var(--border-primary)] hover:ring-[var(--border-hover)] transition"
              >
                Career Path
              </Link>

              <button
                onClick={fetchStats}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-[var(--surface-glass-hover)] hover:bg-[var(--surface-glass-hover)] text-sm ring-1 ring-[var(--border-primary)] hover:ring-[var(--border-hover)] transition"
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
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                    Course by Program (Total)
                  </h2>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    เปรียบเทียบจำนวนคอร์สในแต่ละ Program (แสดงเป็นรหัสโปรแกรม)
                  </p>
                </div>
                <div className="text-xs text-[var(--text-tertiary)] text-right whitespace-nowrap">
                  All Courses:{" "}
                  <span className="text-[var(--text-secondary)] font-semibold">
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
                            <span className="inline-flex items-center justify-center rounded-lg bg-[var(--bar-bg)] px-2 py-0.5 text-[11px] font-semibold tracking-wide text-[var(--text-primary)] ring-1 ring-[var(--border-primary)]">
                              {b.code || "—"}
                            </span>
                            <span className="truncate text-[var(--text-secondary)]">
                              {b.name || "-"}
                            </span>
                          </div>
                          <span className="text-[var(--text-secondary)] font-semibold ml-2">
                            {b.total}
                          </span>
                        </div>

                        <div className="h-2 w-full rounded-full bg-[var(--bar-bg)] overflow-hidden ring-1 ring-[var(--border-primary)]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-cyan-300"
                            style={{ width: `${pct || 0}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {!barData.length && (
                    <div className="text-xs text-[var(--text-tertiary)] col-span-full">
                      ยังไม่มีข้อมูล Program
                    </div>
                  )}
                </div>
              </div>

              {/* ✅ Pagination: Previous / Next แบบไล่หน้า */}
              {totalPages > 1 && (
                <div className="mt-auto pt-4 ">
                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border-primary)]">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center gap-1 text-xs text-[var(--text-tertiary)] disabled:text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>

                    <div className="text-xs text-[var(--text-secondary)] font-semibold">
                      หน้า {currentPage} จาก {totalPages}
                    </div>

                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="inline-flex items-center gap-1 text-xs text-[var(--text-tertiary)] disabled:text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:cursor-not-allowed"
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
                  <h2 className="text-sm font-semibold text-[var(--text-primary)] inline-flex items-center gap-2">
                    <Users className="h-4 w-4 text-[var(--accent-emerald)]" />
                    Instructors
                  </h2>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    สรุปจำนวนวิทยากร และ Program ที่สอนได้
                  </p>
                </div>
                {updatedAtLabel ? (
                  <div className="text-[11px] text-[var(--text-muted)] text-right whitespace-nowrap">
                    Updated {updatedAtLabel}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="h-20 w-20 rounded-full bg-[var(--surface-card)] border-2 border-[var(--border-primary)] shadow-[var(--shadow-glow-emerald)] flex items-center justify-center">
                    <span className="text-3xl font-semibold" style={{ color: "var(--accent-emerald-text)" }}>
                      {totalInstructors}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                    วิทยากรทั้งหมดในระบบ
                  </div>
                </div>

                <div className="flex-1 space-y-2 text-[11px]">
                  <div className="rounded-xl bg-[var(--bar-bg)] px-3 py-2 flex items-center justify-between border border-[var(--border-primary)]">
                    <span className="text-[var(--text-tertiary)]">เฉลี่ย Program / คน</span>
                    <span className="font-semibold text-[var(--accent-emerald)]">
                      {avgProgramsPerInstructor?.toFixed
                        ? avgProgramsPerInstructor.toFixed(1)
                        : avgProgramsPerInstructor}
                    </span>
                  </div>
                  <div className="rounded-xl bg-[var(--bar-bg)] px-3 py-2 flex items-center justify-between border border-[var(--border-primary)]">
                    <span className="text-[var(--text-tertiary)]">สอนได้มากที่สุด</span>
                    <span className="font-semibold text-[var(--accent-sky)]">
                      {maxProgramsPerInstructor} Program
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[var(--text-tertiary)]">
                    Top Instructors
                  </span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-1 space-y-1.5">
                  {topInstructors.length ? (
                    topInstructors.map((ins, idx) => (
                      <div
                        key={ins._id || idx}
                        className="flex items-center justify-between rounded-xl bg-[var(--bar-bg)] border border-[var(--border-primary)] px-2.5 py-1.5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] text-[var(--text-muted)] w-6">
                            #{idx + 1}
                          </span>
                          {ins.photo_url ? (
                            <img
                              src={ins.photo_url}
                              alt={ins.name}
                              className="h-7 w-7 rounded-full object-cover ring-1 ring-[var(--border-primary)]"
                            />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-500/70 to-sky-500/70 flex items-center justify-center text-[11px] text-white font-semibold">
                              {(ins.name || "I").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-[11px] text-[var(--text-primary)] truncate">
                            {ins.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--accent-emerald)]">
                          {ins.programCount} Program
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[11px] text-[var(--text-muted)]">
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
              <h2 className="text-sm font-semibold text-[var(--text-primary)] inline-flex items-center gap-2">
                <Trophy className="h-4 w-4 text-[var(--accent-amber)]" />
                Top Programs
              </h2>
              <p className="text-xs text-[var(--text-tertiary)]">
                Program ที่มีจำนวนคอร์สรวมมากที่สุด
              </p>

              <div className="space-y-2 mt-2">
                {topPrograms.map((p, idx) => (
                  <div
                    key={p._id}
                    className="flex items-center justify-between rounded-xl bg-[var(--bar-bg)] border border-[var(--border-primary)] px-3 py-2 hover:bg-[var(--surface-card-hover)] transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-[var(--text-tertiary)] w-6">
                        #{idx + 1}
                      </span>
                      <ProgramBadge program={p} />
                      <div className="min-w-0">
                        <div className="text-sm truncate text-[var(--text-primary)]">
                          {p.program_name || "Untitled"}
                        </div>
                        <div className="text-[11px] text-[var(--text-tertiary)]">
                          Public {p.publicCount} • Online {p.onlineCount}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                      {p.total ?? 0}
                    </div>
                  </div>
                ))}

                {!topPrograms.length && (
                  <div className="text-xs text-[var(--text-tertiary)]">ยังไม่มี Program</div>
                )}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* BY PROGRAM: DETAIL CARDS */}
        <div className="flex items-end justify-between mt-2 gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Program Breakdown
            </h2>
            <div className="text-xs text-[var(--text-tertiary)]">
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
                  "rounded-2xl bg-[var(--surface-card)] border border-[var(--border-primary)] p-4 flex flex-col gap-3",
                  "hover:bg-[var(--surface-card-hover)] hover:border-[var(--border-hover)] transition",
                  "shadow-[var(--shadow-card)]",
                )}
              >
                {/* header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <ProgramBadge program={p} />
                    <div className="min-w-0">
                      <div className="font-medium truncate text-[var(--text-primary)]">
                        {p.program_name}
                      </div>
                      <div className="text-[11px] text-[var(--text-tertiary)]">
                        {p.program_id}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)] whitespace-nowrap">
                    Total:{" "}
                    <span className="font-semibold text-[var(--text-primary)]">
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
                    <div className="h-1.5 w-full rounded-full bg-[var(--bar-bg)] overflow-hidden ring-1 ring-[var(--border-primary)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-cyan-300"
                        style={{ width: `${pct || 0}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-right text-[var(--text-muted)]">
                      สัดส่วน {pct.toFixed ? pct.toFixed(1) : pct}% ของ top
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {!byProgram.length && (
            <div className="rounded-2xl bg-[var(--surface-glass)] ring-1 ring-[var(--border-primary)] p-6 text-center text-[var(--text-tertiary)]">
              ยังไม่มี Program
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
