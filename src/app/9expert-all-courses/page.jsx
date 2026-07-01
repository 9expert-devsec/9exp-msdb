"use client";

// Public (no-login) course catalog at /9expert-all-courses.
// Standalone page: fetches the full public-course dataset once, then does all
// filtering / sorting / view-toggle / Excel export client-side. Filter + view
// state is mirrored into the URL query string (slug values) for shareable links.

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";
import {
  Search,
  Copy,
  Check,
  Download,
  FileSpreadsheet,
  Table as TableIcon,
  LayoutGrid,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  MoreHorizontal,
  Image as ImageIcon,
  FileText,
  Palette,
  Link2,
} from "lucide-react";

/* ------------------------------------------------------------------ *
 * helpers
 * ------------------------------------------------------------------ */

// Parse a #rrggbb (or #rgb) hex into {r,g,b}. Returns null when invalid.
function parseHex(hex) {
  if (!hex || typeof hex !== "string") return null;
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

// Convert a hex to an rgba() string with the given alpha.
// Falls back to a neutral slate tint when the color is missing/invalid.
function hexToRgba(hex, alpha = 1) {
  const rgb = parseHex(hex);
  if (!rgb) return `rgba(100, 116, 139, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function toHex2(n) {
  const v = Math.max(0, Math.min(255, Math.round(n)));
  return v.toString(16).padStart(2, "0");
}

// Relative luminance per WCAG (sRGB), input channels are 0..255.
function relLuminance(r, g, b) {
  const lin = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrastRatio(l1, l2) {
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

// Compute an accessible text color for a pill whose background is the brand
// color tinted onto white at `bgAlpha`. We keep the brand hue but darken it
// (mix toward black) until it meets the target contrast ratio (WCAG AA 4.5).
// Falls back to neutral dark slate if even black somehow fails.
function readableInk(hex, { bgAlpha = 0.12, target = 4.5 } = {}) {
  const rgb = parseHex(hex);
  if (!rgb) return "#1e293b";
  // Effective tinted background = brand blended over white at bgAlpha.
  const bg = {
    r: bgAlpha * rgb.r + (1 - bgAlpha) * 255,
    g: bgAlpha * rgb.g + (1 - bgAlpha) * 255,
    b: bgAlpha * rgb.b + (1 - bgAlpha) * 255,
  };
  const bgLum = relLuminance(bg.r, bg.g, bg.b);
  // Darken the brand color toward black in steps until it is legible.
  for (let t = 0; t <= 1.0001; t += 0.08) {
    const r = rgb.r * (1 - t);
    const g = rgb.g * (1 - t);
    const b = rgb.b * (1 - t);
    if (contrastRatio(relLuminance(r, g, b), bgLum) >= target) {
      return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
    }
  }
  return "#1e293b"; // neutral dark slate fallback
}

// Build a tinted "pill" style from a brand color: soft bg, readable ink text,
// and a mid-alpha border. Text color is derived via readableInk() so pale
// brand colors (e.g. yellow) stay legible instead of washing out.
function pillStyle(color) {
  const c = color || "#64748b";
  return {
    backgroundColor: hexToRgba(c, 0.12),
    color: readableInk(c),
    borderColor: hexToRgba(c, 0.45),
  };
}

const LEVEL_LABELS = {
  1: "Level 1 · Beginner",
  2: "Level 2 · Intermediate",
  3: "Level 3 · Advanced",
  4: "Level 4 · Expert",
};

const LEVEL_COLORS = {
  1: "#16a34a",
  2: "#2563eb",
  3: "#d97706",
  4: "#dc2626",
};

// Format a price in Thai Baht. Returns "" for falsy/zero so callers can decide.
function fmtBaht(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return "";
  return v.toLocaleString("th-TH") + " บาท";
}

// "2 วัน / 12 ชม." — hide either part when it is 0.
function fmtDuration(days, hours) {
  const parts = [];
  if (Number(days) > 0) parts.push(`${days} วัน`);
  if (Number(hours) > 0) parts.push(`${hours} ชม.`);
  return parts.length ? parts.join(" / ") : "—";
}

const PLACEHOLDER_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><rect width='100%' height='100%' fill='#e2e8f0'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#94a3b8' font-family='sans-serif' font-size='16'>9EXPERT</text></svg>`
  );

// Effective (active) price: netprice wins only when it is a positive value
// strictly lower than the list price.
function effectivePrice(course) {
  const price = Number(course.course_price) || 0;
  const net = course.course_netprice;
  if (net != null && Number(net) > 0 && Number(net) < price) {
    return Number(net);
  }
  return price;
}

/* ------------------------------------------------------------------ *
 * sort config (shared between table headers and card dropdown)
 * ------------------------------------------------------------------ */

const SORT_OPTIONS = [
  { key: "default", label: "ลำดับแนะนำ" },
  { key: "course_name", label: "ชื่อหลักสูตร" },
  { key: "duration", label: "ระยะเวลา" },
  { key: "price", label: "ราคา" },
  { key: "level", label: "ระดับ" },
];

function sortValue(course, key) {
  switch (key) {
    case "course_name":
      return course.course_name || "";
    case "duration":
      return Number(course.course_trainingdays) || 0;
    case "price":
      return effectivePrice(course);
    case "level":
      return parseInt(course.course_levels, 10) || 0;
    default:
      return 0; // "default" keeps server order (stable index tiebreak below)
  }
}

/* ------------------------------------------------------------------ *
 * small presentational bits
 * ------------------------------------------------------------------ */

function ProgramPill({ program, small }) {
  if (!program) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${
        small ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      }`}
      style={pillStyle(program.programcolor)}
      title={program.program_name}
    >
      {program.programiconurl ? (
        <img
          src={program.programiconurl}
          alt=""
          className="h-3.5 w-3.5 rounded-sm object-contain"
        />
      ) : null}
      <span className="truncate max-w-36">{program.program_name}</span>
    </span>
  );
}

function SkillPill({ skill }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={pillStyle(skill.skillcolor)}
      title={skill.skill_name}
    >
      {skill.skilliconurl ? (
        <img
          src={skill.skilliconurl}
          alt=""
          className="h-3 w-3 rounded-sm object-contain"
        />
      ) : null}
      <span className="truncate max-w-28">{skill.skill_name}</span>
    </span>
  );
}

function LevelBadge({ level, className = "" }) {
  const lvl = parseInt(level, 10) || 1;
  const color = LEVEL_COLORS[lvl] || "#64748b";
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${className}`}
      style={pillStyle(color)}
      title={LEVEL_LABELS[lvl]}
    >
      Lv.{lvl}
    </span>
  );
}

