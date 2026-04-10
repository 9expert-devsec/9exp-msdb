// src/app/(admin)/admin/instructors/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { resizeImage } from "@/lib/resizeImage";

/* Badge แสดงสี Program */
function ProgramChip({ program }) {
  const color = program?.programcolor || "#22c55e";
  const bg = `${color}20`; // ให้มี alpha จาง ๆ
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: bg, color }}
    >
      {program?.programiconurl && (
        <img
          src={program.programiconurl}
          alt={program.program_name}
          className="h-3 w-3 rounded-sm object-contain"
        />
      )}
      <span className="truncate max-w-[110px]">
        {program?.program_name || "Program"}
      </span>
    </span>
  );
}

/* helper ดึง array จาก API ไม่ว่าจะเป็น {items:[]} หรือ [] ตรง ๆ */
function extractList(json) {
  if (Array.isArray(json)) return json;
  return json?.items || json?.data || json?.rows || [];
}

export default function InstructorsPage() {
  const [loading, setLoading] = useState(true);
  const [instructors, setInstructors] = useState([]);
  const [programs, setPrograms] = useState([]);

  // filters
  const [searchText, setSearchText] = useState("");
  const [filterProgramId, setFilterProgramId] = useState("");

  // form modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // instructor object หรือ null

  const [formName, setFormName] = useState("");
  const [formNameEn, setFormNameEn] = useState(""); // ✅ NEW
  const [formBio, setFormBio] = useState("");
  const [formProgramIds, setFormProgramIds] = useState([]);
  const [programSearch, setProgramSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // photo & signature
  const [formPhotoUrl, setFormPhotoUrl] = useState("");
  const [formPhotoPublicId, setFormPhotoPublicId] = useState("");
  const [formSignatureUrl, setFormSignatureUrl] = useState("");
  const [formSignaturePublicId, setFormSignaturePublicId] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  /* ------------ load data ------------ */
  async function loadPrograms() {
    try {
      const res = await fetch("/api/programs?limit=1000", { cache: "no-store" });
      const json = await res.json();
      setPrograms(extractList(json));
    } catch (e) {
      console.error("loadPrograms error", e);
    }
  }

  async function loadInstructors() {
    try {
      setLoading(true);
      const qs = [];
      if (searchText.trim())
        qs.push(`q=${encodeURIComponent(searchText.trim())}`);
      if (filterProgramId) qs.push(`program=${filterProgramId}`);
      const url =
        "/api/admin/instructors" + (qs.length ? `?${qs.join("&")}` : "");

      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      setInstructors(extractList(json));
    } catch (e) {
      console.error("loadInstructors error", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    loadInstructors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, filterProgramId]);

  /* ------------ derived ------------- */
  const filteredProgramsForForm = useMemo(() => {
    const q = programSearch.trim().toLowerCase();
    const list = programs || [];
    if (!q) return list;
    return list.filter((p) =>
      (p.program_name || "").toLowerCase().includes(q)
    );
  }, [programs, programSearch]);

  const totalInstructors = instructors.length;

  // สรุปจำนวน Instructor ต่อ Program จากผลลัพธ์ที่กรองแล้ว
  const programStats = useMemo(() => {
    const map = new Map();

    for (const inst of instructors) {
      const list = Array.isArray(inst.programs) ? inst.programs : [];
      if (!list.length) continue;

      for (const p of list) {
        if (!p?._id) continue;
        const key = String(p._id);
        if (!map.has(key)) {
          map.set(key, { program: p, count: 0 });
        }
        map.get(key).count += 1;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [instructors]);

  /* ------------ helpers ------------- */
  function openCreateForm() {
    setEditing(null);
    setFormName("");
    setFormNameEn("");
    setFormBio("");
    setFormProgramIds([]);
    setProgramSearch("");
    setFormPhotoUrl("");
    setFormPhotoPublicId("");
    setFormSignatureUrl("");
    setFormSignaturePublicId("");
    setIsFormOpen(true);
  }

  function openEditForm(inst) {
    setEditing(inst);
    setFormName(inst.name || "");
    setFormNameEn(inst.name_en || "");
    setFormBio(inst.bio || "");
    setFormProgramIds((inst.programs || []).map((p) => String(p._id)));
    setProgramSearch("");
    setFormPhotoUrl(inst.photo_url || "");
    setFormPhotoPublicId(inst.photo_public_id || "");
    setFormSignatureUrl(inst.signature_url || "");
    setFormSignaturePublicId(inst.signature_public_id || "");
    setIsFormOpen(true);
  }

  function toggleProgramInForm(id) {
    id = String(id);
    setFormProgramIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleUploadImage(file, type) {
    const setUploading = type === "photo" ? setUploadingPhoto : setUploadingSignature;
    const setUrl = type === "photo" ? setFormPhotoUrl : setFormSignatureUrl;
    const setPublicId = type === "photo" ? setFormPhotoPublicId : setFormSignaturePublicId;

    try {
      setUploading("optimizing");
      const originalSize = file.size;

      const resized =
        type === "photo"
          ? await resizeImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.85, outputType: "image/jpeg" })
          : await resizeImage(file, { maxWidth: 600, maxHeight: 300, quality: 1, outputType: "image/png" });

      setUploading("uploading");
      const fd = new FormData();
      fd.append("file", resized);
      fd.append("folder", "msdb/instructors");
      const res = await fetch("/api/admin/upload/instructor-image", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Upload failed");
      setUrl(json.url);
      setPublicId(json.publicId);

      const reduced = originalSize > resized.size;
      if (reduced) {
        const fmt = (b) => b < 1024 * 1024 ? (b / 1024).toFixed(0) + " KB" : (b / (1024 * 1024)).toFixed(1) + " MB";
        console.log(`Image optimized: ${fmt(originalSize)} → ${fmt(resized.size)}`);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveImage(type) {
    const publicId = type === "photo" ? formPhotoPublicId : formSignaturePublicId;
    const setUrl = type === "photo" ? setFormPhotoUrl : setFormSignatureUrl;
    const setPublicId = type === "photo" ? setFormPhotoPublicId : setFormSignaturePublicId;

    if (!publicId) {
      setUrl("");
      setPublicId("");
      return;
    }

    try {
      const res = await fetch("/api/admin/upload/instructor-image", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Delete failed");
      setUrl("");
      setPublicId("");
    } catch (err) {
      console.error(err);
      alert(err.message || "Delete failed");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formName.trim()) {
      alert("กรุณาใส่ชื่อ Instructor");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: formName.trim(),
        name_en: formNameEn.trim(),
        bio: formBio.trim(),
        programs: formProgramIds,
        photo_url: formPhotoUrl,
        photo_public_id: formPhotoPublicId,
        signature_url: formSignatureUrl,
        signature_public_id: formSignaturePublicId,
      };

      const url = editing
        ? `/api/admin/instructors/${editing._id}`
        : "/api/admin/instructors";
      const method = editing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Save failed");
      }

      setIsFormOpen(false);
      setEditing(null);
      await loadInstructors();
    } catch (err) {
      console.error(err);
      alert(err.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(inst) {
    if (!window.confirm(`ลบ Instructor "${inst.name}" ?`)) return;
    try {
      const res = await fetch(`/api/admin/instructors/${inst._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Delete failed");
      await loadInstructors();
    } catch (e) {
      console.error(e);
      alert(e.message || "ลบไม่สำเร็จ");
    }
  }

  /* ------------ render ------------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Instructors</h1>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            จัดการข้อมูลวิทยากร, Program ที่สอน และประวัติสั้น ๆ
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400"
        >
          <span className="text-lg leading-none">＋</span>
          Add Instructor
        </button>
      </header>

      {/* Filters */}
      <section className="flex flex-wrap items-center gap-3 rounded-2xl bg-[var(--surface-card)] ring-1 ring-[var(--border-primary)] p-3">
        <div className="flex items-center bg-[var(--surface-card)] rounded-xl px-3 py-1.5 border border-[var(--border-primary)] w-full sm:w-64">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 text-[var(--text-tertiary)] mr-2"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M10 4a6 6 0 0 1 4.8 9.6l3.8 3.8a1 1 0 0 1-1.4 1.4l-3.8-3.8A6 6 0 1 1 10 4m0 2a4 4 0 1 0 0 8a4 4 0 0 0 0-8Z"
            />
          </svg>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="ค้นหาชื่อ Instructor..."
            className="bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] flex-1 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <span>Filter by Program:</span>
          <select
            value={filterProgramId}
            onChange={(e) => setFilterProgramId(e.target.value)}
            className="bg-[var(--surface-card)] border border-[var(--border-primary)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)]"
          >
            <option value="">All Programs</option>
            {programs.map((p) => (
              <option key={p._id} value={p._id}>
                {p.program_name}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto text-xs text-[var(--text-tertiary)]">
          Instructors:{" "}
          <span className="text-[var(--text-primary)] font-semibold">
            {totalInstructors}
          </span>
        </div>
      </section>

      {/* Program Overview */}
      {programStats.length > 0 && (
        <section className="rounded-2xl bg-[var(--surface-card)] ring-1 ring-[var(--border-primary)] p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Program Overview
              </h2>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                จำนวน Instructor ต่อ Program จากผลลัพธ์ที่ถูกกรองในตอนนี้
              </p>
            </div>
            <div className="text-[11px] text-[var(--text-tertiary)]">
              Programs:{" "}
              <span className="font-semibold text-[var(--text-primary)]">
                {programStats.length}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {programStats.map(({ program, count }) => (
              <div
                key={program._id}
                className="flex items-center justify-between rounded-xl bg-[var(--surface-card)] border border-[var(--border-primary)] px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ProgramChip program={program} />
                </div>
                <div className="text-right text-[11px] text-[var(--text-tertiary)]">
                  <span className="text-base font-semibold text-[var(--accent-emerald)]">
                    {count}
                  </span>{" "}
                  <span>instr.</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* List */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading && (
          <>
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-40 rounded-2xl bg-[var(--surface-glass)] animate-pulse"
              />
            ))}
          </>
        )}

        {!loading &&
          instructors.map((inst) => (
            <article
              key={inst._id}
              className="group rounded-2xl bg-[var(--surface-card)] ring-1 ring-[var(--border-primary)] p-4 flex flex-col justify-between hover:ring-emerald-400/40 hover:-translate-y-0.5 transition"
            >
              <div className="flex items-start gap-3">
                {inst.photo_url ? (
                  <img
                    src={inst.photo_url}
                    alt={inst.name}
                    className="h-9 w-9 rounded-full object-cover shadow-lg shadow-emerald-500/30"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500/70 to-sky-500/70 flex items-center justify-center text-sm font-semibold text-white shadow-lg shadow-emerald-500/30">
                    {inst.name?.[0]?.toUpperCase() || "I"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-sm truncate">
                        {inst.name}
                      </h2>

                      {/* ✅ NEW: name_en */}
                      {inst.name_en ? (
                        <div className="mt-0.5 text-[11px] text-[var(--text-tertiary)] truncate">
                          {inst.name_en}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => openEditForm(inst)}
                        className="rounded-lg bg-[var(--surface-card-hover)] text-[11px] px-2 py-1 hover:bg-[var(--surface-card-hover)]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(inst)}
                        className="rounded-lg bg-rose-600/80 text-[11px] px-2 py-1 text-white hover:bg-rose-500"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* programs chips */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(inst.programs || []).length ? (
                      inst.programs.map((p) => (
                        <ProgramChip key={p._id} program={p} />
                      ))
                    ) : (
                      <span className="text-[11px] text-[var(--text-muted)]">
                        ยังไม่ได้เลือก Program
                      </span>
                    )}
                  </div>

                  {/* bio */}
                  {inst.bio && (
                    <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-secondary)] line-clamp-3">
                      {inst.bio}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                <span>
                  Updated:{" "}
                  {inst.updatedAt
                    ? new Date(inst.updatedAt).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "-"}
                </span>
              </div>
            </article>
          ))}

        {!loading && !instructors.length && (
          <div className="col-span-full rounded-2xl bg-[var(--surface-card)] ring-1 ring-[var(--border-primary)] p-8 text-center text-[var(--text-tertiary)] text-sm">
            ยังไม่มี Instructor — กดปุ่ม{" "}
            <span className="font-semibold text-[var(--accent-emerald)]">
              Add Instructor
            </span>{" "}
            เพื่อเพิ่มคนแรก
          </div>
        )}
      </section>

      {/* ---------- Form Modal ---------- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-3xl rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-primary)]">
              <div>
                <h2 className="text-sm font-semibold">
                  {editing ? "Edit Instructor" : "Add Instructor"}
                </h2>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  ระบุชื่อ, ชื่อภาษาอังกฤษ, Bio และ Program ที่สอนได้
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="rounded-full p-1.5 hover:bg-[var(--surface-card-hover)] text-[var(--text-secondary)]"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex-1 grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-0"
            >
              {/* left: basic info */}
              <div className="p-5 space-y-4 border-b md:border-b-0 md:border-r border-[var(--border-primary)]">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Name (TH)
                  </label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-[var(--surface-card)] border border-[var(--border-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    placeholder="เช่น อ.สอน ดี"
                  />
                </div>

                {/* ✅ NEW: Name EN */}
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Name (EN){" "}
                    <span className="ml-1 text-[10px] text-[var(--text-muted)]">
                      (optional)
                    </span>
                  </label>
                  <input
                    value={formNameEn}
                    onChange={(e) => setFormNameEn(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-[var(--surface-card)] border border-[var(--border-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    placeholder="e.g. Somchai Jaidee"
                  />
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    ถ้าไม่กรอก จะใช้ชื่อไทยเป็นหลัก
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Bio
                  </label>
                  <textarea
                    value={formBio}
                    onChange={(e) => setFormBio(e.target.value)}
                    rows={6}
                    className="mt-1 w-full rounded-xl bg-[var(--surface-card)] border border-[var(--border-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none"
                    placeholder="แนะนำตัวสั้น ๆ, ประสบการณ์, แนวทางการสอน..."
                  />
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    ข้อความจะแสดงในหน้า Instructor ภายในระบบ
                  </p>
                </div>

                {/* Photo & Signature uploads */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Instructor Photo */}
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                      Photo{" "}
                      <span className="ml-1 text-[10px] text-[var(--text-muted)]">(optional)</span>
                    </label>
                    <div className="mt-1 rounded-xl bg-[var(--surface-card)] border border-[var(--border-primary)] p-3 flex flex-col items-center gap-2 min-h-[100px] justify-center">
                      {formPhotoUrl ? (
                        <>
                          <img
                            src={formPhotoUrl}
                            alt="Instructor photo"
                            className="h-20 w-20 rounded-full object-cover border border-[var(--border-primary)]"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage("photo")}
                            className="text-[11px] text-rose-400 hover:text-rose-300"
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingPhoto}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUploadImage(f, "photo");
                              e.target.value = "";
                            }}
                            className="text-[11px] text-[var(--text-tertiary)] file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--surface-card-hover)] file:px-2 file:py-1 file:text-[11px] file:text-[var(--text-secondary)] file:cursor-pointer"
                          />
                          {uploadingPhoto && (
                            <span className="text-[11px] text-[var(--accent-emerald)]">
                              {uploadingPhoto === "optimizing" ? "Optimizing..." : "Uploading..."}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Signature Image */}
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                      Signature{" "}
                      <span className="ml-1 text-[10px] text-[var(--text-muted)]">(optional)</span>
                    </label>
                    <div className="mt-1 rounded-xl bg-[var(--surface-card)] border border-[var(--border-primary)] p-3 flex flex-col items-center gap-2 min-h-[100px] justify-center">
                      {formSignatureUrl ? (
                        <>
                          <img
                            src={formSignatureUrl}
                            alt="Signature"
                            className="max-h-16 max-w-full object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage("signature")}
                            className="text-[11px] text-rose-400 hover:text-rose-300"
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingSignature}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUploadImage(f, "signature");
                              e.target.value = "";
                            }}
                            className="text-[11px] text-[var(--text-tertiary)] file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--surface-card-hover)] file:px-2 file:py-1 file:text-[11px] file:text-[var(--text-secondary)] file:cursor-pointer"
                          />
                          {uploadingSignature && (
                            <span className="text-[11px] text-[var(--accent-emerald)]">
                              {uploadingSignature === "optimizing" ? "Optimizing..." : "Uploading..."}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* right: program multi-select */}
              <div className="p-5 flex flex-col">
                <label className="text-xs font-medium text-[var(--text-secondary)] mb-2">
                  Programs ที่สอนได้
                </label>

                <div className="mb-2 flex items-center rounded-lg bg-[var(--surface-card)] border border-[var(--border-primary)] px-2 py-1">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 text-[var(--text-tertiary)] mr-1"
                  >
                    <path
                      fill="currentColor"
                      d="M10 4a6 6 0 0 1 4.8 9.6l3.8 3.8a1 1 0 0 1-1.4 1.4l-3.8-3.8A6 6 0 1 1 10 4m0 2a4 4 0 1 0 0 8a4 4 0 0 0 0-8Z"
                    />
                  </svg>
                  <input
                    value={programSearch}
                    onChange={(e) => setProgramSearch(e.target.value)}
                    placeholder="ค้นหา Program..."
                    className="bg-transparent text-xs text-[var(--text-primary)] flex-1 focus:outline-none"
                  />
                </div>

                <div className="flex-1 rounded-xl bg-[var(--surface-card)] border border-[var(--border-primary)] overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    {filteredProgramsForForm.map((p) => {
                      const checked = formProgramIds.includes(String(p._id));
                      const color = p.programcolor || "#22c55e";
                      const borderColor = checked ? color : "transparent";
                      return (
                        <button
                          key={p._id}
                          type="button"
                          onClick={() => toggleProgramInForm(p._id)}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-[var(--surface-card-hover)]/80"
                          style={{ borderLeft: `3px solid ${borderColor}` }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {p.programiconurl && (
                              <img
                                src={p.programiconurl}
                                alt={p.program_name}
                                className="h-4 w-4 rounded-sm object-contain"
                              />
                            )}
                            <span className="truncate">
                              {p.program_name || p.program_id}
                            </span>
                          </div>
                          <span
                            className={`ml-2 inline-flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                              checked
                                ? "bg-emerald-500 border-emerald-400 text-slate-900"
                                : "border-slate-500/40 text-[var(--text-muted)]"
                            }`}
                          >
                            {checked ? "✓" : ""}
                          </span>
                        </button>
                      );
                    })}
                    {!filteredProgramsForForm.length && (
                      <div className="px-3 py-4 text-[11px] text-[var(--text-muted)]">
                        ไม่พบ Program ที่ตรงกับคำค้นหา
                      </div>
                    )}
                  </div>
                </div>

                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  เลือกได้หลาย Program ต่อ 1 Instructor
                </p>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="rounded-xl px-3 py-1.5 text-xs bg-[var(--surface-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl px-4 py-1.5 text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : editing
                      ? "Update Instructor"
                      : "Create Instructor"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
