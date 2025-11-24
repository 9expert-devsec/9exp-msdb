// /src/components/NavLink.jsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({
  href,
  children,
  exact = false,
  className = "",
}) {
  const pathname = usePathname();
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");

  const base = "block rounded-lg transition-colors";
  const active =
    "bg-slate-900/60 text-white font-semibold"; // แถว active
  const inactive =
    "text-slate-300 hover:text-white hover:bg-slate-900/40"; // แถว inactive

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`${base} ${isActive ? active : inactive} ${className}`}
    >
      {children}
    </Link>
  );
}
