"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

function clean(x) {
  return String(x ?? "").trim();
}
function money(n) {
  const v = Number(n || 0) || 0;
  return v.toLocaleString();
}

function StatusPill({ status }) {
  const cls =
    status === "active"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/40"
      : "bg-amber-500/15 text-amber-300 border-amber-400/40";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${cls}`}
    >
      {status}
    </span>
  );
}

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-[var(--surface-glass-hover)] ${className}`} />;
}

function ListSkeleton() {
  return (
    <div className="space-y-4">
      {/* header skeleton */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>

      {/* filter skeleton */}
      <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-card)] p-4 flex flex-wrap gap-3 items-center">
        <Skeleton className="h-10 w-80 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>

      {/* cards skeleton */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-card)] overflow-hidden"
          >
            <Skeleton className="aspect-[16/9] w-full rounded-none" />
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-40" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default function CareerPathAdminListPage() {
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total: 0, page: 1, limit: 24 });

  const queryStr = useMemo(() => {
    const sp = new URLSearchParams();
    if (clean(q)) sp.set("q", clean(q));
    if (status !== "all") sp.set("status", status);
    sp.set("page", String(summary.page || 1));
    sp.set("limit", String(summary.limit || 24));
    return sp.toString();
  }, [q, status, summary.page, summary.limit]);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/career-path?${queryStr}`, {
        cache: "no-store",
      });
      const j = await r.json();
      setItems(j.items || []);
      setSummary(j.summary || { total: 0, page: 1, limit: 24 });
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryStr]);

  if (loading) {
    return (

        <ListSkeleton />

    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Career Path</h1>
          <div className="text-sm text-white/50">ทั้งหมด {summary.total || 0} รายการ</div>
        </div>

        <Link
          href="/admin/career-path/new"
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm text-white hover:bg-emerald-600"
        >
          + Add Career Path
        </Link>
      </div>

      {/* filters */}
      <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-card)] p-4 flex flex-wrap gap-3 items-center">
        <input
          className="w-80 max-w-full rounded-xl border border-[var(--border-primary)] bg-slate-900/40 px-3 py-2 text-sm text-white/85 outline-none"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหา title / slug ..."
        />

        <select
          className="rounded-xl border border-[var(--border-primary)] bg-slate-900/40 px-3 py-2 text-sm text-white/85 outline-none"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">ทั้งหมด</option>
          <option value="active">active</option>
          <option value="offline">offline</option>
        </select>

        <button
          type="button"
          onClick={() => load()}
          className="rounded-xl border border-[var(--border-primary)] bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-[var(--surface-glass-hover)]"
        >
          Refresh
        </button>
      </div>

      {/* grid */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-card)] p-6 text-white/60">
          ไม่พบรายการ
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {items.map((it) => {
            const cover = it?.coverImage?.url || "";
            const s = it?.stats || {};
            const courseLabel =
              s.minCourseCount === s.maxCourseCount
                ? `${s.courseCount || 0}`
                : `${s.minCourseCount || 0}-${s.maxCourseCount || 0}`;
            const dayLabel =
              s.minDayCount === s.maxDayCount
                ? `${s.dayCount || 0}`
                : `${s.minDayCount || 0}-${s.maxDayCount || 0}`;

            return (
              <Link
                key={it._id}
                href={`/admin/career-path/${it._id}/edit`}
                className="group rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-card)] overflow-hidden hover:bg-white/5 transition"
              >
                <div className="aspect-[16/9] bg-slate-900/40">
                  {cover ? (
                    <img
                      src={cover}
                      alt={it?.coverImage?.alt || it?.title || "cover"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-white/30 text-sm">
                      No cover
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-white line-clamp-1">{it.title}</div>
                    <StatusPill status={it.status} />
                  </div>

                  {it.cardDetail ? (
                    <div className="text-sm text-white/60 line-clamp-2">{it.cardDetail}</div>
                  ) : (
                    <div className="text-sm text-white/35 line-clamp-2">
                      (ยังไม่มีคำอธิบายสั้น)
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div className="text-white/70">
                      {courseLabel} หลักสูตร • {dayLabel} วัน
                    </div>

                    <div className="text-right">
                      <div className="text-white/40 line-through">
                        ฿{money(it?.price?.fullPrice || 0)}
                      </div>
                      <div className="text-rose-300 font-semibold">
                        ฿{money(it?.price?.salePrice || 0)}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-white/40">
                    slug: <span className="text-white/55">{it.slug}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}