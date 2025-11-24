"use client";

import { useEffect, useMemo, useState } from "react";
import PublicCourseForm from "./PublicCourseForm";

/* ========== small UI helpers ========== */
function ProgramBadge({ program }) {
  if (program?.programiconurl) {
    return (
      <img
        src={program.programiconurl}
        alt={`${program.program_name} icon`}
        className="h-4 w-4 rounded-[4px] object-contain bg-white/5 ring-1 ring-white/10"
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

function CopyMenu({ item }) {
  const join = (a) => (Array.isArray(a) ? a.join("\n") : "");

  const doCopy = async (txt) => {
    try {
      await navigator.clipboard.writeText(txt || "");
      alert("Copied!");
    } catch {
      alert("Copy failed");
    }
  };

  return (
    <div className="relative">
      <details className="group">
        <summary className="cursor-pointer rounded-lg px-3 py-1 bg-white/10 hover:bg-white/20">
          Copy
        </summary>
        <div className="absolute right-0 mt-1 w-56 rounded-xl bg-slate-800 ring-1 ring-white/10 p-1 z-10">
          <button
            className="mitem"
            onClick={() => doCopy(item.course_cover_url)}
          >
            Cover URL
          </button>
          <button
            className="mitem"
            onClick={() => doCopy(join(item.course_doc_paths))}
          >
            Doc Paths
          </button>
          <button
            className="mitem"
            onClick={() => doCopy(join(item.course_lab_paths))}
          >
            Lab Paths
          </button>
          <button
            className="mitem"
            onClick={() => doCopy(join(item.course_case_study_paths))}
          >
            Case Study Paths
          </button>
          <div className="my-1 h-px bg-white/10" />
          <button
            className="mitem"
            onClick={() => doCopy(join(item.website_urls))}
          >
            Website URLs
          </button>
          <button
            className="mitem"
            onClick={() => doCopy(join(item.exam_links))}
          >
            Exam Links
          </button>
        </div>
      </details>
      <style jsx>{`
        .mitem {
          width: 100%;
          text-align: left;
          font-size: 0.875rem;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
        }
        .mitem:hover {
          background: rgba(255, 255, 255, 0.08);
        }
      `}</style>
    </div>
  );
}

/* ========== main page ========== */
export default function PublicCoursesAdminPage() {
  const [items, setItems] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [skills, setSkills] = useState([]);
  const [editItem, setEditItem] = useState(null);

  const [q, setQ] = useState("");
  const [program, setProgram] = useState("");
  const [skill, setSkill] = useState("");

  const [previewUrl, setPreviewUrl] = useState("");

  /* ---- load dropdown options ---- */
  const fetchAll = async () => {
    const [pg, sk] = await Promise.all([
      fetch("/api/programs?withCounts=1", { cache: "no-store" }).then((r) =>
        r.json()
      ),
      fetch("/api/skills", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setPrograms(pg.items || []);
    setSkills(sk.items || []);
  };

  /* ---- load items ---- */
  // --- แทนที่ทั้งฟังก์ชัน fetchItems ด้วยเวอร์ชันนี้ ---
  const fetchItems = async () => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (program) qs.set("program", program);
    if (skill) qs.set("skill", skill);

    const res = await fetch(`/api/public-courses?${qs.toString()}`, {
      cache: "no-store",
    });

    // ป้องกัน JSON parse error
    let data;
    try {
      data = await res.json();
    } catch (e) {
      const txt = await res.text().catch(() => "");
      throw new Error(
        `Fetch /api/public-courses failed (${res.status}): ${txt || e.message}`
      );
    }

    if (!res.ok || data?.ok === false) {
      throw new Error(
        data?.error
          ? `API error (${res.status}): ${data.error}`
          : `API error (${res.status})`
      );
    }

    setItems(data.items || []);
  };

  useEffect(() => {
    fetchAll();
  }, []);
  useEffect(() => {
    fetchItems();
  }, [q, program, skill]);

  /* ---- lock scroll when modal open ---- */
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

  /* ---- group by program ---- */
  const grouped = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const key = it.program?._id || "unknown";
      if (!map.has(key)) map.set(key, { program: it.program, rows: [] });
      map.get(key).rows.push(it);
    }
    return Array.from(map.values());
  }, [items]);

  /* ---- quick set order ---- */
  const setOrder = async (id, order) => {
    await fetch(`/api/admin/public-courses`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: id, sort_order: order }),
    });
    fetchItems();
  };

  return (
    <div className="space-y-6">
      {/* header */}
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Public Courses</h1>
        <button
          onClick={() => setEditItem({})}
          className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/20"
        >
          + New Course
        </button>
      </header>

      {/* filters */}
      <div className="flex gap-2 items-center flex-wrap">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name/teaser"
          className="w-80 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10"
        />
        <select
          value={program}
          onChange={(e) => setProgram(e.target.value)}
          className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10"
          style={{ colorScheme: "dark" }}
        >
          <option value="">All Programs</option>
          {programs.map((p) => (
            <option key={p._id} value={p._id}>
              {p.program_name}
            </option>
          ))}
        </select>
        <select
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
          className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10"
          style={{ colorScheme: "dark" }}
        >
          <option value="">All Skills</option>
          {skills.map((s) => (
            <option key={s._id} value={s._id}>
              {s.skill_name}
            </option>
          ))}
        </select>
        <button
          onClick={fetchItems}
          className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/20"
        >
          Search
        </button>
      </div>

      {/* grouped list */}
      <div className="space-y-6">
        {grouped.map((group, idx) => (
          <section
            key={idx}
            className="rounded-2xl bg-white/5 ring-1 ring-white/10"
          >
            {/* group header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <ProgramBadge program={group.program} />
                <span className="font-medium">
                  {group.program?.program_name || "Uncategorized"}
                </span>
                <span className="text-xs opacity-70">
                  ({group.rows.length} course
                  {group.rows.length > 1 ? "s" : ""})
                </span>
              </div>
            </div>

            {/* rows */}
            <div className="divide-y divide-white/10">
              {group.rows.map((it) => (
                <div
                  key={it._id}
                  className="p-4 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    {/* cover */}
                    {it.course_cover_url ? (
                      <img
                        src={it.course_cover_url}
                        className="w-20 h-12 rounded object-cover ring-1 ring-white/10 cursor-zoom-in"
                        alt=""
                        title="คลิกเพื่อดูภาพใหญ่"
                        onClick={() => setPreviewUrl(it.course_cover_url)}
                      />
                    ) : null}

                    <div>
                      <div className="text-base font-medium">
                        {it.course_name}
                      </div>
                      <div className="text-sm opacity-80">
                        ID: {it.course_id} | Days: {it.course_trainingdays ?? 0}{" "}
                        | Hours: {it.course_traininghours ?? 0} | Price:{" "}
                        {it.course_price ?? 0}
                      </div>
                      <div className="text-sm mt-1">
                        Skills:{" "}
                        {it.skills?.map((s) => s.skill_name).join(", ") || "-"}
                      </div>
                      {it.previous_course && (
                        <div className="text-xs mt-1 opacity-60">
                          Previous:{" "}
                          {it.previous_course.course_name
                            ? `${it.previous_course.course_name} (${
                                it.previous_course.course_id || "-"
                              })`
                            : it.previous_course.course_id || "-"}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* order */}
                    <input
                      title="ลำดับ"
                      type="number"
                      className="w-16 rounded-lg bg-white/10 px-2 py-1 ring-1 ring-white/10 text-right"
                      value={it.sort_order ?? 0}
                      onChange={(e) => setOrder(it._id, +e.target.value || 0)}
                    />

                    {/* copy */}
                    <CopyMenu item={it} />

                    {/* actions */}
                    <button
                      onClick={() => setEditItem(it)}
                      className="rounded-lg px-3 py-1 bg-white/10 hover:bg-white/20"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm("Delete this course?")) return;
                        await fetch(`/api/admin/public-courses?id=${it._id}`, {
                          method: "DELETE",
                        });
                        fetchItems();
                      }}
                      className="rounded-lg px-3 py-1 bg-red-500/80 hover:bg-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
        {!items.length && <div className="opacity-60">No courses found.</div>}
      </div>

      {/* modal: create/edit */}
      {editItem !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 p-0 sm:p-4">
          <div className="mx-auto w-full sm:max-w-5xl">
            <div className="rounded-2xl bg-slate-900 ring-1 ring-white/10 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 bg-slate-900/95 backdrop-blur">
                <h2 className="text-lg font-semibold">
                  {editItem?._id ? "Edit Course" : "New Course"}
                </h2>
                <button
                  onClick={() => setEditItem(null)}
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20"
                >
                  Close
                </button>
              </div>

              <div className="p-4">
                <PublicCourseForm
                  item={editItem}
                  onSaved={() => {
                    setEditItem(null);
                    fetchItems();
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* lightbox preview */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl("")}
        >
          <img
            src={previewUrl}
            alt="preview"
            className="max-h-[90vh] max-w-[95vw] rounded-xl ring-1 ring-white/10"
          />
        </div>
      )}
    </div>
  );
}