// Independent course-type tags (a course may be both Public and In-house).
const TYPE_META = {
  public: { label: "Public", color: "#0ea5e9" },
  inhouse: { label: "In-house", color: "#8b5cf6" },
};

function TypeBadges({ course, className = "" }) {
  const badges = [];
  if (course.course_type_public) badges.push(TYPE_META.public);
  if (course.course_type_inhouse) badges.push(TYPE_META.inhouse);
  if (!badges.length) return null;
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {badges.map((b) => (
        <span
          key={b.label}
          className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
          style={pillStyle(b.color)}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}

function PriceBlock({ course, align = "left" }) {
  const price = Number(course.course_price) || 0;
  const eff = effectivePrice(course);
  const discounted = eff < price;
  const alignCls = align === "right" ? "items-end text-right" : "items-start";
  if (price <= 0) {
    return <span className="text-sm text-slate-400">—</span>;
  }
  return (
    <div className={`flex flex-col ${alignCls}`}>
      <span className="text-sm font-bold text-slate-900">{fmtBaht(eff)}</span>
      {discounted ? (
        <span className="text-xs text-slate-400 line-through">
          {fmtBaht(price)}
        </span>
      ) : null}
    </div>
  );
}

function DocButtons({ course, small }) {
  const en = course.course_outline_en?.download_url;
  const th = course.course_outline_th?.download_url;
  if (!en && !th) return <span className="text-sm text-slate-400">—</span>;
  const base = `inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 transition ${
    small ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
  }`;
  return (
    <div className="flex flex-wrap gap-1.5">
      {en ? (
        <a href={en} target="_blank" rel="noopener noreferrer" className={base}>
          <Download className="h-3 w-3" /> EN
        </a>
      ) : null}
      {th ? (
        <a href={th} target="_blank" rel="noopener noreferrer" className={base}>
          <Download className="h-3 w-3" /> TH
        </a>
      ) : null}
    </div>
  );
}

// Build the plaintext "course detail" block copied from the row menu.
function courseDetailText(c) {
  const skills = c.skills.map((s) => s.skill_name).join(", ") || "-";
  const price =
    Number(c.course_price) > 0
      ? `${Number(c.course_price).toLocaleString("th-TH")} บาท`
      : "-";
  return [
    `${c.course_name} (${c.course_id})`,
    `โปรแกรม: ${c.program?.program_name || "-"}`,
    `ทักษะ: ${skills}`,
    `ระยะเวลา: ${c.course_trainingdays || 0} วัน / ${
      c.course_traininghours || 0
    } ชม.`,
    `ระดับ: Lv.${c.course_levels}`,
    `ราคา: ${price}`,
    c.course_teaser || "",
    `เอกสาร EN: ${c.course_outline_en?.download_url || "-"}`,
    `เอกสาร TH: ${c.course_outline_th?.download_url || "-"}`,
  ].join("\n");
}

/* ------------------------------------------------------------------ *
 * per-row 3-dot copy menu (⋯)
 * ------------------------------------------------------------------ */

// `items`: [{ icon, label, value, copiedLabel }]. A falsy `value` disables the
// item. Uses fixed positioning (anchored to the trigger) so the popover is
// never clipped by the table's overflow-x-auto container. Closes on outside
// click, Escape, and scroll/resize.
function RowMenu({ items, onToast }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const MENU_W = 260;
  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      let left = r.right - MENU_W;
      if (left < 8) left = 8;
      setPos({ top: r.bottom + 4, left });
    }
    setOpen((o) => !o);
  };

  const handleCopy = async (item) => {
    if (!item.value) return;
    try {
      await navigator.clipboard.writeText(item.value);
      onToast?.(item.copiedLabel || "คัดลอกแล้ว!");
    } catch {
      /* clipboard denied — silently ignore */
    }
    setOpen(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label="ตัวเลือกเพิ่มเติม"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div
          ref={menuRef}
          role="menu"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: MENU_W }}
          className="z-50 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {items.map((item, i) => (
            <button
              key={i}
              role="menuitem"
              disabled={!item.value}
              onClick={() => handleCopy(item)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
            >
              <span className="shrink-0 text-slate-400">{item.icon}</span>
              <span className="flex-1 truncate">{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

// Small toast pinned to the bottom-center, reusing the "คัดลอกแล้ว!" pattern.
function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-60 flex justify-center">
      <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
        <Check className="h-4 w-4 text-green-400" /> {message}
      </div>
    </div>
  );
}

// Row-menu item builders per tab.
function courseMenuItems(c) {
  return [
    {
      icon: <ImageIcon className="h-4 w-4" />,
      label: "คัดลอกลิงก์ปก",
      value: c.course_cover_url || "",
      copiedLabel: "คัดลอกลิงก์ปกแล้ว!",
    },
    {
      icon: <FileText className="h-4 w-4" />,
      label: "คัดลอกรายละเอียดหลักสูตร",
      value: courseDetailText(c),
      copiedLabel: "คัดลอกรายละเอียดแล้ว!",
    },
  ];
}

function programMenuItems(p) {
  return [
    {
      icon: <Link2 className="h-4 w-4" />,
      label: "คัดลอกลิงก์ไอคอน",
      value: p.programiconurl || "",
      copiedLabel: "คัดลอกลิงก์ไอคอนแล้ว!",
    },
    {
      icon: <Palette className="h-4 w-4" />,
      label: "คัดลอกสี",
      value: p.programcolor || "",
      copiedLabel: "คัดลอกสีแล้ว!",
    },
  ];
}

function skillMenuItems(s) {
  return [
    {
      icon: <Link2 className="h-4 w-4" />,
      label: "คัดลอกลิงก์ไอคอน",
      value: s.skilliconurl || "",
      copiedLabel: "คัดลอกลิงก์ไอคอนแล้ว!",
    },
    {
      icon: <Palette className="h-4 w-4" />,
      label: "คัดลอกสี",
      value: s.skillcolor || "",
      copiedLabel: "คัดลอกสีแล้ว!",
    },
  ];
}

/* ------------------------------------------------------------------ *
 * main inner component (uses useSearchParams -> must be in <Suspense>)
 * ------------------------------------------------------------------ */

function AllCoursesInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [data, setData] = useState(null); // { items, filters, total }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filter / view state (initialised from URL)
  const [type, setType] = useState(() => {
    const t = searchParams.get("type");
    return t === "public" || t === "inhouse" ? t : "";
  });
  const [program, setProgram] = useState(searchParams.get("program") || "");
  const [skill, setSkill] = useState(searchParams.get("skill") || "");
  const [level, setLevel] = useState(searchParams.get("level") || "");
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [view, setView] = useState(
    searchParams.get("view") === "card" ? "card" : "table"
  );

  const [sortKey, setSortKey] = useState("default");
  const [sortDir, setSortDir] = useState("asc");

  const [copied, setCopied] = useState(false);
  const [exportMsg, setExportMsg] = useState("");

  // active tab: "courses" (default) | "programs" | "skills"
  const [tab, setTab] = useState(() => {
    const t = searchParams.get("tab");
    return t === "programs" || t === "skills" ? t : "courses";
  });

  // lazy-loaded + cached data for the programs / skills tabs
  const [programsData, setProgramsData] = useState(null);
  const [skillsData, setSkillsData] = useState(null);
  const [tabLoading, setTabLoading] = useState(false);
  const [tabError, setTabError] = useState("");

  // transient toast for the copy menu ("คัดลอกแล้ว!" pattern)
  const [toast, setToast] = useState("");
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }, []);

  /* ---- fetch once on mount ---- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/all-courses", { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        if (!res.ok || !json.ok) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }
        setData({
          items: json.items || [],
          filters: json.filters || { programs: [], skills: [], levels: [] },
          total: json.total || 0,
        });
      } catch (e) {
        if (alive) setError(e.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ---- keep URL in sync with tab/filter/view state ---- */
  useEffect(() => {
    const params = new URLSearchParams();
    if (tab !== "courses") params.set("tab", tab);
    if (type) params.set("type", type);
    if (program) params.set("program", program);
    if (skill) params.set("skill", skill);
    if (level) params.set("level", level);
    if (q) params.set("q", q);
    if (view === "card") params.set("view", "card");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // reset the copied indicator whenever the shareable URL changes
    setCopied(false);
  }, [tab, type, program, skill, level, q, view, pathname, router]);

  /* ---- lazy-load + cache programs / skills when their tab is opened ---- */
  useEffect(() => {
    let alive = true;
    async function load(url, setter) {
      try {
        setTabLoading(true);
        setTabError("");
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        setter(json.items || []);
      } catch (e) {
        if (alive) setTabError(e.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        if (alive) setTabLoading(false);
      }
    }
    if (tab === "programs" && programsData == null) {
      load("/api/programs?withCounts=1", setProgramsData);
    } else if (tab === "skills" && skillsData == null) {
      load("/api/skills", setSkillsData);
    }
    return () => {
      alive = false;
    };
  }, [tab, programsData, skillsData]);

  /* ---- derived: filtered + sorted list ---- */
  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    let list = data.items.filter((c) => {
      // type filter: "has this flag" (public & inhouse are independent booleans)
      if (type === "public" && c.course_type_public !== true) return false;
      if (type === "inhouse" && c.course_type_inhouse !== true) return false;
      if (program && c.program?.program_id !== program) return false;
      if (skill && !c.skills.some((s) => s.skill_id === skill)) return false;
      if (level && String(c.course_levels) !== String(level)) return false;
      if (needle) {
        const hay = `${c.course_name} ${c.course_id} ${c.course_teaser}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });

    if (sortKey !== "default") {
      const dir = sortDir === "desc" ? -1 : 1;
      list = list
        .map((c, i) => [c, i])
        .sort((a, b) => {
          const va = sortValue(a[0], sortKey);
          const vb = sortValue(b[0], sortKey);
          let cmp;
          if (typeof va === "string" || typeof vb === "string") {
            cmp = String(va).localeCompare(String(vb), "th");
          } else {
            cmp = va - vb;
          }
          if (cmp === 0) return a[1] - b[1]; // stable
          return cmp * dir;
        })
        .map((pair) => pair[0]);
    }
    return list;
  }, [data, type, program, skill, level, q, sortKey, sortDir]);

  const total = data?.total || 0;
  const hasFilters = type || program || skill || level || q;

  /* ---- derived: program / skill tab lists filtered by the search box ---- */
  const filteredPrograms = useMemo(() => {
    if (!programsData) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return programsData;
    return programsData.filter((p) =>
      `${p.program_name} ${p.program_id}`.toLowerCase().includes(needle)
    );
  }, [programsData, q]);

  const filteredSkills = useMemo(() => {
    if (!skillsData) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return skillsData;
    return skillsData.filter((s) =>
      `${s.skill_name} ${s.skill_id}`.toLowerCase().includes(needle)
    );
  }, [skillsData, q]);

  /* ---- handlers ---- */
  const toggleProgram = useCallback(
    (id) => setProgram((p) => (p === id ? "" : id)),
    []
  );
  const toggleSkill = useCallback(
    (id) => setSkill((p) => (p === id ? "" : id)),
    []
  );
  const toggleLevel = useCallback(
    (lv) => setLevel((p) => (String(p) === String(lv) ? "" : String(lv))),
    []
  );

  const clearAll = useCallback(() => {
    setType("");
    setProgram("");
    setSkill("");
    setLevel("");
    setQ("");
    setSortKey("default");
    setSortDir("asc");
  }, []);

  const onHeaderSort = useCallback(
    (key) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey]
  );

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, []);

  const exportExcel = useCallback(() => {
    if (!filtered.length) return;
    const rows = filtered.map((c) => ({
      "รหัสหลักสูตร": c.course_id,
      "ชื่อหลักสูตร": c.course_name,
      "โปรแกรม": c.program?.program_name || "",
      "ทักษะ": c.skills.map((s) => s.skill_name).join(", "),
      "จำนวนวัน": c.course_trainingdays || 0,
      "จำนวนชั่วโมง": c.course_traininghours || 0,
      "ระดับ": c.course_levels || "",
      "ราคา": c.course_price || 0,
      "ราคาสุทธิ": c.course_netprice ?? "",
      "คำอธิบาย": c.course_teaser || "",
      "ลิงก์เอกสาร EN": c.course_outline_en?.download_url || "",
      "ลิงก์เอกสาร TH": c.course_outline_th?.download_url || "",
      "ลิงก์ปก": c.course_cover_url || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 16 }, // course_id
      { wch: 40 }, // name
      { wch: 18 }, // program
      { wch: 30 }, // skills
      { wch: 10 }, // days
      { wch: 12 }, // hours
      { wch: 8 }, // level
      { wch: 12 }, // price
      { wch: 12 }, // netprice
      { wch: 50 }, // teaser
      { wch: 40 }, // en link
      { wch: 40 }, // th link
      { wch: 40 }, // cover
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Courses");

    // Build a filename that reflects active filters + today's date.
    const today = new Date().toISOString().slice(0, 10);
    const parts = [];
    if (type) parts.push(type);
    if (program) parts.push(program);
    if (skill) parts.push(skill);
    if (level) parts.push(`level${level}`);
    const tag = parts.length ? parts.join("_") : "all";
    const filename = `9expert-courses_${tag}_${today}.xlsx`;

    XLSX.writeFile(wb, filename);
    setExportMsg(`ส่งออก ${rows.length} รายการแล้ว`);
    setTimeout(() => setExportMsg(""), 3000);
  }, [filtered, type, program, skill, level]);

  /* ---- loading / error states (only block the courses tab) ---- */
  if (loading && tab === "courses" && !data) return <LoadingSkeleton />;
  if (error && tab === "courses") {
    return (
      <div className="mx-auto max-w-2xl p-10 text-center">
        <p className="text-lg font-semibold text-slate-800">
          เกิดข้อผิดพลาดในการโหลดข้อมูล
        </p>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  const filters = data?.filters || {
    programs: [],
    skills: [],
    levels: [],
    types: { all: 0, public: 0, inhouse: 0 },
  };
  const types = filters.types || { all: total, public: 0, inhouse: 0 };
  const searchPlaceholder =
    tab === "courses"
      ? "ค้นหาชื่อหลักสูตร รหัส หรือคำอธิบาย…"
      : tab === "programs"
      ? "ค้นหาชื่อโปรแกรม หรือรหัส…"
      : "ค้นหาชื่อสกิล หรือรหัส…";

  /* ---- render ---- */
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          หลักสูตรทั้งหมด
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          รวมหลักสูตร Public ทั้งหมดของ 9Expert — ค้นหา กรอง จัดเรียง
          และดาวน์โหลดได้
        </p>
      </div>

      {/* category tabs */}
      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {[
          { key: "courses", label: "หลักสูตร" },
          { key: "programs", label: "โปรแกรม" },
          { key: "skills", label: "สกิล" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
            aria-pressed={tab === t.key}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* toolbar */}
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* search */}
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
            />
            {q ? (
              <button
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                aria-label="ล้างคำค้นหา"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {/* right-side controls */}
          <div className="flex flex-wrap items-center gap-2">
            {tab === "courses" ? (
              <>
                {/* sort dropdown (mainly for card view, works everywhere) */}
                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1">
                  <ArrowUpDown className="h-4 w-4 text-slate-400" />
                  <select
                    value={sortKey}
                    onChange={(e) => {
                      setSortKey(e.target.value);
                      setSortDir("asc");
                    }}
                    className="bg-transparent text-sm text-slate-700 outline-none"
                    aria-label="จัดเรียงตาม"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {sortKey !== "default" ? (
                    <button
                      onClick={() =>
                        setSortDir((d) => (d === "asc" ? "desc" : "asc"))
                      }
                      className="rounded p-1 text-slate-500 hover:bg-slate-100"
                      aria-label="สลับทิศทางการจัดเรียง"
                    >
                      {sortDir === "asc" ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )}
                    </button>
                  ) : null}
                </div>

                {/* view toggle */}
                <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
                  <button
                    onClick={() => setView("table")}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium transition ${
                      view === "table"
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                    aria-pressed={view === "table"}
                  >
                    <TableIcon className="h-4 w-4" /> ตาราง
                  </button>
                  <button
                    onClick={() => setView("card")}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium transition ${
                      view === "card"
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                    aria-pressed={view === "card"}
                  >
                    <LayoutGrid className="h-4 w-4" /> การ์ด
                  </button>
                </div>
              </>
            ) : null}

            {/* copy shareable link (all tabs) */}
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-600" /> คัดลอกแล้ว!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> คัดลอกลิงก์
                </>
              )}
            </button>

            {/* export (courses tab only) */}
            {tab === "courses" ? (
              <button
                onClick={exportExcel}
                disabled={!filtered.length}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4" /> Export Excel
              </button>
            ) : null}
          </div>
        </div>

        {/* course-specific slicers */}
        {tab === "courses" ? (
          <>
            {/* type slicer (single-select, like level) */}
            <Slicer label="ประเภท">
              <ChipButton
                active={!type}
                onClick={() => setType("")}
                label="ทั้งหมด"
                count={types.all}
              />
              <ChipButton
                active={type === "public"}
                onClick={() => setType((t) => (t === "public" ? "" : "public"))}
                label="Public"
                count={types.public}
              />
              <ChipButton
                active={type === "inhouse"}
                onClick={() =>
                  setType((t) => (t === "inhouse" ? "" : "inhouse"))
                }
                label="In-house"
                count={types.inhouse}
              />
            </Slicer>

            {/* program slicer */}
            <Slicer label="โปรแกรม">
              <ChipButton
                active={!program}
                onClick={() => setProgram("")}
                label="ทั้งหมด"
              />
              {filters.programs.map((p) => (
                <ChipButton
                  key={p.program_id}
                  active={program === p.program_id}
                  onClick={() => toggleProgram(p.program_id)}
                  color={p.programcolor}
                  icon={p.programiconurl}
                  label={p.program_name}
                  count={p.count}
                />
              ))}
            </Slicer>

            {/* skill slicer */}
            {filters.skills.length ? (
              <Slicer label="ทักษะ">
                <ChipButton
                  active={!skill}
                  onClick={() => setSkill("")}
                  label="ทั้งหมด"
                />
                {filters.skills.map((s) => (
                  <ChipButton
                    key={s.skill_id}
                    active={skill === s.skill_id}
                    onClick={() => toggleSkill(s.skill_id)}
                    color={s.skillcolor}
                    icon={s.skilliconurl}
                    label={s.skill_name}
                    count={s.count}
                  />
                ))}
              </Slicer>
            ) : null}

            {/* level slicer */}
            <Slicer label="ระดับ">
              <ChipButton
                active={!level}
                onClick={() => setLevel("")}
                label="ทั้งหมด"
              />
              {[1, 2, 3, 4].map((lv) => (
                <ChipButton
                  key={lv}
                  active={String(level) === String(lv)}
                  onClick={() => toggleLevel(lv)}
                  color={LEVEL_COLORS[lv]}
                  label={LEVEL_LABELS[lv]}
                  disabled={
                    filters.levels.length > 0 && !filters.levels.includes(lv)
                  }
                />
              ))}
            </Slicer>
          </>
        ) : null}

        {/* result count + clear */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-sm text-slate-600">
            {tab === "courses" ? (
              <>
                แสดง{" "}
                <span className="font-semibold text-slate-900">
                  {filtered.length}
                </span>{" "}
                จาก {total} หลักสูตร
                {exportMsg ? (
                  <span className="ml-2 text-xs text-emerald-600">
                    • {exportMsg}
                  </span>
                ) : null}
              </>
            ) : tab === "programs" ? (
              <>
                แสดง{" "}
                <span className="font-semibold text-slate-900">
                  {filteredPrograms.length}
                </span>{" "}
                โปรแกรม
              </>
            ) : (
              <>
                แสดง{" "}
                <span className="font-semibold text-slate-900">
                  {filteredSkills.length}
                </span>{" "}
                สกิล
              </>
            )}
          </p>
          {tab === "courses" && hasFilters ? (
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"
            >
              <X className="h-4 w-4" /> ล้างตัวกรองทั้งหมด
            </button>
          ) : null}
        </div>
      </div>

      {/* content */}
      {tab === "courses" ? (
        filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-16 text-center">
            <p className="text-slate-500">ไม่พบหลักสูตรที่ตรงกับเงื่อนไข</p>
          </div>
        ) : view === "table" ? (
          <CourseTable
            courses={filtered}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onHeaderSort}
            onToast={showToast}
          />
        ) : (
          <CourseCards courses={filtered} onToast={showToast} />
        )
      ) : tab === "programs" ? (
        <ProgramsGrid
          programs={filteredPrograms}
          loading={tabLoading && !programsData}
          error={tabError}
          onToast={showToast}
        />
      ) : (
        <SkillsGrid
          skills={filteredSkills}
          loading={tabLoading && !skillsData}
          error={tabError}
          onToast={showToast}
        />
      )}

      {/* copy toast */}
      <Toast message={toast} />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * slicer wrappers
 * ------------------------------------------------------------------ */

function Slicer({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3 sm:flex-row sm:items-start sm:gap-3">
      <span className="shrink-0 pt-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function ChipButton({ active, onClick, color, icon, label, count, disabled }) {
  const style = active && color ? pillStyle(color) : undefined;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-transparent shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      }`}
      style={active ? { ...style, borderColor: hexToRgba(color, 0.5) } : undefined}
    >
      {icon ? (
        <img src={icon} alt="" className="h-3.5 w-3.5 rounded-sm object-contain" />
      ) : null}
      <span>{label}</span>
      {count != null ? (
        <span
          className={`rounded-full px-1.5 text-[10px] ${
            active ? "bg-white/60" : "bg-slate-100 text-slate-500"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * table view
 * ------------------------------------------------------------------ */

function SortHeader({ label, active, dir, onClick, className = "" }) {
  return (
    <th className={`px-3 py-2.5 text-left font-semibold ${className}`}>
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 hover:text-slate-900"
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-300" />
        )}
      </button>
    </th>
  );
}

function CourseTable({ courses, sortKey, sortDir, onSort, onToast }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2.5 text-left font-semibold">ปก</th>
            <SortHeader
              label="หลักสูตร"
              active={sortKey === "course_name"}
              dir={sortDir}
              onClick={() => onSort("course_name")}
            />
            <th className="px-3 py-2.5 text-left font-semibold">โปรแกรม</th>
            <th className="px-3 py-2.5 text-left font-semibold">ทักษะ</th>
            <SortHeader
              label="ระยะเวลา"
              active={sortKey === "duration"}
              dir={sortDir}
              onClick={() => onSort("duration")}
            />
            <SortHeader
              label="ระดับ"
              active={sortKey === "level"}
              dir={sortDir}
              onClick={() => onSort("level")}
            />
            <SortHeader
              label="ราคา"
              active={sortKey === "price"}
              dir={sortDir}
              onClick={() => onSort("price")}
            />
            <th className="px-3 py-2.5 text-left font-semibold">เอกสาร</th>
            <th className="px-3 py-2.5 text-right font-semibold">
              <span className="sr-only">เมนู</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c, i) => (
            <tr
              key={c.course_id || i}
              className={`border-t border-slate-100 transition hover:bg-sky-50/50 ${
                i % 2 ? "bg-slate-50/40" : "bg-white"
              }`}
            >
              <td className="px-3 py-2.5">
                <img
                  src={c.course_cover_url || PLACEHOLDER_COVER}
                  onError={(e) => {
                    e.currentTarget.src = PLACEHOLDER_COVER;
                  }}
                  alt=""
                  className="h-11 w-20 rounded-md border border-slate-200 object-cover"
                />
              </td>
              <td className="px-3 py-2.5 align-top">
                <div className="max-w-xs">
                  <div className="font-semibold text-slate-900">
                    {c.course_name}
                  </div>
                  <div className="text-xs text-slate-400">{c.course_id}</div>
                  {c.course_teaser ? (
                    <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                      {c.course_teaser}
                    </div>
                  ) : null}
                  <TypeBadges course={c} className="mt-1" />
                </div>
              </td>
              <td className="px-3 py-2.5 align-top">
                <ProgramPill program={c.program} small />
              </td>
              <td className="px-3 py-2.5 align-top">
                <div className="flex max-w-56 flex-wrap gap-1">
                  {c.skills.map((s) => (
                    <SkillPill key={s.skill_id} skill={s} />
                  ))}
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 align-top text-slate-700">
                {fmtDuration(c.course_trainingdays, c.course_traininghours)}
              </td>
              <td className="px-3 py-2.5 align-top">
                <LevelBadge level={c.course_levels} />
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 align-top">
                <PriceBlock course={c} />
              </td>
              <td className="px-3 py-2.5 align-top">
                <DocButtons course={c} small />
              </td>
              <td className="px-3 py-2.5 text-right align-top">
                <RowMenu items={courseMenuItems(c)} onToast={onToast} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * card view
 * ------------------------------------------------------------------ */

function CourseCards({ courses, onToast }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {courses.map((c, i) => (
        <CourseCard key={c.course_id || i} course={c} onToast={onToast} />
      ))}
    </div>
  );
}

function CourseCard({ course: c, onToast }) {
  const MAX_SKILLS = 3;
  const shown = c.skills.slice(0, MAX_SKILLS);
  const extra = c.skills.length - shown.length;
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {/* cover */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
        <img
          src={c.course_cover_url || PLACEHOLDER_COVER}
          onError={(e) => {
            e.currentTarget.src = PLACEHOLDER_COVER;
          }}
          alt={c.course_name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <LevelBadge
          level={c.course_levels}
          className="absolute right-2 top-2 bg-white/90 backdrop-blur"
        />
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <ProgramPill program={c.program} />
          <RowMenu items={courseMenuItems(c)} onToast={onToast} />
        </div>
        <div>
          <h3 className="line-clamp-2 font-bold leading-snug text-slate-900">
            {c.course_name}
          </h3>
          <p className="text-xs text-slate-400">{c.course_id}</p>
          <TypeBadges course={c} className="mt-1" />
        </div>
        {c.course_teaser ? (
          <p className="line-clamp-3 text-sm text-slate-500">
            {c.course_teaser}
          </p>
        ) : null}

        {shown.length ? (
          <div className="flex flex-wrap gap-1">
            {shown.map((s) => (
              <SkillPill key={s.skill_id} skill={s} />
            ))}
            {extra > 0 ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                +{extra}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* footer */}
        <div className="mt-auto flex items-end justify-between pt-2">
          <span className="text-xs text-slate-500">
            {fmtDuration(c.course_trainingdays, c.course_traininghours)}
          </span>
          <PriceBlock course={c} align="right" />
        </div>

        <div className="pt-1">
          <DocButtons course={c} small />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * programs / skills tab views
 * ------------------------------------------------------------------ */

// Inline-SVG placeholder for a missing program/skill icon.
const PLACEHOLDER_ICON =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='100%' height='100%' rx='8' fill='#e2e8f0'/><text x='50%' y='56%' dominant-baseline='middle' text-anchor='middle' fill='#94a3b8' font-family='sans-serif' font-size='22'>9x</text></svg>`
  );

// A brand-color swatch with its hex printed (handy for the dev/admin view).
function ColorSwatch({ color }) {
  const c = color || "";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
      <span
        className="h-4 w-4 rounded border border-slate-200"
        style={{ backgroundColor: c || "transparent" }}
      />
      <span className="font-mono">{c || "—"}</span>
    </span>
  );
}

// Shared loading / error / empty renderer for the programs & skills tabs.
function TabStateMessage({ loading, error, empty, emptyText }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
          />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border border-dashed border-red-200 bg-red-50 p-10 text-center text-sm text-red-600">
        {error}
      </div>
    );
  }
  if (empty) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-16 text-center">
        <p className="text-slate-500">{emptyText}</p>
      </div>
    );
  }
  return null;
}

