import NavLink from "@/components/NavLink";
import LogoutButton from "@/components/LogoutButton";
// นำเข้า Icon ที่ต้องการจาก react-icons
import { 
  HiOutlineHome, 
  HiOutlineBookOpen, 
  HiOutlineGlobeAlt, 
  HiOutlineSparkles, 
  HiOutlineCalendar,
  HiOutlineAcademicCap,
  HiMiniCalendarDays,
  HiOutlinePower
} from "react-icons/hi2"; // ใช้ hi2 สำหรับ Heroicons V2

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr]">
      <aside className="bg-slate-950/80 border-r border-white/10 p-4 gap-2 flex flex-col">
        <h1 className="text-lg font-semibold mb-4">Master Data</h1>

        {/* เพิ่ม Icon ใน NavLink และจัดรูปแบบให้สวยงาม */}
        <NavLink href="/admin/dashboard" exact>
          <div className="flex items-center gap-2">
            <HiOutlineHome className="h-5 w-5" /> 
            Dashboard
          </div>
        </NavLink>
        
        <NavLink href="/admin/courses/public">
          <div className="flex items-center gap-2">
            <HiOutlineGlobeAlt className="h-5 w-5" />
            Public Courses
          </div>
        </NavLink>
        
        <NavLink href="/admin/courses/online">
          <div className="flex items-center gap-2">
            <HiOutlineBookOpen className="h-5 w-5" />
            Online Courses
          </div>
        </NavLink>
        
        <NavLink href="/admin/programs">
          <div className="flex items-center gap-2">
            <HiOutlineAcademicCap className="h-5 w-5" />
            Programs
          </div>
        </NavLink>
        
        <NavLink href="/admin/skills">
          <div className="flex items-center gap-2">
            <HiOutlineSparkles className="h-5 w-5" />
            Skills
          </div>
        </NavLink>
        
        <NavLink href="/admin/events">
          <div className="flex items-center gap-2">
            <HiOutlineCalendar className="h-5 w-5" />
            Events
          </div>
        </NavLink>
        
        <NavLink href="/admin/schedules">
          <div className="flex items-center gap-2">
            <HiMiniCalendarDays className="h-5 w-5" />
            Schedules
          </div>
        </NavLink>

        <div className="h-px bg-white/10 my-2" />

        {/* ปุ่ม Logout หน้าตาเหมือนเมนู */}
        <div className="flex items-center gap-2 cursor-pointer">
          <HiOutlinePower className="h-5 w-5" />
          <LogoutButton />
        </div>
      </aside>

      <main className="p-6">{children}</main>
    </div>
  );
}