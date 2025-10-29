// /src/app/event/page.jsx
import Link from "next/link";
import Image from "next/image";
import { absoluteUrl } from "@/lib/abs-url";

// ✅ เปิด ISR (แคชฝั่งเซิร์ฟ/edge) 5 นาที
export const revalidate = 300;

async function getPublishedEvents() {
  // ถ้า API ยังไม่รองรับพารามิเตอร์ select/limit เอาออกได้
  const url = absoluteUrl(
    "/api/admin/events?published=1&select=title,slug,start_date,location,banner_url,description&limit=24"
  );

  const r = await fetch(url, { next: { revalidate } });
  const all = r.ok ? await r.json() : [];
  return all.filter((e) => e.published);
}

export default async function EventList() {
  const events = await getPublishedEvents();

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-bold mb-6">Events</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((ev, i) => {
          const dt = ev.start_date ? new Date(ev.start_date) : null;
          const month = dt
            ? new Intl.DateTimeFormat("en-US", { month: "short" })
                .format(dt)
                .toUpperCase()
            : "—";
          const day = dt ? dt.getDate() : "--";

          return (
            <Link
              key={ev._id || ev.slug}
              href={`/event/${ev.slug}`}
              prefetch={false} // ✅ ลด prefetch หน้ารายละเอียด
              className="rounded-3xl overflow-hidden border border-black/10 bg-white text-slate-900 shadow-sm hover:shadow-md transition"
            >
              <div className="p-4 grid grid-cols-[64px_1fr] gap-3 items-center">
                <div className="text-center">
                  <div className="text-sm tracking-widest">{month}</div>
                  <div className="text-2xl font-bold leading-none">{day}</div>
                </div>
                <div className="text-sm opacity-70">📍 {ev.location || "TBA"}</div>
              </div>

              {ev.banner_url ? (
                <div className="relative w-full h-44">
                  {/* ✅ ใช้ next/image ให้แคช/บีบอัด/โหลดทีละ viewport */}
                  <Image
                    src={ev.banner_url}
                    alt={ev.title || "Event banner"}
                    fill
                    // ขนาด responsive ให้เบราว์เซอร์โหลดเท่าที่จำเป็น
                    sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                    className="object-cover"
                    // ให้การ์ดแรกที่อยู่เหนือพับมี priority เป็น LCP ที่ดีขึ้น
                    priority={i === 0}
                  />
                </div>
              ) : (
                <div className="w-full h-44 bg-slate-200" />
              )}

              <div className="p-5">
                <div className="text-lg font-semibold">{ev.title}</div>
                <div className="text-sm opacity-70 line-clamp-2">
                  {ev.description}
                </div>
                <div className="mt-3 text-sm">Starts from free</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
