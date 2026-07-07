// src/app/(admin)/admin/break-screen/page.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// ── Base URL of the STATIC break screen (a DIFFERENT domain) ────────────────
// Must come from an env var, NOT from this app's request host. Set
// NEXT_PUBLIC_BREAK_SCREEN_URL in MSDB's deployment (e.g. Vercel env) to the
// break-screen origin, e.g. https://break.9expert.app
// (public NEXT_PUBLIC_* vars are inlined at build time).
const BREAK_BASE = (
  process.env.NEXT_PUBLIC_BREAK_SCREEN_URL || "https://break.9expert.app"
).replace(/\/$/, ""); // normalize: never a trailing-slash mismatch

// EXACT replica of the static break screen's `encodeCfg`. Must byte-match so the
// #cfg= hash decodes on the static side (which runs the mirror `decodeCfg` then
// `mergeCfg(DEFAULTS, parsed)`). Do NOT "improve" this — btoa+unescape+
// encodeURIComponent is the agreed wire format.
function encodeCfg(c) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(c))));
}

/* Badge แสดงสี Program — reuse the look from instructors/page.jsx */
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

/* helper ดึง array จาก API ไม่ว่าจะเป็น {items:[]} หรือ [] ตรง ๆ */
function extractList(json) {
  if (Array.isArray(json)) return json;
  return json?.items || json?.data || json?.rows || [];
}

const DAY_LABELS = [
  "อาทิตย์",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
];

/* one URL per line; the break screen reads only the URL, a trailing "— note"
 * is allowed and ignored. We pass the trimmed non-empty lines as-is. */
