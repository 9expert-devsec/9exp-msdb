// src/app/(admin)/admin/9expert/promotion/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";       // 🆕 เพิ่มตัวนี้
import PromotionForm from "./PromotionForm";

import { HiOutlineEye } from "react-icons/hi2";

export const dynamic = "force-dynamic";

/* ------- small helpers ------- */
function TagChip({ tag }) {
  if (!tag) return null;
  const color = tag.color || "#0ea5e9";
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{
        backgroundColor: color + "22",
        color,
        border: `1px solid ${color}55`,
      }}
    >
      {tag.label}
    </span>
  );
}

function StatusBadge({ promotion }) {
  const now = new Date();
  const start = promotion.start_at ? new Date(promotion.start_at) : null;
  const end = promotion.end_at ? new Date(promotion.end_at) : null;

  let label = "No duration";
  let color = "#64748b";

  if (start && end) {
    if (now < start) {
      label = "Scheduled";
      color = "#0ea5e9";
    } else if (now > end) {
      label = "Expired";
      color = "#ef4444";
    } else {
      label = "Active";
      color = "#22c55e";
    }
  }

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{
        backgroundColor: color + "22",
        color,
        border: `1px solid ${color}55`,
      }}
    >
      {label}
    </span>
  );
}

function formatDuration(p) {
  const fmt = (d) =>
    new Date(d).toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  if (p.start_at && p.end_at) {
    return `${fmt(p.start_at)} – ${fmt(p.end_at)}`;
  }
  if (p.start_at) return `เริ่ม ${fmt(p.start_at)}`;
  if (p.end_at) return `ถึง ${fmt(p.end_at)}`;
  return "ไม่กำหนดช่วงเวลา";
}

