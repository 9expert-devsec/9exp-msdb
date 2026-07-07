// src/app/(admin)/admin/break-screen/[id]/edit/page.jsx
// Edit an existing Break Screen profile — fetch it, then render the shared form.
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import BreakScreenFormClient from "../../_components/BreakScreenFormClient";

export default function EditBreakScreenProfilePage() {
  const { id } = useParams();
  const [initial, setInitial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/admin/break-screen/profiles/${id}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "โหลดไม่สำเร็จ");
        if (alive) setInitial(json.item);
      } catch (e) {
        if (alive) setError(e.message || "โหลดไม่สำเร็จ");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 max-w-5xl">
        <div className="h-10 w-64 rounded bg-[var(--surface-glass)] animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-2xl bg-[var(--surface-glass)] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-6 text-sm text-rose-400">
        {error}
      </div>
    );
  }

  return <BreakScreenFormClient initial={initial} />;
}
