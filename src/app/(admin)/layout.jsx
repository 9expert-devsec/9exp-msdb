import NavLink from "@/components/NavLink";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr]">
      <aside className="bg-slate-950/80 border-r border-white/10 p-4 gap-2 flex flex-col">
        <h1 className="text-lg font-semibold mb-4">Master Data</h1>

        <NavLink href="/admin/dashboard" exact>
          Dashboard
        </NavLink>
        <NavLink href="/admin/courses/public">Public Courses</NavLink>
        <NavLink href="/admin/courses/online">Online Courses</NavLink>
        <NavLink href="/admin/programs">Programs</NavLink>
        <NavLink href="/admin/skills">Skills</NavLink>
        <NavLink href="/admin/events">Events</NavLink>

        <div className="h-px bg-white/10 my-2" />

        {/* ปุ่ม Logout หน้าตาเหมือนเมนู */}
        <LogoutButton />
      </aside>

      <main className="p-6">{children}</main>
    </div>
  );
}
