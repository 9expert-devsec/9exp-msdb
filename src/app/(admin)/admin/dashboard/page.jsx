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
    <div className="text-3xl font-semibold mt-1">{value?.toLocaleString?.() ?? value}</div>
    {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
  </div>
);

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    const res = await fetch("/api/stats", { cache: "no-store" });
    const d = await res.json();
    setData(d);
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-44 rounded bg-white/10" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_,i)=> <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
        <div className="h-6 w-40 rounded bg-white/10" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...Array(6)].map((_,i)=> <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const totals = data?.totals || {};
  const byProgram = data?.byProgram || [];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <button
          onClick={fetchStats}
          className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/20"
        >
          Refresh
        </button>
      </header>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Public Courses" value={totals.publicCourses} subtitle="จำนวนคอร์ส Public ทั้งหมด" />
        <StatCard title="Online Courses" value={totals.onlineCourses} subtitle="จำนวนคอร์ส Online ทั้งหมด" />
        <StatCard title="Programs" value={totals.programs} subtitle="จำนวนโปรแกรมทั้งหมด" />
        <StatCard title="Skills" value={totals.skills} subtitle="จำนวนสกิลทั้งหมด" />
      </div>

      {/* By Program */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">By Program</h2>
        <div className="text-sm text-slate-400">
          All Courses: <span className="text-slate-200 font-medium">{totals.allCourses?.toLocaleString?.()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {byProgram.map((p) => (
          <div key={p._id} className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ProgramBadge program={p} />
                <div className="font-medium">{p.program_name}</div>
              </div>
              <div className="text-sm text-slate-400">ทั้งหมด <span className="text-slate-200 font-semibold">{p.total}</span></div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/30 p-2">
                <div className="text-xs text-emerald-300">Public</div>
                <div className="text-xl font-semibold text-emerald-200">{p.publicCount}</div>
              </div>
              <div className="rounded-xl bg-sky-500/15 ring-1 ring-sky-500/30 p-2">
                <div className="text-xs text-sky-300">Online</div>
                <div className="text-xl font-semibold text-sky-200">{p.onlineCount}</div>
              </div>
              <div className="rounded-xl bg-white/10 ring-1 ring-white/15 p-2">
                <div className="text-xs text-slate-300">Total</div>
                <div className="text-xl font-semibold">{p.total}</div>
              </div>
            </div>
          </div>
        ))}
        {!byProgram.length && (
          <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-6 text-center text-slate-400">
            ยังไม่มี Program
          </div>
        )}
      </div>
    </div>
  );
}