function toLines(text) {
  return String(text || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function BreakScreenGeneratorPage() {
  // ── instructor picker ─────────────────────────────────────────────
  const [instrQuery, setInstrQuery] = useState("");
  const [instrResults, setInstrResults] = useState([]);
  const [instrOpen, setInstrOpen] = useState(false);
  const [chosenInstructor, setChosenInstructor] = useState(null);
  const instrTimer = useRef(null);

  // ── suggested + selected courses ──────────────────────────────────
  const [suggested, setSuggested] = useState([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  // selected = ordered array of lean course docs (deduped by course_id)
  const [selected, setSelected] = useState([]);

  // ── override search ───────────────────────────────────────────────
  const [ovQuery, setOvQuery] = useState("");
  const [ovResults, setOvResults] = useState([]);
  const [ovOpen, setOvOpen] = useState(false);
  const ovTimer = useRef(null);

  // ── videos ────────────────────────────────────────────────────────
  const [videoMode, setVideoMode] = useState("same"); // "same" | "daily"
  const [sameText, setSameText] = useState("");
  const [dayTexts, setDayTexts] = useState(["", "", "", "", "", "", ""]);

  // ── label ─────────────────────────────────────────────────────────
  const [label, setLabel] = useState("");
  const [labelTouched, setLabelTouched] = useState(false);

  // ── output ────────────────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null); // { profileJson, courseLink, cfgLink, primaryCourseId }
  const [error, setError] = useState("");

  /* ---------- instructor search (debounced) ---------- */
  useEffect(() => {
    if (instrTimer.current) clearTimeout(instrTimer.current);
    const q = instrQuery.trim();
    if (!q) {
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
        const json = await res.json();
        setInstrResults(extractList(json));
        setInstrOpen(true);
      } catch (e) {
        console.error("instructor search", e);
      }
    }, 250);
    return () => clearTimeout(instrTimer.current);
  }, [instrQuery]);

  async function chooseInstructor(inst) {
    setChosenInstructor(inst);
    setInstrQuery(inst.name || "");
    setInstrOpen(false);
    if (!labelTouched) setLabel(inst.name || "");
    // load suggestions
    try {
      setLoadingSuggest(true);
      setSuggested([]);
      const res = await fetch(
        `/api/admin/break-screen/suggest?instructorId=${inst._id}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "โหลดคอร์สแนะนำไม่สำเร็จ");
      setSuggested(json.items || []);
      // if instructor payload is richer (populated programs), keep it
      if (json.instructor) setChosenInstructor((prev) => ({ ...prev, ...json.instructor }));
    } catch (e) {
      console.error(e);
      setError(e.message || "โหลดคอร์สแนะนำไม่สำเร็จ");
    } finally {
      setLoadingSuggest(false);
    }
  }

  /* ---------- override search (debounced) ---------- */
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
        const json = await res.json();
        setOvResults(extractList(json));
        setOvOpen(true);
      } catch (e) {
        console.error("override search", e);
      }
    }, 250);
    return () => clearTimeout(ovTimer.current);
  }, [ovQuery]);

  /* ---------- selection helpers ---------- */
  const selectedIds = useMemo(
    () => new Set(selected.map((c) => c.course_id)),
    [selected]
  );

  function toggleSelect(course) {
    setSelected((prev) => {
      if (prev.some((c) => c.course_id === course.course_id)) {
        return prev.filter((c) => c.course_id !== course.course_id);
      }
      return [...prev, course];
    });
  }

  function addOverride(course) {
    setSelected((prev) =>
      prev.some((c) => c.course_id === course.course_id)
        ? prev
        : [...prev, course]
    );
    setOvQuery("");
    setOvResults([]);
    setOvOpen(false);
  }

  function removeSelected(course_id) {
    setSelected((prev) => prev.filter((c) => c.course_id !== course_id));
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

  const count = selected.length;
  const countOk = count >= 3 && count <= 6;
  const primaryCourseId = selected[0]?.course_id || "";

  /* ---------- generate ---------- */
  async function handleGenerate() {
    setError("");
    setResult(null);
    if (!countOk) {
      setError("กรุณาเลือกคอร์ส 3–6 คอร์ส");
      return;
    }
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

    try {
      setGenerating(true);
      const res = await fetch("/api/admin/break-screen/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          courseIds: selected.map((c) => c.course_id),
          videos,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "สร้างโปรไฟล์ไม่สำเร็จ");

      const profile = json.profile; // includes `label`

      // #cfg= carries the PARTIAL profile WITHOUT `label` (mirror static rule)
      const { label: _omit, ...partialForHash } = profile;
      const cfgLink = `${BREAK_BASE}/#cfg=${encodeCfg(partialForHash)}`;
      const courseLink = `${BREAK_BASE}/?course=${encodeURIComponent(
        primaryCourseId
      )}`;

      setResult({
        profile,
        profileJson: JSON.stringify(profile, null, 2),
        courseLink,
        cfgLink,
        primaryCourseId,
      });
    } catch (e) {
      console.error(e);
      setError(e.message || "สร้างโปรไฟล์ไม่สำเร็จ");
    } finally {
      setGenerating(false);
    }
  }

  function copy(text) {
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  function downloadJson() {
    if (!result) return;
    const blob = new Blob([result.profileJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `break-profile-${result.primaryCourseId || "profile"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ================= render ================= */
  return (
    <div className="space-y-6 max-w-5xl">
      <header>
        <h1 className="text-xl font-semibold">Break Screen Generator</h1>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          สร้างลิงก์/โปรไฟล์สำหรับหน้าจอพักเบรก 9Expert — เลือกวิทยากร, คอร์ส 3–6
          คอร์ส และลิงก์ YouTube แล้วกด Generate
        </p>
      </header>

      {/* ── 1. Instructor picker ─────────────────────── */}
      <section className="rounded-2xl bg-[var(--surface-card)] ring-1 ring-[var(--border-primary)] p-4 space-y-3">
        <h2 className="text-sm font-semibold">1. เลือกวิทยากร (Instructor)</h2>
        <div className="relative max-w-md">
          <input
            value={instrQuery}
            onChange={(e) => {
              setInstrQuery(e.target.value);
            }}
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
            <span>วิทยากรที่เลือก:</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {chosenInstructor.name}
            </span>
            {(chosenInstructor.programs || []).map((p) => (
              <ProgramChip key={p._id} program={p} />
            ))}
          </div>
        )}
      </section>

      {/* ── 2. Suggested courses ─────────────────────── */}
      {chosenInstructor && (
        <section className="rounded-2xl bg-[var(--surface-card)] ring-1 ring-[var(--border-primary)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              2. คอร์สแนะนำ (ติ๊กเลือก 3–6 คอร์ส)
            </h2>
            <span
              className={`text-xs font-semibold ${
                countOk ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              เลือกแล้ว {count} คอร์ส
            </span>
          </div>

          {loadingSuggest ? (
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
                    onClick={() => toggleSelect(c)}
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
              ไม่พบคอร์สแนะนำสำหรับวิทยากรนี้ (ต้องเป็นคอร์สใน Program ของวิทยากร
              และเปิด “แนะนำ” ไว้) — เพิ่มคอร์สเองด้านล่างได้
            </p>
          )}

          {/* override add-any-course */}
          <div className="pt-2 border-t border-[var(--border-primary)]">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              เพิ่มคอร์สอื่น (override — ไม่จำกัดเฉพาะ Program ของวิทยากร)
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
                        <span className="text-[10px] text-emerald-400">
                          เลือกแล้ว
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── 3. Selected order ────────────────────────── */}
      {selected.length > 0 && (
        <section className="rounded-2xl bg-[var(--surface-card)] ring-1 ring-[var(--border-primary)] p-4 space-y-2">
          <h2 className="text-sm font-semibold">
            3. ลำดับคอร์สที่เลือก (คอร์สแรก = ใช้เป็น ?course= )
          </h2>
          <ul className="space-y-1.5">
            {selected.map((c, idx) => (
              <li
                key={c.course_id}
                className="flex items-center gap-2 rounded-xl border border-[var(--border-primary)] px-3 py-2"
              >
                <span className="text-[11px] w-5 text-[var(--text-muted)]">
                  {idx + 1}
                </span>
                {c.course_cover_url ? (
                  <img
                    src={c.course_cover_url}
                    alt=""
                    className="h-8 w-12 rounded object-cover"
                  />
                ) : (
                  <div className="h-8 w-12 rounded bg-[var(--surface-glass)]" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">
                    {c.course_name}
                    {idx === 0 && (
                      <span className="ml-2 text-[10px] rounded bg-sky-500/15 text-sky-400 px-1.5 py-0.5">
                        primary
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {c.course_id}
                  </div>
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
                    onClick={() => removeSelected(c.course_id)}
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

      {/* ── 4. YouTube links ─────────────────────────── */}
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
          ใส่ลิงก์ 1 บรรทัดต่อ 1 วิดีโอ — ระบบอ่านเฉพาะ URL, ต่อท้ายด้วย “— หมายเหตุ”
          ได้ (ระบบจะไม่สนใจส่วนนั้น)
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

      {/* ── 5. Label + Generate ──────────────────────── */}
      <section className="rounded-2xl bg-[var(--surface-card)] ring-1 ring-[var(--border-primary)] p-4 space-y-3">
        <h2 className="text-sm font-semibold">5. Label & Generate</h2>
        <div className="max-w-md">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            Label (ข้อความหัวเรื่องบนหน้าจอพัก)
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

        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-xs text-rose-400">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || !countOk}
          className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-400 disabled:opacity-50"
        >
          {generating ? "กำลังสร้าง..." : "Generate"}
        </button>
        {!countOk && (
          <span className="ml-3 text-[11px] text-amber-400">
            ต้องเลือกคอร์ส 3–6 คอร์สก่อน
          </span>
        )}
      </section>

      {/* ── 6. Output ────────────────────────────────── */}
      {result && (
        <section className="rounded-2xl bg-[var(--surface-card)] ring-1 ring-[var(--border-primary)] p-4 space-y-4">
          <h2 className="text-sm font-semibold">ผลลัพธ์</h2>

          {/* cfg link */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-400">
                #cfg= ลิงก์ (frozen — ใช้ได้ทันที)
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
            <p className="text-[11px] text-[var(--text-muted)]">
              สแนปช็อตแบบตายตัว ฝังคอนฟิกทั้งหมดไว้ในลิงก์ — ส่งให้วิทยากรได้เลย
              ไม่ต้องรอ deploy อะไรเพิ่ม
            </p>
          </div>

          {/* course link */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-sky-400">
                ?course= ลิงก์ (live — ต้อง deploy profiles.json)
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
              ลิงก์แบบไลฟ์ — หน้าจอพักจะไปอ่าน profiles.json ที่ deploy ไว้ที่ static site
              ด้วย course id “{result.primaryCourseId}” (ต้องนำ JSON ด้านล่างไปใส่ก่อน)
            </p>
          </div>

          {/* profile json */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Profile JSON (ใส่ลงใน profiles.json ของ static site)
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => copy(result.profileJson)}
                  className="rounded-lg bg-[var(--surface-card-hover)] px-2 py-1 text-[11px]"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={downloadJson}
                  className="rounded-lg bg-[var(--surface-card-hover)] px-2 py-1 text-[11px]"
                >
                  Download .json
                </button>
              </div>
            </div>
            <pre className="w-full max-h-96 overflow-auto rounded-xl bg-[var(--surface-glass)] border border-[var(--border-primary)] px-3 py-2 text-[11px] font-mono">
              {result.profileJson}
            </pre>
          </div>
        </section>
      )}
    </div>
  );
}
