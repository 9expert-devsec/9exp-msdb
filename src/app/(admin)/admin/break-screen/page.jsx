// src/app/(admin)/admin/break-screen/page.jsx
// LIST of saved Break Screen profiles. The generator itself now lives in the
// create/edit form (./new and ./[id]/edit) — see _components/BreakScreenFormClient.
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cfgHash } from "@/lib/breakScreen";

// Base URL of the STATIC break screen (a DIFFERENT domain). Comes from an env
// var, never the request host. Set NEXT_PUBLIC_BREAK_SCREEN_URL in MSDB's
// deployment (e.g. https://break.9expert.app).
const BREAK_BASE = (
  process.env.NEXT_PUBLIC_BREAK_SCREEN_URL || "https://break.9expert.app"
).replace(/\/$/, "");

function extractList(json) {
  if (Array.isArray(json)) return json;
  return json?.items || json?.data || json?.rows || [];
}

export default function BreakScreenListPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(""); // "" | active | archived
  const [toast, setToast] = useState("");

  async function load() {
    try {
      setLoading(true);
      const qs = [];
      if (q.trim()) qs.push(`q=${encodeURIComponent(q.trim())}`);
      if (status) qs.push(`status=${status}`);
      const res = await fetch(
        `/api/admin/break-screen/profiles${qs.length ? `?${qs.join("&")}` : ""}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      setItems(extractList(json));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  }

  function copy(text, msg) {
    navigator.clipboard?.writeText(text).then(() => flash(msg || "คัดลอกแล้ว"));
  }

  function courseLink(slug) {
    return `${BREAK_BASE}/?course=${encodeURIComponent(slug)}`;
  }

  // #cfg= from the stored snapshot (applies descMaxLen, strips label) — mirrors
  // the static encodeCfg exactly via cfgHash().
  function cfgLink(item) {
    const hash = cfgHash({
      label: item.label,
      courses: item.courses,
      videos: item.videos,
      descMaxLen: item.descMaxLen,
    });
    return `${BREAK_BASE}/#cfg=${hash}`;
  }

  async function archive(item) {
    if (!window.confirm(`เก็บเข้าคลัง (archive) โปรไฟล์ "${item.slug}" ?`)) return;
    try {
      const res = await fetch(`/api/admin/break-screen/profiles/${item._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Archive failed");
      flash("เก็บเข้าคลังแล้ว");
      load();
    } catch (e) {
      alert(e.message || "ไม่สำเร็จ");
    }
  }

  const count = items.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Break Screen Profiles</h1>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            จัดการโปรไฟล์หน้าจอพักเบรก — แต่ละ slug คือคีย์ของ{" "}
            <code className="text-[var(--text-secondary)]">?course=&lt;slug&gt;</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/break-screen/export?download=1"
            className="inline-flex items-center gap-1 rounded-xl bg-[var(--surface-card-hover)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-card)]"
          >
            ⬇ ดาวน์โหลด profiles.json
          </a>
          <Link
            href="/admin/break-screen/new"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400"
          >
            <span className="text-lg leading-none">＋</span>
            สร้างโปรไฟล์ใหม่
          </Link>
        </div>
      </header>

      {/* Filters */}
      <section className="flex flex-wrap items-center gap-3 rounded-2xl bg-[var(--surface-card)] ring-1 ring-[var(--border-primary)] p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหา slug หรือ label..."
          className="w-full sm:w-64 rounded-xl bg-[var(--surface-card)] border border-[var(--border-primary)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-400"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-[var(--surface-card)] border border-[var(--border-primary)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)]"
        >
          <option value="">ทั้งหมด</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <div className="ml-auto text-xs text-[var(--text-tertiary)]">
          Profiles:{" "}
          <span className="text-[var(--text-primary)] font-semibold">{count}</span>
        </div>
      </section>

      {/* Table */}
      <section className="rounded-2xl bg-[var(--surface-card)] ring-1 ring-[var(--border-primary)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-primary)]">
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Instructor</th>
                <th className="px-4 py-3 text-center">Courses</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border-primary)]">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="h-6 rounded bg-[var(--surface-glass)] animate-pulse" />
                    </td>
                  </tr>
                ))}

              {!loading &&
                items.map((it) => (
                  <tr
                    key={it._id}
                    className="border-b border-[var(--border-primary)] hover:bg-[var(--surface-card-hover)]/40"
                  >
                    <td className="px-4 py-3 font-mono text-xs">{it.slug}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">
                      {it.label || (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {it.instructor?.name || (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {Array.isArray(it.courses) ? it.courses.length : 0}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] rounded-full px-2 py-0.5 ${
                          it.status === "active"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-slate-500/15 text-slate-400"
                        }`}
                      >
                        {it.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-[var(--text-muted)]">
                      {it.updatedAt
                        ? new Date(it.updatedAt).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/break-screen/${it._id}/edit`}
                          className="rounded-lg bg-[var(--surface-card-hover)] px-2 py-1 text-[11px] hover:bg-[var(--surface-card)]"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() =>
                            copy(courseLink(it.slug), "คัดลอกลิงก์ ?course= แล้ว")
                          }
                          className="rounded-lg bg-sky-500/15 text-sky-400 px-2 py-1 text-[11px] hover:bg-sky-500/25"
                        >
                          ?course=
                        </button>
                        <button
                          onClick={() => copy(cfgLink(it), "คัดลอกลิงก์ #cfg= แล้ว")}
                          className="rounded-lg bg-emerald-500/15 text-emerald-400 px-2 py-1 text-[11px] hover:bg-emerald-500/25"
                        >
                          #cfg=
                        </button>
                        {it.status === "active" && (
                          <button
                            onClick={() => archive(it)}
                            className="rounded-lg bg-rose-600/80 text-white px-2 py-1 text-[11px] hover:bg-rose-500"
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

              {!loading && !items.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-[var(--text-tertiary)]"
                  >
                    ยังไม่มีโปรไฟล์ — กด{" "}
                    <span className="font-semibold text-[var(--accent-emerald)]">
                      สร้างโปรไฟล์ใหม่
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 text-white text-sm px-4 py-2 shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
