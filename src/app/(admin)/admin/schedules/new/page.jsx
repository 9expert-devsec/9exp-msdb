// src/app/(admin)/admin/schedules/new/page.jsx
import { Suspense } from "react";
import NewScheduleClient from "./NewScheduleClient";

export const dynamic = "force-dynamic";

export default function NewSchedulePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading schedule form...</div>}>
      <NewScheduleClient />
    </Suspense>
  );
}