// Generic program/skill card (icon + name + slug + teaser + color + menu).
function EntityCard({ icon, name, slug, teaser, color, badge, menu }) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <img
        src={icon || PLACEHOLDER_ICON}
        onError={(e) => {
          e.currentTarget.src = PLACEHOLDER_ICON;
        }}
        alt=""
        className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-1"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-bold text-slate-900">{name}</div>
            <div className="truncate text-xs text-slate-400">{slug}</div>
          </div>
          {menu}
        </div>
        {teaser ? (
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{teaser}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {badge}
          <ColorSwatch color={color} />
        </div>
      </div>
    </div>
  );
}

function ProgramsGrid({ programs, loading, error, onToast }) {
  if (loading || error || !programs.length) {
    return (
      <TabStateMessage
        loading={loading}
        error={error}
        empty={!programs.length}
        emptyText="ไม่พบโปรแกรม"
      />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {programs.map((p) => (
        <EntityCard
          key={p._id || p.program_id}
          icon={p.programiconurl}
          name={p.program_name}
          slug={p.program_id}
          teaser={p.program_teaser}
          color={p.programcolor}
          badge={
            <span
              className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
              style={pillStyle(p.programcolor)}
            >
              {p.counts?.public || 0} หลักสูตร
            </span>
          }
          menu={<RowMenu items={programMenuItems(p)} onToast={onToast} />}
        />
      ))}
    </div>
  );
}

function SkillsGrid({ skills, loading, error, onToast }) {
  if (loading || error || !skills.length) {
    return (
      <TabStateMessage
        loading={loading}
        error={error}
        empty={!skills.length}
        emptyText="ไม่พบสกิล"
      />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {skills.map((s) => (
        <EntityCard
          key={s._id || s.skill_id}
          icon={s.skilliconurl}
          name={s.skill_name}
          slug={s.skill_id}
          teaser={s.skill_teaser}
          color={s.skillcolor}
          menu={<RowMenu items={skillMenuItems(s)} onToast={onToast} />}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * loading skeleton
 * ------------------------------------------------------------------ */

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 h-8 w-64 animate-pulse rounded bg-slate-200" />
      <div className="mb-4 h-40 animate-pulse rounded-xl bg-slate-100" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * page (Suspense boundary for useSearchParams — Next 15 requirement)
 * ------------------------------------------------------------------ */

export default function AllCoursesPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <AllCoursesInner />
    </Suspense>
  );
}
