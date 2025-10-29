import { notFound } from "next/navigation";
import dbConnect from "@/lib/mongoose";
import Event from "@/models/Event";
import FormClient from "./_FormClient";

// ทำ metadata ให้ไดนามิกตามชื่ออีเวนต์
export async function generateMetadata({ params }) {
  await dbConnect();
  const slug = params.slug;
  const doc = await Event.findOne({ slug, published: true }).lean();

  if (!doc) {
    return {
      title: "กิจกรรมไม่พบ | 9Expert Training",
      description: "ไม่พบกิจกรรมที่คุณกำลังค้นหา",
    };
  }

  const title = `${doc.title} | 9Expert Training`;
  return {
    title,
    description: doc.description || `ลงทะเบียนเข้าร่วมกิจกรรม ${doc.title}`,
    openGraph: {
      title,
      description: doc.description || "",
      url: `https://9exp-sec.com/event/${slug}`,
      siteName: "EVENT",
      images: [
        {
          url: doc.banner_url || "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: doc.title,
        },
      ],
    },
  };
}

export default async function EventPage({ params }) {
  await dbConnect();
  const slug = params.slug;

  // ใช้ .lean() แล้ว “ลอก” ออกมาเป็น plain object + แปลง field ที่ไม่ serializable
  const doc = await Event.findOne({ slug, published: true }).lean();
  if (!doc) return notFound();

  const { _id, __v, createdAt, updatedAt, ...rest } = doc;
  const event = {
    id: String(_id),
    ...rest,
    // ให้เป็น string เพื่อ serializable ชัวร์
    start_date: doc.start_date ? new Date(doc.start_date).toISOString() : null,
  };

  return (
    <div className="max-w-3xl mx-auto text-white">
      {/* แสดงแบนเนอร์ (ใช้ <img> ธรรมดาเพื่อไม่ติด domain allowlist) */}
      {event.banner_url ? (
        <img
          src={event.banner_url}
          alt={event.title}
          className="w-full rounded-xl mb-4 object-cover"
        />
      ) : null}

      <h1 className="text-2xl font-bold mb-2">{event.title}</h1>
      {event.description ? (
        <p className="text-sm mb-6">{event.description}</p>
      ) : null}

      <FormClient event={event} />
    </div>
  );
}
