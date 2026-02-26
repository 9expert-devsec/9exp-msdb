"use client";

import { useParams } from "next/navigation";
import CareerPathFormClient from "../../_components/CareerPathFormClient";

export const dynamic = "force-dynamic";

export default function CareerPathEditPage() {
  const { id } = useParams();
  if (!id) return <div className="p-6 text-white/70">Loading…</div>;
  return <CareerPathFormClient id={id} />;
}
