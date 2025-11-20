// /src/app/(admin)/admin/events/page.jsx
import Link from "next/link";
import dbConnect from "@/lib/mongoose";
import Event from "@/models/Event";

export const dynamic = "force-dynamic";

async function getEvents() {
  await dbConnect();

  const docs = await Event.find().sort({ createdAt: -1 }).lean();

  // กัน next serialize error เรื่อง ObjectId / Date
  return docs.map((d) => ({
    ...d,
    _id: d._id.toString(),
    createdAt: d.createdAt?.toISOString?.() || null,
    updatedAt: d.updatedAt?.toISOString?.() || null,
  }));
}

export default async function AdminEventsPage() {
  const events = await getEvents();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Events</h1>
        <Link
          href="/admin/events/new"
          className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
        >
          + Create Event
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((ev) => (
          <div
            key={ev._id}
            className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
          >
            {ev.banner_url ? (
              <img
                src={ev.banner_url}
                alt={ev.title}
                className="w-full h-40 object-cover"
              />
            ) : (
              <div className="w-full h-40 bg-slate-800" />
            )}
            <div className="p-4 space-y-1">
              <div className="text-sm opacity-70">{ev.location || "—"}</div>
              <div className="font-semibold">{ev.title}</div>
              <div className="text-sm opacity-80 line-clamp-2">
                {ev.description}
              </div>
              <div className="pt-3 flex gap-3">
                <Link href={`/event/${ev.slug}`} className="text-sky-300 underline">
                  Open public form
                </Link>
                <Link
                  href={`/admin/events/${ev._id}/edit`}
                  className="text-indigo-300 underline"
                >
                  Edit
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