/* ------- main page ------- */
export default function PromotionAdminPage() {
  const router = useRouter();                    // 🆕 ใช้ router
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  /* load promotions */
  const fetchItems = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (q) qs.set("q", q);
      if (tagFilter) qs.set("tag", tagFilter);
      if (statusFilter && statusFilter !== "all")
        qs.set("status", statusFilter);

      const res = await fetch(`/api/admin/promotions?${qs.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "โหลดรายการโปรโมชันไม่สำเร็จ");
      }
      setItems(data.items || []);
    } catch (e) {
      console.error(e);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  /* filter client side */
  const filtered = useMemo(() => {
    const now = new Date();
    return (items || []).filter((p) => {
      let ok = true;

      if (q) {
        const s = q.toLowerCase();
        const hay =
          (p.name || "") +
          " " +
          (p.slug || "") +
          " " +
          (p.detail_plain || "") +
          " " +
          (p.tags || []).map((t) => t.label).join(" ");
        if (!hay.toLowerCase().includes(s)) ok = false;
      }

      if (tagFilter) {
        const hasTag = (p.tags || []).some((t) => t.label === tagFilter);
        if (!hasTag) ok = false;
      }

      if (statusFilter !== "all") {
        const start = p.start_at ? new Date(p.start_at) : null;
        const end = p.end_at ? new Date(p.end_at) : null;
        let currentStatus = "no-duration";

        if (start && end) {
          if (now < start) currentStatus = "scheduled";
          else if (now > end) currentStatus = "expired";
          else currentStatus = "active";
        }

        if (statusFilter === "active" && currentStatus !== "active") ok = false;
        if (statusFilter === "scheduled" && currentStatus !== "scheduled")
          ok = false;
        if (statusFilter === "expired" && currentStatus !== "expired")
          ok = false;
      }

      return ok;
    });
  }, [items, q, tagFilter, statusFilter]);

  const allTagLabels = useMemo(() => {
    const set = new Set();
    (items || []).forEach((p) =>
      (p.tags || []).forEach((t) => t?.label && set.add(t.label))
    );
    return Array.from(set);
  }, [items]);

  /* lock scroll when modal open */
  useEffect(() => {
    const lock = editItem !== null;
    if (lock) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [editItem]);

  return (
    <div className="space-y-6">
      {/* header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Promotions</h1>
          <p className="text-sm text-slate-400 mt-1">
            จัดการโปรโมชันของ 9Expert: รูปปก, รายละเอียด, Tag,
            คอร์สที่เกี่ยวข้อง และช่วงเวลาแสดงผล
          </p>
        </div>
        <button
          onClick={() => setEditItem({})}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-sm font-medium shadow shadow-emerald-900/30"
        >
          <span className="text-lg leading-none">＋</span>
          <span>New Promotion</span>
        </button>
      </header>

      {/* filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, tag, detail..."
          className="w-full sm:w-72 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10 text-sm"
        />
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10 text-sm"
          style={{ colorScheme: "dark" }}
        >
          <option value="">All Tags</option>
          {allTagLabels.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10 text-sm"
          style={{ colorScheme: "dark" }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="scheduled">Scheduled</option>
          <option value="expired">Expired</option>
        </select>
        <button
          onClick={fetchItems}
          className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/20 text-sm"
        >
          Refresh
        </button>
      </div>

      {/* list as cards */}
      <div className="mt-2">
        {loading && (
          <div className="text-sm text-slate-400 mb-2">
            Loading promotions...
          </div>
        )}
        {!filtered.length && !loading && (
          <div className="text-sm text-slate-400">
            ยังไม่มีโปรโมชัน หรือไม่พบตามเงื่อนไขที่ค้นหา
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <article
              key={p._id}
              className="group flex flex-col rounded-2xl bg-slate-900/70 ring-1 ring-white/10 overflow-hidden hover:ring-emerald-400/70 hover:shadow-lg hover:shadow-emerald-900/40 transition cursor-pointer"
              onClick={() => setEditItem(p)}
            >
              {/* image */}
              <div className="relative w-full rounded-2xl bg-slate-800/40 border border-slate-700 overflow-hidden shadow-lg hover:shadow-xl transition">
                <a
                  href={`/admin/9expert/promotion/${p._id}/preview`}
                  onClick={(e) => {
                    // 🛑 กันไม่ให้ไป trigger onClick ของ Card
                    e.stopPropagation();
                    e.preventDefault();
                    router.push(
                      `/admin/9expert/promotion/${p._id}/preview`
                    );
                  }}
                  className="absolute top-3 right-3 z-20
               bg-white/10 backdrop-blur
               hover:bg-white/20
               text-white
               p-2 rounded-full
               shadow-md border border-white/20
               transition"
                  title="Preview"
                >
                  <HiOutlineEye className="h-5 w-5" />
                </a>

                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name || ""}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-slate-400 text-xs">
                    ไม่มีรูปปก
                  </div>
                )}

                <div className="absolute left-3 top-3 flex flex-wrap gap-1">
                  {(p.tags || []).slice(0, 3).map((t, idx) => (
                    <TagChip key={idx} tag={t} />
                  ))}
                  {p.tags && p.tags.length > 3 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/40 text-slate-200 border border-white/10">
                      +{p.tags.length - 3} more
                    </span>
                  )}
                </div>
                <div className="absolute right-3 bottom-3">
                  <StatusBadge promotion={p} />
                </div>
              </div>

              {/* body */}
              <div className="flex-1 flex flex-col p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-sm font-semibold line-clamp-2">
                    {p.name || "(no title)"}
                  </h2>
                  {p.is_pinned && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-400/15 text-yellow-300 border border-yellow-400/40">
                      Pinned
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 line-clamp-3">
                  {p.detail_plain ||
                    "ยังไม่มีสรุปย่อของโปรโมชัน (detail_plain)."}
                </p>

                <div className="mt-auto pt-2 border-t border-white/5 text-[11px] text-slate-400 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span>{formatDuration(p)}</span>
                    {p.external_url && (
                      <span className="text-emerald-400 group-hover:text-emerald-300">
                        มีลิงก์เพิ่มเติม →
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 text-[11px]">
                    {p.related_public_courses_count > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30">
                        Public: {p.related_public_courses_count}
                      </span>
                    )}
                    {p.related_online_courses_count > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                        Online: {p.related_online_courses_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* modal create/edit */}
      {editItem !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 p-0 sm:p-4">
          <div className="mx-auto w-full sm:max-w-6xl">
            <div className="rounded-2xl bg-slate-950 ring-1 ring-white/10 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 bg-slate-950/95 backdrop-blur">
                <h2 className="text-lg font-semibold">
                  {editItem?._id ? "Edit Promotion" : "New Promotion"}
                </h2>
                <button
                  onClick={() => setEditItem(null)}
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
                >
                  Close
                </button>
              </div>

              <div className="p-4">
                <PromotionForm
                  item={editItem}
                  onSaved={() => {
                    setEditItem(null);
                    fetchItems();
                  }}
                  onDeleted={() => {
                    setEditItem(null);
                    fetchItems();
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
