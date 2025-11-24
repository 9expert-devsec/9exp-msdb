"use client";

import { useState } from "react";
import NavLink from "@/components/NavLink";
import LogoutButton from "@/components/LogoutButton";

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
} from "react-icons/hi2";

export const dynamic = "force-dynamic";

/* Base class ของเมนู */
const baseMenu =
  "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors";

function NavItem({ href, icon: Icon, label, exact, sidebarOpen }) {
  return (
    <NavLink href={href} exact={exact}>
      <div
        className={`${baseMenu} ${
          sidebarOpen ? "justify-start" : "justify-center"
        }`}
      >
        <Icon className="h-5 w-5" />
        {sidebarOpen && <span>{label}</span>}
      </div>
    </NavLink>
  );
}

export default function AdminLayout({ children }) {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const sidebarWidth = sidebarOpen ? 240 : 72;

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* TOPBAR */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-slate-900/70 backdrop-blur border-b border-white/10 flex items-center px-4 z-40">
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="mr-4 rounded-full bg-slate-800/60 border border-white/10 p-2 hover:bg-slate-700 transition"
        >
          <HiOutlineBars3 className="h-5 w-5 text-white" />
        </button>

        {/* Search Box */}
        <div className="flex items-center bg-slate-800/50 border border-white/10 rounded-xl px-3 py-1 w-80 max-w-xs">
          <HiOutlineMagnifyingGlass className="h-4 w-4 text-slate-300" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent w-full px-2 py-1 text-sm text-slate-200 focus:outline-none"
          />
        </div>

        <div className="ml-auto flex items-center gap-4">
          <HiOutlineBell className="h-6 w-6 text-slate-200 cursor-pointer hover:text-white" />
          <HiOutlineUserCircle className="h-7 w-7 text-slate-200 cursor-pointer hover:text-white" />
        </div>
      </header>

      {/* PAGE LAYOUT */}
      <div className="flex pt-14 w-full">
        {/* SIDEBAR */}
        <aside
          style={{ width: sidebarWidth }}
          className="bg-[#050b24] border-r border-slate-900 p-4 flex flex-col gap-4 transition-[width] duration-300 ease-in-out
          sticky top-14 h-[calc(100vh-3.5rem)]"
        >
          {/* LOGO */}
          <div className="flex items-center gap-2 px-2">
            <div className="h-9 w-9 rounded-full bg-emerald-500/10 border border-emerald-400/40 flex items-center justify-center text-xs font-semibold text-emerald-200">
              9E
            </div>
            {sidebarOpen && (
              <span className="text-lg font-semibold tracking-wide">
                9Exp-Sec
              </span>
            )}
          </div>

          {/* MENU CONTENT */}
          <nav className="space-y-3 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">

            {/* GROUP 1 */}
            {sidebarOpen && (
              <div className="text-[11px] uppercase font-semibold tracking-wider text-slate-500 px-3">
                Main Menu
              </div>
            )}

            <NavItem
              href="/admin/dashboard"
              icon={HiOutlineHome}
              label="Dashboard"
              exact
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              href="/admin/courses/public"
              icon={HiOutlineGlobeAlt}
              label="Public Courses"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              href="/admin/courses/online"
              icon={HiOutlineBookOpen}
              label="Online Courses"
              sidebarOpen={sidebarOpen}
            />

            {/* GROUP 2 */}
            {sidebarOpen && (
              <div className="mt-3 text-[11px] uppercase tracking-wider font-semibold text-slate-500 px-3">
                Course Settings
              </div>
            )}

            <NavItem
              href="/admin/programs"
              icon={HiOutlineAcademicCap}
              label="Programs"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              href="/admin/skills"
              icon={HiOutlineSparkles}
              label="Skills"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              href="/admin/events"
              icon={HiOutlineCalendar}
              label="Events"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              href="/admin/schedules"
              icon={HiMiniCalendarDays}
              label="Schedules"
              sidebarOpen={sidebarOpen}
            />

            <NavItem
              href="/admin/instructors"
              icon={HiOutlineUserGroup}
              label="Instructor"
              sidebarOpen={sidebarOpen}
            />

            {/* GROUP 3 */}
            {sidebarOpen && (
              <div className="mt-3 text-[11px] uppercase tracking-wider font-semibold text-slate-500 px-3">
                About
              </div>
            )}

            {/* 9Expert Info */}
            <div>
              <button
                onClick={() => setIsInfoOpen((v) => !v)}
                className={`${baseMenu} ${
                  sidebarOpen
                    ? "justify-between text-slate-300 hover:text-white hover:bg-slate-900/40 rounded-lg"
                    : "justify-center"
                }`}
              >
                <span className="flex items-center gap-3">
                  <HiOutlineBuildingOffice2 className="h-5 w-5" />
                  {sidebarOpen && "9Expert Info"}
                </span>

                {sidebarOpen && (
                  <HiOutlineChevronDown
                    className={`h-4 w-4 transition-transform ${
                      isInfoOpen ? "rotate-180" : ""
                    }`}
                  />
                )}
              </button>

              {/* SUBMENU */}
              {sidebarOpen && isInfoOpen && (
                <div className="ml-6 mt-2 flex flex-col gap-1">
                  <NavItem
                    href="/admin/9expert/history"
                    icon={HiOutlineClock}
                    label="History"
                    sidebarOpen={sidebarOpen}
                  />
                  <NavItem
                    href="/admin/9expert/contact"
                    icon={HiOutlinePhone}
                    label="Contact Us"
                    sidebarOpen={sidebarOpen}
                  />
                  <NavItem
                    href="/admin/9expert/promotion"
                    icon={HiOutlineMegaphone}
                    label="Promotion"
                    sidebarOpen={sidebarOpen}
                  />
                  <NavItem
                    href="/admin/9expert/faq"
                    icon={HiOutlineQuestionMarkCircle}
                    label="FAQ"
                    sidebarOpen={sidebarOpen}
                  />
                </div>
              )}
            </div>
          </nav>

          {/* LOGOUT */}
          <LogoutButton>
            <div
              className={`${baseMenu} ${
                sidebarOpen ? "justify-start" : "justify-center"
              } rounded-lg text-slate-300 hover:text-white hover:bg-slate-900/40`}
            >
              <HiOutlinePower className="h-5 w-5" />
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
