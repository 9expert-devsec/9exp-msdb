"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PromotionForm from "../../PromotionForm";
import "@/styles/promotion-preview.css";

export const dynamic = "force-dynamic";

function TagChip({ tag }) {
  if (!tag) return null;
  const color = tag.color || "#0ea5e9";
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
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

export default function PromotionPreviewPage() {
  const { id } = useParams(); // ✅ ใช้ useParams แทน destructure จาก props
  const router = useRouter();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [editItem, setEditItem] = useState(null);

  // โหลดข้อมูลโปรโมชัน
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    async function fetchItem() {
      try {
        setLoading(true);
        setLoadError(null);

        const res = await fetch(`/api/admin/promotions?id=${id}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await res.json();

        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error || "Load failed");
        }

        // รองรับทั้งกรณี { item } หรือ { items: [...] }
        const one = data.item || data.items?.[0] || null;
        setItem(one);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error(err);
        setLoadError(err.message || "Load failed");
      } finally {
        setLoading(false);
      }
    }

    fetchItem();
    return () => controller.abort();
  }, [id]);

  // คำนวณสถานะ
  const now = new Date();
  let status = "Active";
  if (item?.start_at && new Date(item.start_at) > now) status = "Scheduled";
  if (item?.end_at && new Date(item.end_at) < now) status = "Expired";

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("th-TH", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";

  // Loading
  if (loading) {
    return (
      <div className="p-6 text-slate-300">Loading promotion detail...</div>
    );
  }

  // Error / not found
  if (loadError || !item) {
    return (
      <div className="p-6 text-red-400 flex items-center gap-2">
        <span>✖ Promotion not found</span>
        {loadError && (
          <span className="text-xs text-red-300">({loadError})</span>
        )}
      </div>
    );
  }

  const publicCourses = Array.isArray(item.related_public_courses)
    ? item.related_public_courses
    : [];
  const onlineCourses = Array.isArray(item.related_online_courses)
    ? item.related_online_courses
    : [];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          Preview: {item.name || "(no title)"}
        </h1>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setEditItem(item)}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm text-white"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Cover image */}
      {item.image_url && (
        <div className="rounded-2xl overflow-hidden shadow-lg bg-slate-900">
          <img
            src={item.image_url}
            alt={item.image_alt || item.name}
            className="w-full max-h-[420px] object-cover"
          />
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {item.tags?.map((t, i) => (
          <TagChip key={i} tag={t} />
        ))}
      </div>

      {/* Status / Duration */}
      <div className="text-sm text-slate-300 space-y-1">
        <div>
          <b>Status:</b>{" "}
          <span
            className={
              status === "Active"
                ? "text-emerald-400"
                : status === "Scheduled"
                ? "text-amber-400"
                : "text-red-400"
            }
          >
            {status}
          </span>
        </div>
        <div>
          <b>Duration:</b> {fmtDate(item.start_at)} → {fmtDate(item.end_at)}
        </div>
        {item.external_url && (
          <div>
            <b>Landing URL:</b>{" "}
            <a
              href={item.external_url}
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 hover:underline"
            >
              {item.external_url}
            </a>
          </div>
        )}
      </div>

      {/* Linked courses */}
            {/* Linked Courses */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">เชื่อมโยงกับคอร์ส</h2>

        <div className="text-sm text-slate-300 space-y-2">
          {!!item.related_public_courses?.length && (
            <div>
              <div className="text-slate-400 mb-1">📘 Public Courses</div>
              <ul className="list-disc ml-5">
                {item.related_public_courses.map((c) => {
                  const id = c._id || c; // เผื่อกรณียังเป็น string
                  const name = c.course_name || "";
                  const code = c.course_id || "";
                  return (
                    <li key={id}>
                      {name || code
                        ? `${name || ""}${name && code ? " " : ""}${
                            code ? `(${code})` : ""
                          }`
                        : String(id)}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {!!item.related_online_courses?.length && (
            <div>
              <div className="text-slate-400 mb-1">💻 Online Courses</div>
              <ul className="list-disc ml-5">
                {item.related_online_courses.map((c) => {
                  const id = c._id || c;
                  const name = c.o_course_name || "";
                  const code = c.o_course_id || "";
                  return (
                    <li key={id}>
                      {name || code
                        ? `${name || ""}${name && code ? " " : ""}${
                            code ? `(${code})` : ""
                          }`
                        : String(id)}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>


      {/* HTML Detail */}
      <div className="preview-html">
        <h2 className="text-lg font-semibold mb-2">รายละเอียดโปรโมชัน</h2>
        <div
          className="html-content"
          dangerouslySetInnerHTML={{ __html: item.detail_html || "" }}
        />
      </div>

      {/* Modal Edit ใช้ PromotionForm แบบเดียวกับหน้า list */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-black/60 p-0 sm:p-4">
          <div className="mx-auto w-full sm:max-w-6xl">
            <div className="rounded-2xl bg-slate-950 ring-1 ring-white/10 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 bg-slate-950/95 backdrop-blur">
                <h2 className="text-lg font-semibold">Edit Promotion</h2>
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
                  onSaved={(updated) => {
                    setEditItem(null);
                    setItem(updated); // อัปเดต preview ทันที
                  }}
                  onDeleted={() => {
                    setEditItem(null);
                    router.push("/admin/9expert/promotion");
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
