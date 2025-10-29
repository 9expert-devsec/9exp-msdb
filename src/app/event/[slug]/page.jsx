import { notFound } from "next/navigation";
import dbConnect from "@/lib/dbConnect";
import Event from "@/models/Event";
import FormClient from "./_FormClient";

export async function generateMetadata({ params }) {
  await dbConnect();
  const slug = params.slug;
  const event = await Event.findOne({ slug, published: true }).lean();

  if (!event) {
    return {
      title: "กิจกรรมไม่พบ | 9Expert Training",
      description: "ไม่พบกิจกรรมที่คุณกำลังค้นหาในขณะนี้",
    };
  }

  return {
    title: `${event.title} | 9Expert Training`,
    description: event.description
      ? event.description
      : `ลงทะเบียนเข้าร่วมกิจกรรม ${event.title} กับ 9Expert Training`,
    openGraph: {
      title: `${event.title} | 9Expert Training`,
      description: event.description ?? "",
      url: `https://9exp-sec.com/event/${slug}`,
      siteName: "9Expert Training",
      images: [
        {
          url: event.cover_url || "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: event.title,
        },
      ],
    },
  };
}

export default async function EventPage({ params }) {
  await dbConnect();
  const slug = params.slug;
  const event = await Event.findOne({ slug, published: true }).lean();

  if (!event) return notFound();

  return (
    <div className="max-w-3xl mx-auto text-white">
      <h1 className="text-2xl font-bold mb-2">{event.title}</h1>
      <p className="text-sm mb-6">{event.description}</p>
      <FormClient event={event} />
    </div>
  );
}
