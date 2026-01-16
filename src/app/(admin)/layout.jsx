// src/app/(admin)/admin/layout.jsx
"use client";

import { useState, useRef, useEffect } from "react";
import NavLink from "@/components/NavLink";
import LogoutButton from "@/components/LogoutButton";
import { useRouter } from "next/navigation";

import {
  HiOutlineHome,
  HiOutlineBookOpen,
  HiOutlineGlobeAlt,
  HiOutlineSparkles,
  HiOutlineCalendar,
  HiOutlineAcademicCap,
  HiMiniCalendarDays,
  HiOutlinePower,
  HiOutlineUserGroup,
  HiOutlineBuildingOffice2,
  HiOutlineClock,
  HiOutlinePhone,
  HiOutlineMegaphone,
  HiOutlineQuestionMarkCircle,
  HiOutlineChevronDown,
  HiOutlineBars3,
  HiOutlineMagnifyingGlass,
  HiOutlineBell,
  HiOutlineUserCircle,
  HiOutlineXMark,
  HiOutlineSun,
  HiOutlineMoon,
} from "react-icons/hi2";

export const dynamic = "force-dynamic";

/* base class ของตัว content เมนู */
const baseMenu =
  "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors";

/* เมนูหลัก + ย่อยใช้ component เดียวกัน */
function NavItem({ href, icon: Icon, label, exact, sidebarOpen, isDark }) {
  const colorClasses = isDark
    ? "text-slate-200 hover:text-white hover:bg-slate-900/40"
    : "text-[#0A1F33] hover:text-[#0099CC] hover:bg-[#E5F8FB]";

  return (
    <NavLink href={href} exact={exact}>
      <div
        className={`${baseMenu} ${colorClasses} ${
          sidebarOpen ? "justify-start" : "justify-center"
        } rounded-lg`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {sidebarOpen && <span>{label}</span>}
      </div>
    </NavLink>
  );
}

export default function AdminLayout({ children }) {
  const router = useRouter();
  // sidebarCollapsed = true → โหมดไอคอนแถวเดียว
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // hoverExpand = true เฉพาะตอนเอาเมาส์ไปชี้ที่ sidebar ตอนที่มันถูกย่ออยู่
  const [hoverExpand, setHoverExpand] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchTimerRef = useRef(null);
  const searchBoxRef = useRef(null); // ใช้จับ click outside

  // theme: "dark" | "light"
  const [theme, setTheme] = useState("dark");
  const isDark = theme === "dark";

  // ขยายไหมตอนนี้ (คิดจาก pin + hover)
  const sidebarOpen = !sidebarCollapsed || hoverExpand;
  const sidebarWidth = sidebarOpen ? 240 : 72;

  useEffect(() => {
    function handleClick(e) {
      if (!searchBoxRef.current) return;
      if (!searchBoxRef.current.contains(e.target)) {
        setSearchOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!searchResults.length) {
      setActiveIndex(-1);
    } else {
      setActiveIndex(0); // โฟกัสตัวแรกอัตโนมัติ
    }
  }, [searchResults]);

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      setActiveIndex(-1);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const res = await fetch(
          `/api/admin/search-courses?q=${encodeURIComponent(trimmed)}&limit=10`
        );
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setSearchResults(data.items || []);
        setSearchOpen(true);
      } catch (err) {
        console.error(err);
        setSearchResults([]);
        setSearchOpen(false);
      } finally {
        setSearchLoading(false);
      }
    }, 250); // debounce 250ms
  };

  const handleResultClick = (item) => {
    const baseMap = {
      public: "/admin/courses/public",
      online: "/admin/courses/online",
      instructor: "/admin/instructors",
      event: "/admin/events",
    };

    const base = baseMap[item.kind] || "/admin/dashboard";

    const url = `${base}?search=${encodeURIComponent(
      item.code || item.name || ""
    )}`;

    router.push(url);
    setSearchOpen(false);
    setActiveIndex(-1);
  };

  const handleSearchKeyDown = (e) => {
    if (!searchResults.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSearchOpen(true);
      setActiveIndex((prev) => {
        const next = prev + 1;
        return next >= searchResults.length ? 0 : next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSearchOpen(true);
      setActiveIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? searchResults.length - 1 : next;
      });
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < searchResults.length) {
        e.preventDefault();
        handleResultClick(searchResults[activeIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSearchOpen(false);
      setActiveIndex(-1);
    }
  };

  const headerClass = isDark
    ? "fixed top-0 left-0 right-0 h-14 bg-slate-900/70 backdrop-blur border-b border-white/10 flex items-center px-4 z-40"
    : "fixed top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur border-b border-[#E5E7EB] flex items-center px-4 z-40";

  const sidebarClass = isDark
    ? "bg-[#050b24] border-r border-slate-900 p-4 flex flex-col gap-4 transition-[width] duration-300 ease-in-out sticky top-14 h-[calc(100vh-3.5rem)]"
    : "bg-white border-r border-[#E5E7EB] p-4 flex flex-col gap-4 transition-[width] duration-300 ease-in-out sticky top-14 h-[calc(100vh-3.5rem)]";

  const mainWrapperClass = isDark
    ? "min-h-screen flex bg-slate-950 text-slate-100"
    : "min-h-screen flex bg-[#F5F8FB] text-[#0A1F33]";

  const searchBoxClass = isDark
    ? "flex items-center bg-slate-800/50 border border-white/10 rounded-xl px-3 py-1 w-80 max-w-xs"
    : "flex items-center bg-white border border-[#E5E7EB] rounded-xl px-3 py-1 w-80 max-w-xs";

  const searchInputClass = isDark
    ? "bg-transparent w-full px-2 py-1 text-sm text-slate-200 focus:outline-none"
    : "bg-transparent w-full px-2 py-1 text-sm text-[#0A1F33] focus:outline-none";

  const topIconClass = isDark
    ? "h-6 w-6 text-slate-200 cursor-pointer hover:text-white"
    : "h-6 w-6 text-[#4B5363] cursor-pointer hover:text-[#0099CC]";

  const groupTitleClass = isDark
    ? "text-[11px] uppercase font-semibold tracking-wider text-slate-500 px-3"
    : "text-[11px] uppercase font-semibold tracking-wider text-[#4B5363] px-3";

  const infoButtonColor = isDark
    ? "text-slate-300 hover:text-white hover:bg-slate-900/40"
    : "text-[#4B5363] hover:text-[#0099CC] hover:bg-[#E5F8FB]";

  const logoutButtonColor = isDark
    ? "text-slate-300 hover:text-white hover:bg-slate-900/40"
    : "text-[#4B5363] hover:text-[#E53935] hover:bg-[#FFE5E5]";

  return (
    <div className={mainWrapperClass}>
      {/* TOPBAR */}
      <header className={headerClass}>
        {/* ปุ่ม toggle pin (เต็ม <-> ย่อ) */}
        <button
          onClick={() => {
            setSidebarCollapsed((v) => !v);
            setHoverExpand(false);
          }}
          className={
            isDark
              ? "mr-4 rounded-full bg-slate-800/60 border border-white/10 p-2 hover:bg-slate-700 transition"
              : "mr-4 rounded-full bg-white border border-[#E5E7EB] p-2 hover:bg-[#F5F8FB] transition"
          }
        >
          {sidebarCollapsed ? (
            <HiOutlineXMark
              className={
                isDark ? "h-5 w-5 text-white" : "h-5 w-5 text-[#0A1F33]"
              }
            />
          ) : (
            <HiOutlineBars3
              className={
                isDark ? "h-5 w-5 text-white" : "h-5 w-5 text-[#0A1F33]"
              }
            />
          )}
        </button>

        {/* Global Search Box */}
        <div ref={searchBoxRef} className="relative w-80 max-w-xs">
          <div className="flex items-center bg-slate-800/50 border border-white/10 rounded-xl px-3 py-1">
            <HiOutlineMagnifyingGlass className="h-4 w-4 text-slate-300" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown} // ⭐ เพิ่มตรงนี้
              placeholder="Search courses (ID / name)..."
              className="bg-transparent w-full px-2 py-1 text-sm text-slate-200 focus:outline-none"
            />
            {searchLoading && (
              <span className="ml-1 text-[10px] text-slate-400">…</span>
            )}
          </div>

          {/* Dropdown results */}
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 rounded-xl bg-slate-900 border border-white/10 shadow-xl z-50 max-h-80 overflow-auto">
              {searchResults.map((item, idx) => {
                const isActive = idx === activeIndex;

                const kindLabel =
                  item.kind === "public"
                    ? "Public"
                    : item.kind === "online"
                    ? "Online"
                    : item.kind === "instructor"
                    ? "Instructor"
                    : item.kind === "event"
                    ? "Event"
                    : "Other";

                const kindClass =
                  item.kind === "public"
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-400/40"
                    : item.kind === "online"
                    ? "bg-sky-500/10 text-sky-300 border-sky-400/40"
                    : item.kind === "instructor"
                    ? "bg-amber-500/10 text-amber-300 border-amber-400/40"
                    : "bg-violet-500/10 text-violet-300 border-violet-400/40";

                return (
                  <button
                    key={`${item.kind}-${item.id}`}
                    type="button"
                    onClick={() => handleResultClick(item)}
                    className={`w-full text-left px-3 py-2 text-sm flex flex-col gap-0.5 ${
                      isActive ? "bg-slate-800" : "hover:bg-slate-800/70"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-50">
                        {item.name}
                      </span>
                      <span
                        className={`ml-2 text-[11px] px-2 py-0.5 rounded-full border ${kindClass}`}
                      >
                        {kindLabel}
                      </span>
                    </div>
                    {item.meta && (
                      <div className="text-xs text-slate-400">{item.meta}</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-4">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={
              isDark
                ? "flex items-center justify-center h-9 w-9 rounded-full bg-slate-800/70 border border-white/10 text-slate-100 hover:bg-slate-700 transition"
                : "flex items-center justify-center h-9 w-9 rounded-full bg-white border border-[#E5E7EB] text-[#4B5363] hover:bg-[#F5F8FB] transition"
            }
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? (
              <HiOutlineSun className="h-5 w-5" />
            ) : (
              <HiOutlineMoon className="h-5 w-5" />
            )}
          </button>

          <HiOutlineBell className={topIconClass} />
          <HiOutlineUserCircle className={topIconClass} />
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex pt-14 w-full">
        {/* SIDEBAR */}
        <aside
          style={{ width: sidebarWidth }}
          className={sidebarClass}
          onMouseEnter={() => {
            if (sidebarCollapsed) setHoverExpand(true);
          }}
          onMouseLeave={() => {
            if (sidebarCollapsed) setHoverExpand(false);
          }}
        >
          {/* LOGO + TITLE */}
          <div className="relative flex items-center px-2">
            <img
              src="/logo-9exp-sec.png"
              alt="logo"
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-contain"
            />

            {sidebarOpen && (
              <span className="ml-2 text-lg font-semibold tracking-wide">
                9EXP.SEC
              </span>
            )}

            {/* ปุ่ม un-collapse ตอน hover */}
            {sidebarCollapsed && hoverExpand && (
              <button
                type="button"
                onClick={() => {
                  setSidebarCollapsed(false);
                  setHoverExpand(false);
                }}
                className={
                  isDark
                    ? "absolute right-0 top-1.5 rounded-full p-1.5 hover:bg-slate-800/60 text-slate-300 hover:text-white"
                    : "absolute right-0 top-1.5 rounded-full p-1.5 hover:bg-[#F5F8FB] text-[#4B5363] hover:text-[#0099CC]"
                }
              >
                <HiOutlineXMark className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* MENU CONTENT */}
          <nav className="space-y-3 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {/* GROUP 1 */}
            {sidebarOpen && <div className={groupTitleClass}>Main Menu</div>}

            <NavItem
              href="/admin/dashboard"
              icon={HiOutlineHome}
              label="Dashboard"
              exact
              sidebarOpen={sidebarOpen}
              isDark={isDark}
            />
            <NavItem
              href="/admin/courses/public"
              icon={HiOutlineGlobeAlt}
              label="Public Courses"
              sidebarOpen={sidebarOpen}
              isDark={isDark}
            />
            <NavItem
              href="/admin/courses/online"
              icon={HiOutlineBookOpen}
              label="Online Courses"
              sidebarOpen={sidebarOpen}
              isDark={isDark}
            />

            {/* GROUP 2 */}
            {sidebarOpen && (
              <div className={`${groupTitleClass} mt-3`}>Course Settings</div>
            )}

            <NavItem
              href="/admin/programs"
              icon={HiOutlineAcademicCap}
              label="Programs"
              sidebarOpen={sidebarOpen}
              isDark={isDark}
            />
            <NavItem
              href="/admin/skills"
              icon={HiOutlineSparkles}
              label="Skills"
              sidebarOpen={sidebarOpen}
              isDark={isDark}
            />
            <NavItem
              href="/admin/events"
              icon={HiOutlineCalendar}
              label="Events"
              sidebarOpen={sidebarOpen}
              isDark={isDark}
            />
            <NavItem
              href="/admin/schedules"
              icon={HiMiniCalendarDays}
              label="Schedules"
              sidebarOpen={sidebarOpen}
              isDark={isDark}
            />
            <NavItem
              href="/admin/instructors"
              icon={HiOutlineUserGroup}
              label="Instructor"
              sidebarOpen={sidebarOpen}
              isDark={isDark}
            />

            {/* GROUP 3 */}
            {sidebarOpen && (
              <div className={`${groupTitleClass} mt-3`}>About</div>
            )}

            {/* 9Expert Info */}
            {sidebarOpen ? (
              // โหมดเต็ม: มีปุ่ม + dropdown
              <div>
                <button
                  type="button"
                  onClick={() => setIsInfoOpen((v) => !v)}
                  className={`${baseMenu} w-full justify-between rounded-lg ${infoButtonColor}`}
                >
                  <span className="flex items-center gap-3">
                    <HiOutlineBuildingOffice2 className="h-5 w-5 shrink-0" />
                    <span>9Expert Info</span>
                  </span>
                  <HiOutlineChevronDown
                    className={`h-4 w-4 transition-transform ${
                      isInfoOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isInfoOpen && (
                  <div className="ml-6 mt-2 flex flex-col gap-1">
                    <NavItem
                      href="/admin/9expert/about-us/preview"
                      icon={HiOutlineClock}
                      label="About Us"
                      sidebarOpen={sidebarOpen}
                      isDark={isDark}
                    />
                    <NavItem
                      href="/admin/9expert/contact-us/preview"
                      icon={HiOutlinePhone}
                      label="Contact Us"
                      sidebarOpen={sidebarOpen}
                      isDark={isDark}
                    />
                    <NavItem
                      href="/admin/9expert/promotion"
                      icon={HiOutlineMegaphone}
                      label="Promotion"
                      sidebarOpen={sidebarOpen}
                      isDark={isDark}
                    />
                    <NavItem
                      href="/admin/9expert/faq"
                      icon={HiOutlineQuestionMarkCircle}
                      label="FAQ"
                      sidebarOpen={sidebarOpen}
                      isDark={isDark}
                    />
                  </div>
                )}
              </div>
            ) : (
              // โหมดไอคอน: เป็นเมนูเดี่ยว
              <NavItem
                href="/admin/9expert/history"
                icon={HiOutlineBuildingOffice2}
                label="9Expert Info"
                sidebarOpen={sidebarOpen}
                isDark={isDark}
              />
            )}
          </nav>

          {/* LOGOUT */}
          <LogoutButton>
            <div
              className={`${baseMenu} ${
                sidebarOpen ? "justify-start" : "justify-center"
              } rounded-lg ${logoutButtonColor}`}
            >
              <HiOutlinePower className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span>Log out</span>}
            </div>
          </LogoutButton>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
