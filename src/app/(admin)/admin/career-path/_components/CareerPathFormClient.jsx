// src/app/(admin)/admin/career-path/_components/CareerPathFormClient.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* ================= helpers ================= */

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

function clean(x) {
  return String(x ?? "").trim();
}

function slugify(s) {
  return clean(s)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseLines(text) {
  return String(text || "")
    .split("\n")
    .map((v) => clean(v))
    .filter(Boolean);
}

function LinesBox({ label, value, onChange, hint }) {
  return (
    <div>
      <div className="text-sm text-white/70 mb-1">
        {label} {hint && <span className="text-white/40">({hint})</span>}
      </div>
      <textarea
        className="w-full min-h-[110px] rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
        value={(value || []).join("\n")}
        onChange={(e) => onChange(parseLines(e.target.value))}
        placeholder="พิมพ์ทีละบรรทัด..."
      />
    </div>
  );
}

function defaultDraft() {
  return {
    title: "",
    slug: "",
    status: "offline",
    isPinned: false,
    sortOrder: 0,

    coverImage: { url: "", publicId: "", alt: "" },
    roadmapImage: { url: "", publicId: "", alt: "" },

    cardDetail: "",
    price: { fullPrice: 0, salePrice: 0, discountPct: 0, currency: "THB" },
    links: { detailUrl: "", signupUrl: "", outlineUrl: "" },

    detail: {
      tagline: "",
      intro: "",
      objectives: [],
      suitableFor: [],
      prerequisites: [],
      benefits: [],
      contentHtml: "",
    },

    curriculum: [],
    stats: {
      courseCount: 0,
      dayCount: 0,
      hourCount: 0,
      minCourseCount: 0,
      maxCourseCount: 0,
      minDayCount: 0,
      maxDayCount: 0,
    },
  };
}

/* ================= Image Uploader (Cloudinary) ================= */

function ImageUploader({
  label,
  value,
  onChange,
  folder = "msdb/career-path",
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function pickAndUpload(file) {
    if (!file) return;

    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);

      const r = await fetch("/api/admin/upload/career-path-image", {
        method: "POST",
        body: fd,
      });

      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "upload failed");

      onChange({
        url: j.url || "",
        publicId: j.publicId || "",
        alt: value?.alt || "",
      });
    } catch (e) {
      console.error(e);
      alert(e?.message || "upload error");
    } finally {
      setUploading(false);
    }
  }

  async function onFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // เลือกไฟล์เดิมซ้ำได้
    await pickAndUpload(file);
  }

  async function onRemove() {
    const publicId = value?.publicId || "";
    if (publicId) {
      const ok = confirm("ลบรูปนี้ออกจาก Cloudinary ด้วยไหม?");
      if (ok) {
        try {
          const r = await fetch("/api/admin/upload/career-path-image", {
            method: "DELETE",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ publicId }),
          });
          const j = await r.json();
          if (!r.ok) throw new Error(j?.error || "delete failed");
        } catch (e) {
          console.error(e);
          alert(e?.message || "delete error");
        }
      }
    }

    onChange({ url: "", publicId: "", alt: value?.alt || "" });
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-white/70">{label}</div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="flex-1 min-w-[260px] rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
          value={value?.url || ""}
          onChange={(e) => onChange({ ...(value || {}), url: e.target.value })}
          placeholder="https://..."
        />

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />

        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-60"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>

        <button
          type="button"
          onClick={onRemove}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-rose-300 hover:bg-white/10"
        >
          Remove
        </button>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <input
          className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
          value={value?.alt || ""}
          onChange={(e) => onChange({ ...(value || {}), alt: e.target.value })}
          placeholder="alt text"
        />

        {value?.url ? (
          <div className="rounded-xl border border-white/10 bg-slate-900/30 overflow-hidden">
            <img
              src={value.url}
              alt={value.alt || "preview"}
              className="h-24 w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="h-24 rounded-xl border border-white/10 bg-slate-900/20 flex items-center justify-center text-xs text-white/40">
            No preview
          </div>
        )}
      </div>

      {value?.publicId ? (
        <div className="text-xs text-white/40">publicId: {value.publicId}</div>
      ) : null}
    </div>
  );
}

/* ================= curriculum helpers ================= */

