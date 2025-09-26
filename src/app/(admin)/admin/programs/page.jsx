"use client";

import { useEffect, useState } from "react";

/* -------------------- Small UI helpers -------------------- */
const FieldLabel = ({ children, hint }) => (
  <label className="block text-sm font-medium text-slate-200">
    {children}
    {hint && <span className="ml-2 text-xs text-slate-400">{hint}</span>}
  </label>
);

function ProgramBadge({ program }) {
  if (program?.programiconurl) {
    return (
      <img
        src={program.programiconurl}
        alt={`${program.program_name} icon`}
        loading="lazy"
        className="h-5 w-5 rounded-[6px] object-contain bg-white/5 ring-1 ring-white/10"
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

/* -------------------- ProgramForm (with Cloudinary upload) -------------------- */
function ProgramForm({ item = {}, onSaved, onCancel }) {
  const [form, setForm] = useState({
    program_id: "",
    program_name: "",
    programiconurl: "",
    programcolor: "#0ea5e9",
    program_teaser: "",
    program_roadmap_url: "",
  });

  const [uploading, setUploading] = useState({ icon: false, roadmap: false });

  useEffect(() => {
    setForm((s) => ({
      ...s,
      ...item,
      programcolor: item?.programcolor || "#0ea5e9",
    }));
  }, [item]);

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const save = async () => {
    const method = item?._id ? "PATCH" : "POST";
    const url = item?._id ? `/api/programs/${item._id}` : `/api/programs`;
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
      if (key === "icon") set("programiconurl", data.url);
      if (key === "roadmap") set("program_roadmap_url", data.url);
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
          <FieldLabel>Program ID</FieldLabel>
          <input
            className="inp"
            placeholder="เช่น PBI"
            value={form.program_id}
            onChange={(e) => set("program_id", e.target.value)}
          />
        </div>
        <div>
          <FieldLabel>Program Name</FieldLabel>
          <input
            className="inp"
            placeholder="เช่น Power BI"
            value={form.program_name}
            onChange={(e) => set("program_name", e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <FieldLabel>Brand Color</FieldLabel>
          <div className="flex items-center gap-3">
            <input
              type="color"
              className="h-10 w-12 rounded-md border-2 border-white/40"
              value={form.programcolor}
              onChange={(e) => set("programcolor", e.target.value)}
            />
            <span className="text-xs text-slate-400">
              ใช้เป็นสีประจำโปรแกรม (โชว์เป็นจุดสีในลิสต์)
            </span>
          </div>
        </div>

        {/* ICON UPLOAD */}
        <div className="sm:col-span-2">
          <FieldLabel hint={uploading.icon ? "กำลังอัปโหลด..." : ""}>
            Icon (programiconurl)
          </FieldLabel>
          <div className="flex items-center gap-3">
            <input
              className="inp flex-1"
              placeholder="วาง URL เอง หรือกด Upload"
              value={form.programiconurl}
              onChange={(e) => set("programiconurl", e.target.value)}
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
                    "programs/icons"
                  )
                }
              />
              Upload
            </label>
            {form.programiconurl && (
              <>
                <img
                  src={form.programiconurl}
                  alt="icon"
                  className="h-10 w-10 rounded-md object-cover ring-1 ring-white/15"
                />
                <button
                  type="button"
                  onClick={() => set("programiconurl", "")}
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
            Roadmap Image (program_roadmap_url)
          </FieldLabel>
          <div className="flex items-center gap-3">
            <input
              className="inp flex-1"
              placeholder="วาง URL เอง หรือกด Upload"
              value={form.program_roadmap_url}
              onChange={(e) => set("program_roadmap_url", e.target.value)}
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
                    "programs/roadmaps"
                  )
                }
              />
              Upload
            </label>
            {form.program_roadmap_url && (
              <>
                <img
                  src={form.program_roadmap_url}
                  alt="roadmap"
                  className="h-10 w-16 rounded-md object-cover ring-1 ring-white/15"
                />
                <a
                  href={form.program_roadmap_url}
                  target="_blank"
                  className="text-xs underline"
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
            placeholder="คำโปรยของโปรแกรม"
            value={form.program_teaser}
            onChange={(e) => set("program_teaser", e.target.value)}
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
          transition: box-shadow 0.15s, border-color 0.15s;
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
          transition: box-shadow 0.15s, border-color 0.15s;
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
export default function ProgramsPage() {
  const [items, setItems] = useState([]);
  const [edit, setEdit] = useState(null);

  const fetchItems = async () => {
    const res = await fetch("/api/programs?withCounts=1", {
      cache: "no-store",
    });
    const d = await res.json();
    setItems(d.items || []);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Programs</h1>
        <button
          onClick={() => setEdit({})}
          className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/20"
        >
          + New Program
        </button>
      </header>

      <div className="grid gap-3">
        {items.map((p) => (
          <div
            key={p._id}
            className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 flex items-start justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <ProgramBadge program={p} />
                <div className="text-lg font-medium">{p.program_name}</div>
                <div className="text-xs opacity-70">ID: {p.program_id}</div>
              </div>
              <div className="text-sm opacity-80 mt-1">
                Public: {p.counts?.public || 0} | Online:{" "}
                {p.counts?.online || 0}
              </div>
              {p.program_teaser && (
                <p className="text-sm opacity-80 mt-1">{p.program_teaser}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEdit(p)}
                className="rounded-lg px-3 py-1 bg-white/10"
              >
                Edit
              </button>
              <button
                onClick={async () => {
                  if (!confirm("Delete?")) return;
                  await fetch(`/api/programs/${p._id}`, { method: "DELETE" });
                  fetchItems();
                }}
                className="rounded-lg px-3 py-1 bg-red-500/80 hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {!items.length && <div className="opacity-60">No programs found.</div>}
      </div>

      {/* Modal */}
      {edit !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 p-0 sm:p-4">
          <div className="mx-auto w-full sm:max-w-2xl">
            <div className="rounded-2xl bg-slate-900 ring-1 ring-white/10 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 bg-slate-900/95 backdrop-blur">
                <h2 className="text-lg font-semibold">
                  {edit?._id ? "Edit Program" : "New Program"}
                </h2>
                <button
                  onClick={() => setEdit(null)}
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20"
                >
                  Close
                </button>
              </div>

              <div className="p-4">
                <ProgramForm
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
