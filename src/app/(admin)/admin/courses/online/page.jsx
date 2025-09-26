"use client";
import { useEffect, useMemo, useState } from "react";
import OnlineCourseForm from "./OnlineCourseForm";

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

export default function OnlineCoursesAdminPage() {
  const [items, setItems] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [skills, setSkills] = useState([]);
  const [editItem, setEditItem] = useState(null);
  const [q, setQ] = useState("");
  const [program, setProgram] = useState("");
  const [skill, setSkill] = useState("");

  const fetchAll = async () => {
    const [pg, sk] = await Promise.all([
      fetch("/api/programs?withCounts=1").then((r) => r.json()),
      fetch("/api/skills").then((r) => r.json()),
    ]);
    setPrograms(pg.items || []);
    setSkills(sk.items || []);
  };

  const fetchItems = async () => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (program) qs.set("program", program);
    if (skill) qs.set("skill", skill);
    const res = await fetch(`/api/online-courses?${qs.toString()}`, {
      cache: "no-store",
    });
    const data = await res.json();
    setItems(data.items || []);
  };

  useEffect(() => {
    fetchAll();
  }, []);
  useEffect(() => {
    fetchItems();
  }, [q, program, skill]);

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

  const grouped = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const key = it.program?._id || "unknown";
      if (!map.has(key)) map.set(key, { program: it.program, items: [] });
      map.get(key).items.push(it);
    }
    return Array.from(map.values());
  }, [items]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Online Courses</h1>
        <button
          onClick={() => setEditItem({})}
          className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/20"
        >
          + New Course
        </button>
      </header>

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

      {/* จัดกลุ่มตาม Program */}
      <div className="space-y-6">
        {grouped.map((g, idx) => (
          <section
            key={idx}
            className="rounded-2xl bg-white/5 ring-1 ring-white/10"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <ProgramBadge program={g.program} />
                <span className="font-medium">
                  {g.program?.program_name || "Unassigned Program"}
                </span>
                <span className="text-xs opacity-70">
                  ({g.items.length} course{g.items.length > 1 ? "s" : ""})
                </span>
              </div>
            </div>
            <div className="divide-y divide-white/10">
              {g.items.map((it) => (
                <div
                  key={it._id}
                  className="p-4 flex items-start justify-between"
                >
                  {/* left: cover + text */}
                  <div className="flex items-start gap-3">
                    <div className="shrink-0">
                      {it.o_course_cover_url ? (
                        <img
                          src={it.o_course_cover_url}
                          alt={it.o_course_name}
                          loading="lazy"
                          className="h-16 w-28 rounded-md object-cover ring-1 ring-white/10 bg-white/5"
                        />
                      ) : (
                        <div className="h-16 w-28 rounded-md ring-1 ring-white/10 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-[10px] text-slate-300">
                          No cover
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-base font-medium">
                        {it.o_course_name}
                      </div>
                      <div className="text-sm opacity-80">
                        ID: {it.o_course_id} | Lessons:{" "}
                        {it.o_number_lessons ?? 0} | Hours:{" "}
                        {it.o_traininghours ?? 0} | Price:{" "}
                        {it.o_course_price ?? 0}
                      </div>
                      <div className="text-sm mt-1">
                        Skills:{" "}
                        {it.skills?.map((s) => s.skill_name).join(", ") || "-"}
                      </div>
                      {/* {it.course_teaser && (
                        <p className="text-sm opacity-80 mt-2">
                          {it.course_teaser}
                        </p>
                      )} */}
                    </div>
                  </div>
                  <div className="flex gap-2">
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
        {!items.length && <div className="opacity-60">No courses found.</div>}
      </div>

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

              {/* form zone */}
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
    </div>
  );
}