function newBlock(kind = "fixed") {
  return {
    kind,
    title: kind === "choice" ? "เลือกเรียนระหว่าง" : "Core Courses",
    description: "",
    chooseMin: kind === "choice" ? 1 : 0,
    chooseMax: kind === "choice" ? 1 : 0,
    items: [],
    sortOrder: 0,
  };
}

function badgeStatus(status) {
  return status === "active"
    ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/40"
    : "bg-amber-500/15 text-amber-300 border-amber-400/40";
}

function BlockEditor({
  block,
  index,
  onChange,
  onRemove,
  courseOptions,
  courseOptionsLoading,
}) {
  const isChoice = block.kind === "choice"; // ✅ FIX: ต้องมีบรรทัดนี้
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const f = clean(filter).toLowerCase();
    const list = Array.isArray(courseOptions) ? courseOptions : [];
    if (!f) return list.slice(0, 200);

    return list
      .filter((c) => {
        const code = String(c.code || "").toLowerCase();
        const name = String(c.name || "").toLowerCase();
        return code.includes(f) || name.includes(f);
      })
      .slice(0, 200);
  }, [filter, courseOptions]);

  function addCourse(course) {
    if (!course?.id) return;

    const items = Array.isArray(block.items) ? [...block.items] : [];
    if (items.some((it) => String(it.publicCourse) === String(course.id)))
      return;

    items.push({
      kind: "public",
      publicCourse: course.id,
      note: "",
      snap: {
        code: course.code,
        name: course.name,
        teaser: course.teaser,
        days: course.days,
        hours: course.hours,
        price: course.price,
        imageUrl: course.imageUrl,
        publicUrl: course.publicUrl,
      },
      sortOrder: items.length,
    });

    onChange({ ...block, items });
  }

  function removeItem(i) {
    const items = [...(block.items || [])];
    items.splice(i, 1);
    onChange({
      ...block,
      items: items.map((x, idx) => ({ ...x, sortOrder: idx })),
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-white/85 font-semibold">
          Block #{index + 1}{" "}
          <span className="ml-2 text-xs px-2 py-0.5 rounded-full border border-white/10 text-white/60">
            {block.kind}
          </span>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="text-sm text-rose-300 hover:text-rose-200"
        >
          ลบ Block
        </button>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-sm text-white/70 mb-1">ชนิด</div>
          <select
            className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
            value={block.kind}
            onChange={(e) => {
              const k = e.target.value === "choice" ? "choice" : "fixed";
              const next = { ...block, kind: k };
              if (k === "fixed") {
                next.chooseMin = 0;
                next.chooseMax = 0;
              } else {
                next.chooseMin = Math.max(1, Number(next.chooseMin || 1));
                next.chooseMax = Math.max(
                  next.chooseMin,
                  Number(next.chooseMax || 1),
                );
              }
              onChange(next);
            }}
          >
            <option value="fixed">fixed (ต้องเรียนทั้งหมด)</option>
            <option value="choice">choice (เลือกเรียนระหว่าง)</option>
          </select>
        </div>

        <div>
          <div className="text-sm text-white/70 mb-1">หัวข้อ Block</div>
          <input
            className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
            value={block.title || ""}
            onChange={(e) => onChange({ ...block, title: e.target.value })}
          />
        </div>

        <div className="md:col-span-2">
          <div className="text-sm text-white/70 mb-1">คำอธิบาย (ถ้ามี)</div>
          <input
            className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
            value={block.description || ""}
            onChange={(e) =>
              onChange({ ...block, description: e.target.value })
            }
          />
        </div>

        {isChoice && (
          <>
            <div>
              <div className="text-sm text-white/70 mb-1">
                เลือกอย่างน้อย (chooseMin)
              </div>
              <input
                type="number"
                className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
                value={block.chooseMin ?? 1}
                onChange={(e) =>
                  onChange({ ...block, chooseMin: Number(e.target.value || 1) })
                }
                min={0}
              />
            </div>
            <div>
              <div className="text-sm text-white/70 mb-1">
                เลือกได้สูงสุด (chooseMax)
              </div>
              <input
                type="number"
                className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
                value={block.chooseMax ?? 1}
                onChange={(e) =>
                  onChange({ ...block, chooseMax: Number(e.target.value || 1) })
                }
                min={0}
              />
            </div>
          </>
        )}
      </div>

      {/* Add course */}
      <div className="mt-4">
        <div className="text-sm text-white/70 mb-1">
          เพิ่มหลักสูตร (Dropdown จาก PublicCourse)
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
            placeholder="พิมพ์เพื่อกรอง เช่น MSE-L4 หรือ Excel..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />

          <select
            className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
            defaultValue=""
            onChange={(e) => {
              const id = e.target.value;
              e.target.value = "";
              const c = (courseOptions || []).find(
                (x) => String(x.id) === String(id),
              );
              if (c) addCourse(c);
            }}
            disabled={courseOptionsLoading}
          >
            <option value="">
              {courseOptionsLoading
                ? "กำลังโหลดรายการคอร์ส..."
                : "-- เลือกคอร์สเพื่อเพิ่ม --"}
            </option>

            {filtered.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-1 text-xs text-white/40">
          * ถ้าคอร์สเยอะ ระบบจะแสดงผลลัพธ์ที่กรองได้สูงสุด 200 รายการต่อครั้ง
        </div>
      </div>

      {/* Items list */}
      <div className="mt-4">
        <div className="text-sm text-white/70 mb-2">รายการหลักสูตรใน Block</div>

        {!block.items || block.items.length === 0 ? (
          <div className="text-sm text-white/40">ยังไม่มีหลักสูตร</div>
        ) : (
          <div className="space-y-2">
            {block.items.map((it, i) => (
              <div
                key={`${it.kind}-${it.publicCourse || it.externalName || i}`}
                className="rounded-xl border border-white/10 bg-slate-900/30 px-3 py-2 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm text-white/90 font-medium truncate">
                    {it.snap?.code ? `${it.snap.code} — ` : ""}
                    {it.snap?.name || it.externalName || "(no name)"}
                  </div>
                  <div className="text-xs text-white/50">
                    {Number(it.snap?.days || 0)} วัน •{" "}
                    {Number(it.snap?.hours || 0)} ชม. • ฿
                    {Number(it.snap?.price || 0).toLocaleString()}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="text-sm text-rose-300 hover:text-rose-200 shrink-0"
                >
                  ลบ
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= main form ================= */

export default function CareerPathFormClient({ id }) {
  const router = useRouter();

  const isEdit = !!id;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [tab, setTab] = useState("card"); // card | detail | curriculum | publish
  const [draft, setDraft] = useState(defaultDraft());

  const [courseOptions, setCourseOptions] = useState([]);
  const [courseOptionsLoading, setCourseOptionsLoading] = useState(true);

  // load all public courses once
  useEffect(() => {
    let cancel = false;

    (async () => {
      try {
        setCourseOptionsLoading(true);
        const r = await fetch(
          "/api/admin/career-path/search-public-courses?all=1&limit=5000",
          { cache: "no-store" },
        );
        const j = await r.json();
        if (!cancel) setCourseOptions(j.items || []);
      } catch (e) {
        console.error(e);
        if (!cancel) setCourseOptions([]);
      } finally {
        if (!cancel) setCourseOptionsLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, []);

  const statsLabel = useMemo(() => {
    const s = draft.stats || {};
    const course =
      s.minCourseCount === s.maxCourseCount
        ? `${s.courseCount || 0}`
        : `${s.minCourseCount || 0}-${s.maxCourseCount || 0}`;
    const day =
      s.minDayCount === s.maxDayCount
        ? `${s.dayCount || 0}`
        : `${s.minDayCount || 0}-${s.maxDayCount || 0}`;
    return `${course} หลักสูตร • ${day} วัน`;
  }, [draft.stats]);

  // load item for edit
  useEffect(() => {
    if (!isEdit) return;

    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`/api/admin/career-path/${id}`, {
          cache: "no-store",
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Load failed");
        setDraft({ ...defaultDraft(), ...(j.item || {}) });
      } catch (e) {
        console.error(e);
        alert("โหลดข้อมูล Career Path ไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  async function onSave() {
    const title = clean(draft.title);
    const slug = clean(draft.slug);

    if (!title) return alert("กรุณากรอก Title");
    if (!slug) return alert("กรุณากรอก Slug");

    setSaving(true);
    try {
      const url = isEdit
        ? `/api/admin/career-path/${id}`
        : `/api/admin/career-path`;
      const method = isEdit ? "PATCH" : "POST";

      const r = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });

      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Save failed");

      alert("บันทึกแล้ว");
      router.push("/admin/career-path");
      router.refresh();
    } catch (e) {
      console.error(e);
      alert(e?.message || "Save error");
    } finally {
      setSaving(false);
    }
  }

  function addBlock(kind) {
    const curr = Array.isArray(draft.curriculum) ? [...draft.curriculum] : [];
    const b = newBlock(kind);
    b.sortOrder = curr.length;
    curr.push(b);
    setDraft({ ...draft, curriculum: curr });
  }

  function updateBlock(i, next) {
    const curr = [...(draft.curriculum || [])];
    curr[i] = next;
    setDraft({ ...draft, curriculum: curr });
  }

  function removeBlock(i) {
    const curr = [...(draft.curriculum || [])];
    curr.splice(i, 1);
    setDraft({
      ...draft,
      curriculum: curr.map((b, idx) => ({ ...b, sortOrder: idx })),
    });
  }

  if (loading) return <div className="p-6 text-white/70">Loading…</div>;

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold text-white">
            {isEdit ? "Edit Career Path" : "Add Career Path"}
          </div>
          <div className="mt-1 text-sm text-white/50">
            <span
              className={cx(
                "inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs",
                badgeStatus(draft.status),
              )}
            >
              {draft.status}
            </span>
            <span className="ml-2">{statsLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/career-path"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            Back
          </Link>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm text-white hover:bg-emerald-600 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          ["card", "Card"],
          ["detail", "Detail"],
          ["curriculum", "Curriculum"],
          ["publish", "Publish"],
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cx(
              "rounded-xl border px-3 py-2 text-sm",
              tab === k
                ? "border-sky-400/60 bg-sky-500/10 text-sky-200"
                : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Card tab */}
      {tab === "card" && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-sm text-white/70 mb-1">Title</div>
              <input
                className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>

            <div>
              <div className="text-sm text-white/70 mb-1 flex items-center justify-between">
                <span>Slug</span>
                <button
                  type="button"
                  className="text-xs text-sky-300 hover:text-sky-200"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      slug: draft.slug || slugify(draft.title),
                    })
                  }
                >
                  Generate from title
                </button>
              </div>
              <input
                className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <div className="text-sm text-white/70 mb-1">
                Card detail (คำอธิบายสั้นบนการ์ด)
              </div>
              <textarea
                className="w-full min-h-[80px] rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
                value={draft.cardDetail}
                onChange={(e) =>
                  setDraft({ ...draft, cardDetail: e.target.value })
                }
              />
            </div>
          </div>

          <ImageUploader
            label="Cover image"
            value={draft.coverImage || { url: "", publicId: "", alt: "" }}
            onChange={(img) => setDraft({ ...draft, coverImage: img })}
          />

          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <div className="text-sm text-white/70 mb-1">Full price</div>
              <input
                type="number"
                className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
                value={draft.price?.fullPrice ?? 0}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    price: {
                      ...(draft.price || {}),
                      fullPrice: Number(e.target.value || 0),
                    },
                  })
                }
              />
            </div>
            <div>
              <div className="text-sm text-white/70 mb-1">Sale price</div>
              <input
                type="number"
                className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
                value={draft.price?.salePrice ?? 0}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    price: {
                      ...(draft.price || {}),
                      salePrice: Number(e.target.value || 0),
                    },
                  })
                }
              />
            </div>
            <div>
              <div className="text-sm text-white/70 mb-1">Discount %</div>
              <input
                type="number"
                className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
                value={draft.price?.discountPct ?? 0}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    price: {
                      ...(draft.price || {}),
                      discountPct: Number(e.target.value || 0),
                    },
                  })
                }
              />
            </div>
            <div>
              <div className="text-sm text-white/70 mb-1">Currency</div>
              <input
                className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
                value={draft.price?.currency || "THB"}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    price: { ...(draft.price || {}), currency: e.target.value },
                  })
                }
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <div className="text-sm text-white/70 mb-1">Detail URL</div>
              <input
                className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
                value={draft.links?.detailUrl || ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    links: {
                      ...(draft.links || {}),
                      detailUrl: e.target.value,
                    },
                  })
                }
                placeholder="/prompt-engineer-career-path"
              />
            </div>
            <div>
              <div className="text-sm text-white/70 mb-1">Signup URL</div>
              <input
                className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
                value={draft.links?.signupUrl || ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    links: {
                      ...(draft.links || {}),
                      signupUrl: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div>
              <div className="text-sm text-white/70 mb-1">Outline URL</div>
              <input
                className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
                value={draft.links?.outlineUrl || ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    links: {
                      ...(draft.links || {}),
                      outlineUrl: e.target.value,
                    },
                  })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Detail tab */}
      {tab === "detail" && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-5 space-y-4">
          <ImageUploader
            label="Roadmap image"
            value={draft.roadmapImage || { url: "", publicId: "", alt: "" }}
            onChange={(img) => setDraft({ ...draft, roadmapImage: img })}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-sm text-white/70 mb-1">Tagline</div>
              <input
                className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
                value={draft.detail?.tagline || ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    detail: {
                      ...(draft.detail || {}),
                      tagline: e.target.value,
                    },
                  })
                }
              />
            </div>

            <div>
              <div className="text-sm text-white/70 mb-1">Intro</div>
              <input
                className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
                value={draft.detail?.intro || ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    detail: { ...(draft.detail || {}), intro: e.target.value },
                  })
                }
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <LinesBox
              label="วัตถุประสงค์"
              value={draft.detail?.objectives || []}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  detail: { ...(draft.detail || {}), objectives: v },
                })
              }
            />
            <LinesBox
              label="เหมาะกับใคร"
              value={draft.detail?.suitableFor || []}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  detail: { ...(draft.detail || {}), suitableFor: v },
                })
              }
            />
            <LinesBox
              label="ความรู้พื้นฐาน"
              value={draft.detail?.prerequisites || []}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  detail: { ...(draft.detail || {}), prerequisites: v },
                })
              }
            />
            <LinesBox
              label="ประโยชน์ที่จะได้รับ"
              value={draft.detail?.benefits || []}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  detail: { ...(draft.detail || {}), benefits: v },
                })
              }
            />
          </div>
        </div>
      )}

      {/* Curriculum tab */}
      {tab === "curriculum" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => addBlock("fixed")}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              + Add fixed block
            </button>
            <button
              type="button"
              onClick={() => addBlock("choice")}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              + Add choice block
            </button>

            <span className="ml-auto text-sm text-white/50">
              * Save แล้วระบบจะอัปเดต stats ให้อัตโนมัติ
            </span>
          </div>

          {(draft.curriculum || []).length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-5 text-white/50">
              ยังไม่มี curriculum block — กดปุ่มด้านบนเพื่อเริ่มเพิ่ม
            </div>
          ) : (
            <div className="space-y-3">
              {draft.curriculum.map((b, i) => (
                <BlockEditor
                  key={`block-${i}`}
                  block={b}
                  index={i}
                  onChange={(next) => updateBlock(i, next)}
                  onRemove={() => removeBlock(i)}
                  courseOptions={courseOptions}
                  courseOptionsLoading={courseOptionsLoading}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Publish tab */}
      {tab === "publish" && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <div className="text-sm text-white/70 mb-1">Status</div>
              <select
                className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value })}
              >
                <option value="offline">offline (ซ่อน/กำลังปรับปรุง)</option>
                <option value="active">active (แสดงบนเว็บ)</option>
              </select>
            </div>

            <div>
              <div className="text-sm text-white/70 mb-1">Pinned</div>
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85">
                <input
                  type="checkbox"
                  checked={!!draft.isPinned}
                  onChange={(e) =>
                    setDraft({ ...draft, isPinned: e.target.checked })
                  }
                />
                Featured / pinned
              </label>
            </div>

            <div>
              <div className="text-sm text-white/70 mb-1">Sort order</div>
              <input
                type="number"
                className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-white/85 outline-none"
                value={draft.sortOrder ?? 0}
                onChange={(e) =>
                  setDraft({ ...draft, sortOrder: Number(e.target.value || 0) })
                }
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            <div className="font-semibold text-white/85 mb-1">Stats (auto)</div>
            <div>
              Courses:{" "}
              <b className="text-white">
                {draft.stats?.minCourseCount === draft.stats?.maxCourseCount
                  ? draft.stats?.courseCount
                  : `${draft.stats?.minCourseCount}-${draft.stats?.maxCourseCount}`}
              </b>
              {" • "}
              Days:{" "}
              <b className="text-white">
                {draft.stats?.minDayCount === draft.stats?.maxDayCount
                  ? draft.stats?.dayCount
                  : `${draft.stats?.minDayCount}-${draft.stats?.maxDayCount}`}
              </b>
              {" • "}
              Hours: <b className="text-white">{draft.stats?.hourCount || 0}</b>
            </div>
            <div className="mt-1 text-white/50">
              * ระบบจะคำนวณจาก curriculum ตอน Save
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
