"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton({ className = "", children }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const base =
    "block rounded-xl px-2 py-2 transition-colors ring-1 text-left w-full";
  const style = "bg-white/5 ring-white/10 text-slate-200 hover:bg-white/10";
  const disabled = "opacity-60 cursor-not-allowed";

  async function onLogout() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={loading}
      className={`${base} ${style} ${loading ? disabled : ""} ${className}`}
    >
      {/* ถ้ามี children ให้ใช้ children, ถ้าไม่มี ให้ใช้ข้อความเดิม */}
      {loading
        ? "Logging out..."
        : children || "Log out"}
    </button>
  );
}
