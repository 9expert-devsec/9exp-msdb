// /src/app/event/page.jsx
import Link from "next/link";
import dbConnect from "@/lib/mongoose";
import Event from "@/models/Event";

export const dynamic = "force-dynamic";

/* ดึงเฉพาะ event ที่ published = true */
async function getPublishedEvents() {
  await dbConnect();

  const docs = await Event.find({ published: true })
    .sort({ start_date: 1 })
    .lean();

  // แปลง field ที่ Next serialize ไม่ได้ เช่น ObjectId / Date
  return docs.map((d) => ({
    ...d,
    _id: d._id.toString(),
    start_date: d.start_date?.toISOString?.() || null,
    createdAt: d.createdAt?.toISOString?.() || null,
    updatedAt: d.updatedAt?.toISOString?.() || null,
  }));
}

export default async function EventListPage() {
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
            {/* แถบวันที่ + สถานที่ (ปรับตามดีไซน์เดิมที่ใช้ใน local ได้เลย) */}
            <div className="flex">
              <div className="w-20 flex flex-col items-center justify-center text-xs font-semibold bg-slate-900 text-white">
                <div className="uppercase tracking-[0.2em]">
                  {ev.start_date
                    ? new Date(ev.start_date)
                        .toLocaleString("en-US", { month: "short" })
                        .toUpperCase()
                    : ""}
                </div>
                <div className="text-2xl">
                  {ev.start_date ? new Date(ev.start_date).getDate() : ""}
                </div>
              </div>
              <div className="flex-1 flex items-center px-3 text-[13px] text-slate-600 gap-1">
                <span>📍</span>
                <span>{ev.location || "-"}</span>
              </div>
            </div>

            {ev.banner_url && (
              <img
                src={ev.banner_url}
                alt={ev.title}
                className="w-full h-40 object-cover"
              />
            )}

            <div className="p-4 space-y-1">
              <div className="font-semibold line-clamp-2">{ev.title}</div>
              <div className="text-sm text-slate-600 line-clamp-3">
                {ev.description}
              </div>
              <div className="pt-2 text-sm font-semibold text-sky-600">
                Starts from free
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
