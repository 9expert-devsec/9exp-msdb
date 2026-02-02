// src/app/(admin)/admin/skills/page.jsx
"use client";

import { useEffect, useRef, useState } from "react";

/* -------------------- Small UI helpers -------------------- */
const FieldLabel = ({ children, hint }) => (
  <label className="block text-sm font-medium text-slate-200">
    {children}
    {hint && <span className="ml-2 text-xs text-slate-400">{hint}</span>}
  </label>
);

function SkillBadge({ skill }) {
  if (skill?.skilliconurl) {
    return (
      <img
        src={skill.skilliconurl}
        alt={`${skill.skill_name} icon`}
        loading="lazy"
        className="h-5 w-5 rounded-[6px] object-contain bg-white/5 ring-1 ring-white/10"
      />
    );
  }
  return (
    <span
      className="inline-block size-3 rounded-full ring-1 ring-white/10"
      style={{ background: skill?.skillcolor || "#8b5cf6" }}
    />
  );
}

/* -------------------- Skeleton -------------------- */
function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-white/10 ring-1 ring-white/10 ${className}`}
    />
  );
}

function SkillsSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <SkeletonBlock className="h-5 w-5 rounded-[6px]" />
                <SkeletonBlock className="h-5 w-44" />
                <SkeletonBlock className="h-4 w-24" />
              </div>
              <SkeletonBlock className="h-4 w-40" />
              <div className="flex flex-wrap gap-2">
                <SkeletonBlock className="h-6 w-24 rounded-full" />
                <SkeletonBlock className="h-6 w-28 rounded-full" />
                <SkeletonBlock className="h-6 w-20 rounded-full" />
              </div>
              <SkeletonBlock className="h-3 w-[520px] max-w-[60vw]" />
            </div>

            <div className="flex gap-2">
              <SkeletonBlock className="h-8 w-16 rounded-lg" />
              <SkeletonBlock className="h-8 w-16 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------- SkillForm (with Cloudinary upload) -------------------- */
function SkillForm({ item = {}, onSaved, onCancel }) {
  const [form, setForm] = useState({
    skill_id: "",
    skill_name: "",
    skilliconurl: "",
    skillcolor: "#8b5cf6",
    skill_teaser: "",
    skill_roadmap_url: "",
  });

  const [uploading, setUploading] = useState({ icon: false, roadmap: false });

  useEffect(() => {
    setForm((s) => ({
      ...s,
      ...item,
      skillcolor: item?.skillcolor || "#8b5cf6",
    }));
  }, [item]);

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const save = async () => {
    const method = item?._id ? "PATCH" : "POST";
    const url = item?._id ? `/api/skills/${item._id}` : `/api/skills`;
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) return alert("Save failed");
    onSaved?.();
  };

  const uploadToCloudinary = async (file, key, folder) => {
    if (!file) return;
    setUploading((u) => ({ ...u, [key]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json(); // { url, public_id, ... }
      if (key === "icon") set("skilliconurl", data.url);
      if (key === "roadmap") set("skill_roadmap_url", data.url);
    } catch (e) {
      alert("Upload failed: " + e.message);
    } finally {
      setUploading((u) => ({ ...u, [key]: false }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <FieldLabel>Skill ID</FieldLabel>
          <input
            className="inp"
            placeholder="เช่น DATA"
            value={form.skill_id}
            onChange={(e) => set("skill_id", e.target.value)}
          />
        </div>
        <div>
          <FieldLabel>Skill Name</FieldLabel>
          <input
            className="inp"
            placeholder="เช่น Data"
            value={form.skill_name}
            onChange={(e) => set("skill_name", e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <FieldLabel>Brand Color</FieldLabel>
          <div className="flex items-center gap-3">
            <input
              type="color"
              className="h-10 w-12 rounded-md border-2 border-white/40"
              value={form.skillcolor}
              onChange={(e) => set("skillcolor", e.target.value)}
            />
            <span className="text-xs text-slate-400">
              ใช้เป็นสีประจำสกิล (โชว์เป็นจุดสีในลิสต์)
            </span>
          </div>
        </div>

        {/* ICON UPLOAD */}
        <div className="sm:col-span-2">
          <FieldLabel hint={uploading.icon ? "กำลังอัปโหลด..." : ""}>
            Icon (skilliconurl)
          </FieldLabel>
          <div className="flex items-center gap-3">
            <input
              className="inp flex-1"
              placeholder="วาง URL เอง หรือกด Upload"
              value={form.skilliconurl}
              onChange={(e) => set("skilliconurl", e.target.value)}
            />
            <label className="btn cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  uploadToCloudinary(
                    e.target.files?.[0],
                    "icon",
                    "skills/icons",
                  )
                }
              />
              Upload
            </label>
            {form.skilliconurl && (
              <>
                <img
                  src={form.skilliconurl}
                  alt="icon"
                  className="h-10 w-10 rounded-md object-cover ring-1 ring-white/15"
                />
                <button
                  type="button"
                  onClick={() => set("skilliconurl", "")}
                  className="btn-subtle"
                >
                  ลบรูป
                </button>
              </>
            )}
          </div>
        </div>

        {/* ROADMAP UPLOAD */}
        <div className="sm:col-span-2">
          <FieldLabel hint={uploading.roadmap ? "กำลังอัปโหลด..." : ""}>
            Roadmap Image (skill_roadmap_url)
          </FieldLabel>
          <div className="flex items-center gap-3">
            <input
              className="inp flex-1"
              placeholder="วาง URL เอง หรือกด Upload"
              value={form.skill_roadmap_url}
              onChange={(e) => set("skill_roadmap_url", e.target.value)}
            />
            <label className="btn cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  uploadToCloudinary(
                    e.target.files?.[0],
                    "roadmap",
                    "skills/roadmaps",
                  )
                }
              />
              Upload
            </label>
            {form.skill_roadmap_url && (
              <>
                <img
                  src={form.skill_roadmap_url}
                  alt="roadmap"
                  className="h-10 w-16 rounded-md object-cover ring-1 ring-white/15"
                />
                <a
                  href={form.skill_roadmap_url}
                  target="_blank"
                  className="text-xs underline"
                  rel="noreferrer"
                >
                  เปิดรูป
                </a>
              </>
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <FieldLabel>Teaser</FieldLabel>
          <textarea
            className="ta min-h-[96px]"
            placeholder="คำโปรยของสกิล"
            value={form.skill_teaser}
            onChange={(e) => set("skill_teaser", e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
        <button onClick={onCancel} type="button" className="btn-subtle">
          Cancel
        </button>
        <button onClick={save} type="button" className="btn-primary">
          Save
        </button>
      </div>

      {/* local styles for stronger inputs */}
      <style jsx>{`
        .inp {
          width: 100%;
          background: rgba(15, 23, 42, 0.6); /* slate-900/60 */
          color: #e5e7eb;
          border: 2px solid rgba(255, 255, 255, 0.35);
          border-radius: 0.75rem;
          padding: 0.625rem 0.75rem;
          outline: none;
          transition:
            box-shadow 0.15s,
            border-color 0.15s;
        }
        .inp:focus {
          border-color: #34d399; /* emerald-400 */
          box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.2);
        }
        .ta {
          width: 100%;
          background: rgba(15, 23, 42, 0.6);
          color: #e5e7eb;
          border: 2px solid rgba(255, 255, 255, 0.35);
          border-radius: 0.75rem;
          padding: 0.625rem 0.75rem;
          outline: none;
          transition:
            box-shadow 0.15s,
            border-color 0.15s;
        }
        .ta:focus {
          border-color: #34d399;
          box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.2);
        }
        .btn {
          display: inline-block;
          padding: 0.5rem 0.75rem;
          border-radius: 0.75rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
        .btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .btn-subtle {
          padding: 0.5rem 0.75rem;
          border-radius: 0.75rem;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
        .btn-primary {
          padding: 0.5rem 0.9rem;
          border-radius: 0.75rem;
          background: #059669; /* emerald-600 */
        }
        .btn-primary:hover {
          background: #10b981; /* emerald-500 */
        }
      `}</style>
    </div>
  );
}

/* -------------------- Page: list + modal -------------------- */
export default function SkillsPage() {
  const [items, setItems] = useState([]);
  const [edit, setEdit] = useState(null);

  const [loadingItems, setLoadingItems] = useState(true);

  // กัน race / cancel
  const reqIdRef = useRef(0);
  const abortRef = useRef(null);

  const fetchItems = async () => {
    // cancel ก่อนหน้า
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {}
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoadingItems(true);
    const myReqId = ++reqIdRef.current;

    let res;
    try {
      res = await fetch("/api/skills?withPrograms=1", {
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (e) {
      if (e?.name === "AbortError") return;
      console.error("Fetch /api/skills network error:", e);
      alert("โหลด Skills ไม่สำเร็จ (network)");
      setLoadingItems(false);
      return;
    }

    let d;
    try {
      d = await res.json();
    } catch (e) {
      console.error("Fetch /api/skills json parse error:", e);
      alert("โหลด Skills ไม่สำเร็จ (invalid json)");
      setLoadingItems(false);
      return;
    }

    // ถ้ามี request ใหม่กว่า -> ไม่ set ทับ
    if (myReqId !== reqIdRef.current) return;

    if (!res.ok || d?.ok === false) {
      console.error("API /api/skills error:", d);
      alert(
        d?.error ? `โหลดข้อมูลล้มเหลว: ${d.error}` : "โหลด Skills ไม่สำเร็จ",
      );
      setLoadingItems(false);
      return;
    }

    setItems(d.items || []);
    setLoadingItems(false);
  };

  useEffect(() => {
    fetchItems();
    return () => {
      if (abortRef.current) {
        try {
          abortRef.current.abort();
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Skills</h1>
        <button
          onClick={() => setEdit({})}
          className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/20"
        >
          + New Skill
        </button>
      </header>

      {/* list */}
      {loadingItems ? (
        <SkillsSkeleton />
      ) : (
        <div className="grid gap-3">
          {items.map((s) => (
            <div
              key={s._id}
              className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <SkillBadge skill={s} />
                    <div className="text-lg font-medium">{s.skill_name}</div>
                    <div className="text-xs opacity-70">ID: {s.skill_id}</div>
                  </div>

                  <div className="text-sm opacity-80 mt-1">
                    Programs: {s.programCount || 0}
                  </div>

                  {!!s.programs?.length && (
                    <div className="text-sm mt-1 flex flex-wrap gap-2">
                      {s.programs.map((p) => (
                        <span
                          key={p._id}
                          className="inline-block text-xs px-2 py-1 rounded-full bg-white/10 ring-1 ring-white/10"
                        >
                          {p.program_name}
                        </span>
                      ))}
                    </div>
                  )}

                  {s.skill_teaser && (
                    <p className="text-sm opacity-80 mt-2">{s.skill_teaser}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setEdit(s)}
                    className="rounded-lg px-3 py-1 bg-white/10"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm("Delete?")) return;
                      await fetch(`/api/skills/${s._id}`, { method: "DELETE" });
                      fetchItems();
                    }}
                    className="rounded-lg px-3 py-1 bg-red-500/80 hover:bg-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!items.length && <div className="opacity-60">No skills found.</div>}
        </div>
      )}

      {/* Modal */}
      {edit !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 p-0 sm:p-4">
          <div className="mx-auto w-full sm:max-w-2xl">
            <div className="rounded-2xl bg-slate-900 ring-1 ring-white/10 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 bg-slate-900/95 backdrop-blur">
                <h2 className="text-lg font-semibold">
                  {edit?._id ? "Edit Skill" : "New Skill"}
                </h2>
                <button
                  onClick={() => setEdit(null)}
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20"
                >
                  Close
                </button>
              </div>

              <div className="p-4">
                <SkillForm
                  item={edit}
                  onSaved={() => {
                    setEdit(null);
                    fetchItems();
                  }}
                  onCancel={() => setEdit(null)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
