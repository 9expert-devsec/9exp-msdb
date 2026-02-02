// src/app/(admin)/admin/courses/online/page.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import OnlineCourseForm from "./OnlineCourseForm";

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
            onClick={() => doCopy(item.o_course_cover_url)}
          >
            Cover URL
          </button>
          <button
            className="mitem"
            onClick={() => doCopy(join(item.o_course_doc_paths))}
          >
            Doc Paths
          </button>
          <button
            className="mitem"
            onClick={() => doCopy(join(item.o_course_lab_paths))}
          >
            Lab Paths
          </button>
          <button
            className="mitem"
            onClick={() => doCopy(join(item.o_course_case_study_paths))}
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

/* ========== skeletons (เฉพาะ list area) ========== */
function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-white/10 ring-1 ring-white/10 ${className}`}
    />
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, gi) => (
        <section
          key={gi}
          className="rounded-2xl bg-white/5 ring-1 ring-white/10"
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-4 w-4 rounded" />
              <SkeletonBlock className="h-4 w-40" />
              <SkeletonBlock className="h-3 w-16 rounded-md" />
            </div>
          </div>

          <div className="divide-y divide-white/10">
            {Array.from({ length: 5 }).map((_, ri) => (
              <div
                key={ri}
                className="p-4 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <SkeletonBlock className="w-20 h-12 rounded" />
                  <div className="space-y-2">
                    <SkeletonBlock className="h-4 w-72" />
                    <SkeletonBlock className="h-3 w-96" />
                    <SkeletonBlock className="h-3 w-64" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <SkeletonBlock className="h-8 w-16 rounded-lg" />
                  <SkeletonBlock className="h-8 w-16 rounded-lg" />
                  <SkeletonBlock className="h-8 w-16 rounded-lg" />
                  <SkeletonBlock className="h-8 w-16 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ========== main page ========== */
export default function OnlineCoursesAdminPage() {
  const [items, setItems] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [skills, setSkills] = useState([]);
  const [editItem, setEditItem] = useState(null);

  const [q, setQ] = useState("");
  const [program, setProgram] = useState("");
  const [skill, setSkill] = useState("");

  const [previewUrl, setPreviewUrl] = useState("");

  const [loadingAll, setLoadingAll] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);

  // กันยิงซ้ำรอบแรก + กัน race
  const didInitRef = useRef(false);
  const reqIdRef = useRef(0);
  const abortRef = useRef(null);

  /* ---- load dropdown options ---- */
  const fetchAll = async () => {
    setLoadingAll(true);
    try {
      const [pg, sk] = await Promise.all([
        fetch("/api/programs?withCounts=1", { cache: "no-store" }).then((r) =>
          r.json(),
        ),
        fetch("/api/skills", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setPrograms(pg.items || []);
      setSkills(sk.items || []);
    } finally {
      setLoadingAll(false);
    }
  };

  /* ---- load items ---- */
  const fetchItems = async () => {
    // cancel request ก่อนหน้า (ถ้ามี)
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {}
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoadingItems(true);
    const myReqId = ++reqIdRef.current;

    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (program) qs.set("program", program);
    if (skill) qs.set("skill", skill);

    let res;
    try {
      res = await fetch(`/api/online-courses?${qs.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (e) {
      if (e?.name === "AbortError") return;
      console.error("Fetch /api/online-courses network error:", e);
      alert("โหลดรายการ Online Courses ไม่สำเร็จ (network)");
      setLoadingItems(false);
      return;
    }

    let data;
    try {
      data = await res.json();
    } catch (e) {
      console.error("Fetch /api/online-courses json parse error:", e);
      alert("โหลดรายการ Online Courses ไม่สำเร็จ (invalid json)");
      setLoadingItems(false);
      return;
    }

    // ถ้ามี request ใหม่กว่าเข้ามาแล้ว -> ไม่ต้อง set state ทับ
    if (myReqId !== reqIdRef.current) return;

    if (!res.ok || data?.ok === false) {
      console.error("API /api/online-courses error:", data);
      alert(
        data?.error
          ? `โหลดข้อมูลล้มเหลว: ${data.error}`
          : `โหลดรายการ Online Courses ไม่สำเร็จ (${res.status})`,
      );
      setLoadingItems(false);
      return;
    }

    setItems(data.items || []);
    setLoadingItems(false);
  };

  // initial load: ยิงครั้งเดียว
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    (async () => {
      await Promise.allSettled([fetchAll(), fetchItems()]);
    })();

    return () => {
      if (abortRef.current) {
        try {
          abortRef.current.abort();
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refetch items when filters change
  useEffect(() => {
    if (!didInitRef.current) return;
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    await fetch(`/api/online-courses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sort_order: order }),
    });
    fetchItems();
  };

  return (
    <div className="space-y-6">
      {/* header */}
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Online Courses</h1>
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
          disabled={loadingAll}
          className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10 disabled:opacity-60"
          style={{ colorScheme: "dark" }}
        >
          <option value="">
            {loadingAll ? "Loading programs..." : "All Programs"}
          </option>
          {programs.map((p) => (
            <option key={p._id} value={p._id}>
              {p.program_name}
            </option>
          ))}
        </select>

        <select
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
          disabled={loadingAll}
          className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10 disabled:opacity-60"
          style={{ colorScheme: "dark" }}
        >
          <option value="">
            {loadingAll ? "Loading skills..." : "All Skills"}
          </option>
          {skills.map((s) => (
            <option key={s._id} value={s._id}>
              {s.skill_name}
            </option>
          ))}
        </select>

        <button
          onClick={fetchItems}
          className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-60"
          disabled={loadingItems}
          title={loadingItems ? "Loading..." : "Search"}
        >
          {loadingItems ? "Loading..." : "Search"}
        </button>
      </div>

      {/* grouped list */}
      <div className="space-y-6">
        {/* ✅ ระหว่างโหลด: โชว์ skeleton แทน list และ “ไม่โชว์ No courses found” */}
        {loadingItems ? (
          <ListSkeleton />
        ) : (
          <>
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
                        {it.o_course_cover_url ? (
                          <img
                            src={it.o_course_cover_url}
                            className="w-20 h-12 rounded object-cover ring-1 ring-white/10 cursor-zoom-in"
                            alt=""
                            title="คลิกเพื่อดูภาพใหญ่"
                            onClick={() => setPreviewUrl(it.o_course_cover_url)}
                          />
                        ) : null}

                        <div>
                          <div className="text-base font-medium">
                            {it.o_course_name}
                          </div>
                          <div className="text-sm opacity-80">
                            ID: {it.o_course_id} | Lessons:{" "}
                            {it.o_number_lessons ?? 0} | Hours:{" "}
                            {it.o_course_traininghours ??
                              it.o_traininghours ??
                              0}{" "}
                            | Price: {it.o_course_price ?? 0}
                          </div>
                          <div className="text-sm mt-1">
                            Skills:{" "}
                            {it.skills?.map((s) => s.skill_name).join(", ") ||
                              "-"}
                          </div>

                          {it.previous_course && (
                            <div className="text-xs mt-1 opacity-60">
                              Previous:{" "}
                              {it.previous_course.o_course_name
                                ? `${it.previous_course.o_course_name} (${
                                    it.previous_course.o_course_id || "-"
                                  })`
                                : it.previous_course.o_course_id || "-"}
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
                          onChange={(e) =>
                            setOrder(it._id, +e.target.value || 0)
                          }
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
                            await fetch(`/api/online-courses/${it._id}`, {
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

            {!items.length && (
              <div className="opacity-60">No courses found.</div>
            )}
          </>
        )}
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
                <OnlineCourseForm
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
