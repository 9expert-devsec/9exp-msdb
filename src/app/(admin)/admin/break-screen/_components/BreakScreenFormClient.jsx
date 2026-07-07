// src/app/(admin)/admin/break-screen/_components/BreakScreenFormClient.jsx
// Create/Edit form for a BreakScreenProfile. Ports the 04-A generator UI
// (instructor picker + suggest + override search + video inputs) and adds a
// slug field (with uniqueness check) + descMaxLen. Used by ./new and ./[id]/edit.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { slugify, isValidSlug } from "@/lib/slugify";
import { cfgHash } from "@/lib/breakScreen";

// Base URL of the STATIC break screen (a DIFFERENT domain) — from env, never
// the request host. Set NEXT_PUBLIC_BREAK_SCREEN_URL in MSDB's deployment.
const BREAK_BASE = (
  process.env.NEXT_PUBLIC_BREAK_SCREEN_URL || "https://break.9expert.app"
).replace(/\/$/, "");

function ProgramChip({ program }) {
  const color = program?.programcolor || "#22c55e";
  const bg = `${color}20`;
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

function extractList(json) {
  if (Array.isArray(json)) return json;
  return json?.items || json?.data || json?.rows || [];
}

const DAY_LABELS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

function toLines(text) {
  return String(text || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Normalize a raw PublicCourse (from suggest/search) OR a stored snapshot card
// into a common "selectable" shape the form renders/reorders.
function asSelectableFromCourse(c) {
  return {
    id: c.course_id,
    name: c.course_name || "",
    cover: c.course_cover_url || "",
    program: c.program || null,
    promote: !!c.course_promote_status,
  };
}
function asSelectableFromSnapshot(c) {
  return {
    id: c.sourceCourseId || "",
    name: c.title || "",
    cover: c.img || "",
    program: null,
    promote: c.badge === "แนะนำ",
  };
}

export default function BreakScreenFormClient({ initial = null }) {
  const router = useRouter();
  const isEdit = !!initial?._id;

  // ── instructor picker ─────────────────────────────────────────────
  const [instrQuery, setInstrQuery] = useState(initial?.instructor?.name || "");
  const [instrResults, setInstrResults] = useState([]);
  const [instrOpen, setInstrOpen] = useState(false);
  const [chosenInstructor, setChosenInstructor] = useState(
    initial?.instructor || null
  );
  const instrTimer = useRef(null);

  // ── suggested + selected ──────────────────────────────────────────
  const [suggested, setSuggested] = useState([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [selected, setSelected] = useState(
    Array.isArray(initial?.courses)
      ? initial.courses.map(asSelectableFromSnapshot).filter((c) => c.id)
      : []
  );

  // ── override search ───────────────────────────────────────────────
  const [ovQuery, setOvQuery] = useState("");
  const [ovResults, setOvResults] = useState([]);
  const [ovOpen, setOvOpen] = useState(false);
  const ovTimer = useRef(null);

  // ── videos ────────────────────────────────────────────────────────
  const [videoMode, setVideoMode] = useState(initial?.videos?.mode || "same");
  const [sameText, setSameText] = useState(
    (initial?.videos?.same || []).join("\n")
  );
  const [dayTexts, setDayTexts] = useState(() => {
    const byDay = initial?.videos?.byDay || {};
    return Array.from({ length: 7 }, (_, i) => (byDay[i] || byDay[String(i)] || []).join("\n"));
  });

  // ── meta: label, slug, descMaxLen ─────────────────────────────────
  const [label, setLabel] = useState(initial?.label || "");
  const [labelTouched, setLabelTouched] = useState(isEdit);
  const [slug, setSlug] = useState(initial?.slug || "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [slugStatus, setSlugStatus] = useState(""); // ""|checking|ok|taken|invalid
  const slugTimer = useRef(null);
  const [descMaxLen, setDescMaxLen] = useState(initial?.descMaxLen || 0);

  // ── save state ────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { courseLink, cfgLink, slug }

  /* ---------- instructor search ---------- */
  useEffect(() => {
    if (instrTimer.current) clearTimeout(instrTimer.current);
    const q = instrQuery.trim();
    if (!q || (chosenInstructor && q === chosenInstructor.name)) {
      setInstrResults([]);
      setInstrOpen(false);
      return;
    }
    instrTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/instructors?q=${encodeURIComponent(q)}`,
          { cache: "no-store" }
        );
        setInstrResults(extractList(await res.json()));
        setInstrOpen(true);
      } catch (e) {
        console.error(e);
      }
    }, 250);
    return () => clearTimeout(instrTimer.current);
  }, [instrQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadSuggestions(instId) {
    try {
      setLoadingSuggest(true);
      setSuggested([]);
      const res = await fetch(
        `/api/admin/break-screen/suggest?instructorId=${instId}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (res.ok && json.ok) setSuggested(json.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSuggest(false);
    }
  }

  async function chooseInstructor(inst) {
    setChosenInstructor(inst);
    setInstrQuery(inst.name || "");
    setInstrOpen(false);
    if (!labelTouched) setLabel(inst.name || "");
    loadSuggestions(inst._id);
  }

  /* ---------- override search ---------- */
  useEffect(() => {
    if (ovTimer.current) clearTimeout(ovTimer.current);
    const q = ovQuery.trim();
    if (q.length < 2) {
      setOvResults([]);
      setOvOpen(false);
      return;
    }
    ovTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/break-screen/search?q=${encodeURIComponent(q)}`,
          { cache: "no-store" }
        );
        setOvResults(extractList(await res.json()));
        setOvOpen(true);
      } catch (e) {
        console.error(e);
      }
    }, 250);
    return () => clearTimeout(ovTimer.current);
  }, [ovQuery]);

  /* ---------- selection helpers ---------- */
  const selectedIds = useMemo(() => new Set(selected.map((c) => c.id)), [selected]);

  function toggleSelectCourse(rawCourse) {
    const s = asSelectableFromCourse(rawCourse);
    setSelected((prev) =>
      prev.some((c) => c.id === s.id)
        ? prev.filter((c) => c.id !== s.id)
        : [...prev, s]
    );
  }
  function addOverride(rawCourse) {
    const s = asSelectableFromCourse(rawCourse);
    setSelected((prev) => (prev.some((c) => c.id === s.id) ? prev : [...prev, s]));
    setOvQuery("");
    setOvResults([]);
    setOvOpen(false);
  }
  function removeSelected(id) {
    setSelected((prev) => prev.filter((c) => c.id !== id));
  }
  function moveSelected(idx, dir) {
    setSelected((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }

  /* ---------- slug: auto-suggest + uniqueness ---------- */
  useEffect(() => {
    if (slugTouched) return;
    const base = label || chosenInstructor?.name_en || chosenInstructor?.name || "";
    setSlug(slugify(base));
  }, [label, chosenInstructor, slugTouched]);

  useEffect(() => {
    if (slugTimer.current) clearTimeout(slugTimer.current);
    const s = slug.trim();
    if (!s) {
      setSlugStatus("");
      return;
    }
    if (!isValidSlug(s)) {
      setSlugStatus("invalid");
      return;
    }
    setSlugStatus("checking");
    slugTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/break-screen/profiles?q=${encodeURIComponent(s)}`,
          { cache: "no-store" }
        );
        const items = extractList(await res.json());
        const taken = items.some(
          (it) => it.slug === s && String(it._id) !== String(initial?._id || "")
        );
        setSlugStatus(taken ? "taken" : "ok");
      } catch {
        setSlugStatus("");
      }
    }, 350);
    return () => clearTimeout(slugTimer.current);
  }, [slug, initial?._id]);

  const count = selected.length;
  const countOk = count >= 3 && count <= 6;
  const canSave =
    countOk && slug.trim() && slugStatus !== "invalid" && slugStatus !== "taken";

  /* ---------- save ---------- */
  async function handleSave() {
    setError("");
    setResult(null);
    if (!countOk) return setError("กรุณาเลือกคอร์ส 3–6 คอร์ส");
    if (!isValidSlug(slug.trim()))
      return setError("slug ต้องเป็น kebab-case (a-z, 0-9, -)");

    const videos =
      videoMode === "daily"
        ? {
            mode: "daily",
            same: [],
            byDay: dayTexts.reduce((acc, t, i) => {
              const lines = toLines(t);
              if (lines.length) acc[i] = lines;
              return acc;
            }, {}),
          }
        : { mode: "same", same: toLines(sameText), byDay: {} };

    const payload = {
      slug: slug.trim().toLowerCase(),
      label: label.trim(),
      instructor: chosenInstructor?._id || null,
      // send courseIds → server re-maps authoritatively + snapshots fresh
      courseIds: selected.map((c) => c.id),
      videos,
      descMaxLen: Number(descMaxLen) || 0,
    };

    try {
      setSaving(true);
      const url = isEdit
        ? `/api/admin/break-screen/profiles/${initial._id}`
        : "/api/admin/break-screen/profiles";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "บันทึกไม่สำเร็จ");

      const pv = json.profileValue; // server-truncated + label-included
      setResult({
        slug: json.item.slug,
        courseLink: `${BREAK_BASE}/?course=${encodeURIComponent(json.item.slug)}`,
        cfgLink: `${BREAK_BASE}/#cfg=${cfgHash(pv)}`,
      });
      // refresh the router cache so the list reflects the change
      router.refresh();
    } catch (e) {
      console.error(e);
      setError(e.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  function copy(text) {
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  /* ================= render ================= */
  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {isEdit ? "แก้ไขโปรไฟล์" : "สร้างโปรไฟล์ใหม่"}
          </h1>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            เลือกวิทยากร, คอร์ส 3–6 คอร์ส, ลิงก์ YouTube แล้วตั้ง slug + บันทึก
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/break-screen")}
          className="rounded-xl bg-[var(--surface-card-hover)] px-3 py-2 text-sm text-[var(--text-secondary)]"
        >
          ← กลับรายการ
        </button>
      </header>

      {/* 1. Instructor */}
      <section className="rounded-2xl bg-[var(--surface-card)] ring-1 ring-[var(--border-primary)] p-4 space-y-3">
        <h2 className="text-sm font-semibold">1. วิทยากร (Instructor) — ไม่บังคับ</h2>
        <div className="relative max-w-md">
          <input
            value={instrQuery}
            onChange={(e) => setInstrQuery(e.target.value)}
            onFocus={() => instrResults.length && setInstrOpen(true)}
            placeholder="ค้นหาชื่อวิทยากร..."
            className="w-full rounded-xl bg-[var(--surface-card)] border border-[var(--border-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
          {instrOpen && instrResults.length > 0 && (
            <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] shadow-xl max-h-72 overflow-auto">
              {instrResults.map((inst) => (
                <button
                  key={inst._id}
                  type="button"
                  onClick={() => chooseInstructor(inst)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-card-hover)] flex flex-col gap-1"
                >
                  <span className="font-medium">{inst.name}</span>
                  <span className="flex flex-wrap gap-1">
                    {(inst.programs || []).map((p) => (
                      <ProgramChip key={p._id} program={p} />
                    ))}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        {chosenInstructor && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)]">
            <span>วิทยากร:</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {chosenInstructor.name}
            </span>
            <button
              type="button"
              onClick={() => {
                setChosenInstructor(null);
                setInstrQuery("");
                setSuggested([]);
              }}
              className="text-rose-400 hover:text-rose-300"
            >
              ล้าง
            </button>
          </div>
        )}
      </section>

      {/* 2. Suggested + override */}
      <section className="rounded-2xl bg-[var(--surface-card)] ring-1 ring-[var(--border-primary)] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">2. คอร์ส (เลือก 3–6)</h2>
          <span
            className={`text-xs font-semibold ${
              countOk ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            เลือกแล้ว {count} คอร์ส
          </span>
        </div>

        {chosenInstructor &&
          (loadingSuggest ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-[var(--surface-glass)] animate-pulse"
                />
              ))}
            </div>
          ) : suggested.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {suggested.map((c) => {
                const checked = selectedIds.has(c.course_id);
                return (
                  <button
                    key={c.course_id}
                    type="button"
                    onClick={() => toggleSelectCourse(c)}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                      checked
                        ? "border-emerald-400 bg-emerald-500/10"
                        : "border-[var(--border-primary)] hover:bg-[var(--surface-card-hover)]"
                    }`}
                  >
                    {c.course_cover_url ? (
                      <img
                        src={c.course_cover_url}
                        alt=""
                        className="h-10 w-16 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-16 rounded bg-[var(--surface-glass)] shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">
                        {c.course_name}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {c.program && <ProgramChip program={c.program} />}
                        {c.course_promote_status && (
                          <span className="text-[10px] rounded-full bg-amber-500/15 text-amber-400 px-1.5 py-0.5">
                            แนะนำ
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`ml-1 inline-flex h-4 w-4 items-center justify-center rounded border text-[10px] shrink-0 ${
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
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">
              ไม่พบคอร์สแนะนำสำหรับวิทยากรนี้ — เพิ่มคอร์สเองด้านล่างได้
            </p>
          ))}

        {/* override */}
        <div className="pt-2 border-t border-[var(--border-primary)]">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            เพิ่มคอร์สอื่น (override — ไม่จำกัด Program)
          </label>
          <div className="relative mt-1 max-w-md">
            <input
              value={ovQuery}
              onChange={(e) => setOvQuery(e.target.value)}
              placeholder="ค้นหาชื่อคอร์ส หรือ Course ID..."
              className="w-full rounded-xl bg-[var(--surface-card)] border border-[var(--border-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
            {ovOpen && ovResults.length > 0 && (
              <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] shadow-xl max-h-72 overflow-auto">
                {ovResults.map((c) => (
                  <button
                    key={c.course_id}
                    type="button"
                    onClick={() => addOverride(c)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-card-hover)] flex items-center gap-2"
                  >
                    <span className="font-medium truncate flex-1">
                      {c.course_name}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {c.course_id}
                    </span>
                    {selectedIds.has(c.course_id) && (
                      <span className="text-[10px] text-emerald-400">เลือกแล้ว</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. Selected order */}
      {selected.length > 0 && (
        <section className="rounded-2xl bg-[var(--surface-card)] ring-1 ring-[var(--border-primary)] p-4 space-y-2">
          <h2 className="text-sm font-semibold">3. ลำดับคอร์สที่เลือก</h2>
          <ul className="space-y-1.5">
            {selected.map((c, idx) => (
              <li
                key={c.id}
                className="flex items-center gap-2 rounded-xl border border-[var(--border-primary)] px-3 py-2"
              >
                <span className="text-[11px] w-5 text-[var(--text-muted)]">
                  {idx + 1}
                </span>
                {c.cover ? (
                  <img src={c.cover} alt="" className="h-8 w-12 rounded object-cover" />
                ) : (
                  <div className="h-8 w-12 rounded bg-[var(--surface-glass)]" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">{c.name}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{c.id}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveSelected(idx, -1)}
                    disabled={idx === 0}
                    className="rounded-lg px-2 py-1 text-[11px] bg-[var(--surface-card-hover)] disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSelected(idx, 1)}
                    disabled={idx === selected.length - 1}
                    className="rounded-lg px-2 py-1 text-[11px] bg-[var(--surface-card-hover)] disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSelected(c.id)}
                    className="rounded-lg px-2 py-1 text-[11px] bg-rose-600/80 text-white hover:bg-rose-500"
                  >
                    ลบ
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 4. Videos */}
      <section className="rounded-2xl bg-[var(--surface-card)] ring-1 ring-[var(--border-primary)] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">4. ลิงก์วิดีโอ YouTube</h2>
          <div className="inline-flex rounded-xl bg-[var(--surface-glass)] p-0.5 text-xs">
            {["same", "daily"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setVideoMode(m)}
                className={`rounded-lg px-3 py-1 ${
                  videoMode === m
                    ? "bg-emerald-500 text-white"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                {m === "same" ? "เหมือนกันทุกวัน" : "แยกรายวัน"}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-[var(--text-muted)]">
          1 บรรทัดต่อ 1 วิดีโอ — ระบบอ่านเฉพาะ URL, ต่อท้ายด้วย “— หมายเหตุ” ได้ (ระบบไม่สนใจ)
        </p>
        {videoMode === "same" ? (
          <textarea
            value={sameText}
            onChange={(e) => setSameText(e.target.value)}
            rows={4}
            placeholder={"https://youtu.be/xxxx — โปรโมชั่น\nhttps://youtu.be/yyyy"}
            className="w-full rounded-xl bg-[var(--surface-card)] border border-[var(--border-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-y font-mono"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DAY_LABELS.map((lbl, i) => (
              <div key={i}>
                <label className="text-[11px] font-medium text-[var(--text-secondary)]">
                  {lbl}
                </label>
                <textarea
                  value={dayTexts[i]}
                  onChange={(e) =>
                    setDayTexts((prev) => {
                      const next = [...prev];
                      next[i] = e.target.value;
                      return next;
                    })
                  }
                  rows={2}
                  placeholder="https://youtu.be/..."
                  className="mt-1 w-full rounded-xl bg-[var(--surface-card)] border border-[var(--border-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-y font-mono"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Meta: label / slug / descMaxLen */}
      <section className="rounded-2xl bg-[var(--surface-card)] ring-1 ring-[var(--border-primary)] p-4 space-y-4">
        <h2 className="text-sm font-semibold">5. ตั้งค่าโปรไฟล์</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              Label (หัวเรื่องบนหน้าจอพัก)
            </label>
            <input
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                setLabelTouched(true);
              }}
              placeholder="เช่น ชื่อคอร์ส / ชื่อวิทยากร"
              className="mt-1 w-full rounded-xl bg-[var(--surface-card)] border border-[var(--border-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              Slug (คีย์ของ ?course= )
            </label>
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase());
                setSlugTouched(true);
              }}
              placeholder="power-bi-morning"
              className={`mt-1 w-full rounded-xl bg-[var(--surface-card)] border px-3 py-2 text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:ring-1 ${
                slugStatus === "taken" || slugStatus === "invalid"
                  ? "border-rose-500 focus:ring-rose-400"
                  : "border-[var(--border-primary)] focus:ring-emerald-400"
              }`}
            />
            <p className="mt-1 text-[11px]">
              {slugStatus === "checking" && (
                <span className="text-[var(--text-muted)]">กำลังตรวจสอบ…</span>
              )}
              {slugStatus === "ok" && (
                <span className="text-emerald-400">✓ slug ใช้ได้</span>
              )}
              {slugStatus === "taken" && (
                <span className="text-rose-400">✕ slug นี้ถูกใช้แล้ว</span>
              )}
              {slugStatus === "invalid" && (
                <span className="text-rose-400">
                  ✕ ต้องเป็น kebab-case (a-z, 0-9, -)
                </span>
              )}
              {!slugStatus && (
                <span className="text-[var(--text-muted)]">
                  auto จาก label — แก้ไขได้
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="max-w-xs">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            ตัดคำอธิบายไม่เกิน N ตัวอักษร (descMaxLen)
          </label>
          <input
            type="number"
            min={0}
            value={descMaxLen}
            onChange={(e) => setDescMaxLen(e.target.value)}
            placeholder="0 = ไม่ตัด"
            className="mt-1 w-full rounded-xl bg-[var(--surface-card)] border border-[var(--border-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            ช่วยย่อการ์ด และย่อลิงก์ #cfg= (0 = ไม่ตัด)
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-xs text-rose-400">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !canSave}
            className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-400 disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : isEdit ? "บันทึกการแก้ไข" : "สร้างโปรไฟล์"}
          </button>
          {!countOk && (
            <span className="text-[11px] text-amber-400">ต้องเลือก 3–6 คอร์ส</span>
          )}
        </div>
      </section>

      {/* 6. Output links after save */}
      {result && (
        <section className="rounded-2xl bg-[var(--surface-card)] ring-1 ring-[var(--border-primary)] p-4 space-y-4">
          <h2 className="text-sm font-semibold">บันทึกแล้ว ✓ — ลิงก์สำหรับส่ง</h2>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-400">
                #cfg= (frozen — ใช้ได้ทันที)
              </span>
              <button
                type="button"
                onClick={() => copy(result.cfgLink)}
                className="rounded-lg bg-[var(--surface-card-hover)] px-2 py-1 text-[11px]"
              >
                Copy
              </button>
            </div>
            <textarea
              readOnly
              value={result.cfgLink}
              rows={2}
              className="w-full rounded-xl bg-[var(--surface-glass)] border border-[var(--border-primary)] px-3 py-2 text-[11px] font-mono break-all resize-none"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-sky-400">
                ?course= (live — ต้อง deploy profiles.json)
              </span>
              <button
                type="button"
                onClick={() => copy(result.courseLink)}
                className="rounded-lg bg-[var(--surface-card-hover)] px-2 py-1 text-[11px]"
              >
                Copy
              </button>
            </div>
            <textarea
              readOnly
              value={result.courseLink}
              rows={2}
              className="w-full rounded-xl bg-[var(--surface-glass)] border border-[var(--border-primary)] px-3 py-2 text-[11px] font-mono break-all resize-none"
            />
            <p className="text-[11px] text-[var(--text-muted)]">
              อย่าลืมดาวน์โหลด/deploy profiles.json ใหม่เพื่อให้ลิงก์ ?course= ใช้งานได้
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
