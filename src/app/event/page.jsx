// /src/app/event/page.jsx
import Link from "next/link";
import { absoluteUrl } from "@/lib/abs-url";
export const dynamic = "force-dynamic";

async function getPublishedEvents() {
  const r = await fetch(absoluteUrl("/api/admin/events"), { cache: "no-store" });
  const all = r.ok ? await r.json() : [];
  return all.filter((e) => e.published);
}

export default async function EventList() {
  const events = await getPublishedEvents();
  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-bold mb-6">Events</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((ev) => (
          <Link
            key={ev._id}
            href={`/event/${ev.slug}`}
            className="rounded-3xl overflow-hidden border border-black/10 bg-white text-slate-900 shadow-sm hover:shadow-md transition"
          >
            <div className="p-4 grid grid-cols-[64px_1fr] gap-3 items-center">
              <div className="text-center">
                <div className="text-sm tracking-widest">
                  {ev.start_date
                    ? new Date(ev.start_date).toLocaleString("en-US", { month: "short" }).toUpperCase()
                    : "—"}
                </div>
                <div className="text-2xl font-bold leading-none">
                  {ev.start_date ? new Date(ev.start_date).getDate() : "--"}
                </div>
              </div>
              <div className="text-sm opacity-70">📍 {ev.location || "TBA"}</div>
            </div>
            {ev.banner_url ? (
              <img src={ev.banner_url} alt={ev.title} className="w-full h-44 object-cover" />
            ) : (
              <div className="w-full h-44 bg-slate-200" />
            )}
            <div className="p-5">
              <div className="text-lg font-semibold">{ev.title}</div>
              <div className="text-sm opacity-70 line-clamp-2">{ev.description}</div>
              <div className="mt-3 text-sm">Starts from free</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
