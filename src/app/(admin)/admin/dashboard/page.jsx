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
    {subtitle && (
      <div className="text-xs text-slate-400 mt-1">{subtitle}</div>
    )}
  </div>
);

/* ตัดชื่อให้สั้นสำหรับ label ในกราฟ */
function shortenName(name, max = 14) {
  if (!name) return "";
  return name.length > max ? name.slice(0, max - 1) + "…" : name;
}

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

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-44 rounded bg-white/10" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
        <div className="h-6 w-40 rounded bg-white/10" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const totals = data?.totals || {};
  const byProgram = data?.byProgram || [];

  /* ---------- chart data (ไม่ใช้ hook เพิ่ม) ---------- */
  const barData = (byProgram || []).map((p) => ({
    id: p._id,
    name: shortenName(p.program_name),
    total: p.total || 0,
  }));
  const maxTotal =
    barData.length > 0 ? Math.max(...barData.map((b) => b.total)) || 1 : 1;

  const topPrograms = [...byProgram]
    .sort((a, b) => (b.total || 0) - (a.total || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            ภาพรวมคอร์สทั้งหมดในระบบ 9Expert
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

      {/* MIDDLE ROW: GRAPH + SUMMARY */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Bar Chart */}
        <div className="xl:col-span-2 rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-semibold">Course by Program (Total)</h2>
              <p className="text-xs text-slate-400 mt-1">
                เปรียบเทียบจำนวนคอร์สในแต่ละ Program
              </p>
            </div>
            <div className="text-xs text-slate-400">
              All Courses:{" "}
              <span className="text-slate-200 font-semibold">
                {totals.allCourses?.toLocaleString?.()}
              </span>
            </div>
          </div>

          {/* ---- กราฟแท่ง ปรับความสูงให้เห็นชัด ๆ ---- */}
          <div className="mt-4 flex items-end gap-4 h-52 overflow-x-auto pr-2">
            {barData.map((b) => {
              const height = (b.total / maxTotal) * 100;
              return (
                <div
                  key={b.id}
                  className="flex flex-col items-center gap-1 min-w-[56px]"
                >
                  {/* value บนหัวแท่ง */}
                  <div className="text-[11px] text-slate-300 font-medium">
                    {b.total}
                  </div>
                  {/* แท่งกราฟ: กำหนด h-32 ให้ container มีความสูงแน่นอน */}
                  <div className="relative w-8 h-32 rounded-full bg-slate-900/70 overflow-hidden ring-1 ring-white/10">
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-400 to-sky-400"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  {/* label ด้านล่าง ตัดชื่อให้สั้น + จัดกลาง */}
                  <div className="text-[11px] text-slate-300 text-center leading-tight whitespace-nowrap">
                    {b.name}
                  </div>
                </div>
              );
            })}
            {!barData.length && (
              <div className="text-xs text-slate-400">
                ยังไม่มีข้อมูล Program
              </div>
            )}
          </div>
        </div>

        {/* Top Programs summary */}
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
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-4">#{idx + 1}</span>
                  <ProgramBadge program={p} />
                  <div>
                    <div className="text-sm">
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {byProgram.map((p) => (
          <div
            key={p._id}
            className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ProgramBadge program={p} />
                <div className="font-medium">{p.program_name}</div>
              </div>
              <div className="text-sm text-slate-400">
                ทั้งหมด{" "}
                <span className="text-slate-200 font-semibold">
                  {p.total}
                </span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/30 p-2">
                <div className="text-xs text-emerald-300">Public</div>
                <div className="text-xl font-semibold text-emerald-200">
                  {p.publicCount}
                </div>
              </div>
              <div className="rounded-xl bg-sky-500/15 ring-1 ring-sky-500/30 p-2">
                <div className="text-xs text-sky-300">Online</div>
                <div className="text-xl font-semibold text-sky-200">
                  {p.onlineCount}
                </div>
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
