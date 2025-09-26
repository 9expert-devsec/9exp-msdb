// src/components/NavLink.jsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({ href, children, exact=false, className="" }) {
  const pathname = usePathname();
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");

  const base = "block rounded-xl px-3 py-2 transition-colors ring-1";
  const active  = "bg-emerald-500/15 ring-emerald-400/30 text-emerald-200 hover:bg-emerald-500/20";
  const inactive= "bg-white/5 ring-white/10 text-slate-200 hover:bg-white/10";

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
