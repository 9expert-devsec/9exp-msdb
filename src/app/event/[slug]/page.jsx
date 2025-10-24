import FormClient from "./_FormClient";
import { absoluteUrl } from "@/lib/abs-url";

export const dynamic = "force-dynamic";

async function getEvent(slug) {
  const r = await fetch(absoluteUrl(`/api/events/${slug}`), { cache: "no-store" });
  return r.ok ? r.json() : null;
}

export default async function EventForm({ params }) {
  const slug = (await params).slug;
  const event = await getEvent(slug);

  if (!event) return <div className="p-6">Event not found</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {event.banner_url && (
        <img
          src={event.banner_url}
          className="w-full rounded-2xl object-cover"
          alt={event.title}
        />
      )}

      <div>
        <h1 className="text-3xl font-bold">{event.title}</h1>
        {event.description && (
          <p className="opacity-80 mt-2 whitespace-pre-wrap">{event.description}</p>
        )}
      </div>

      <FormClient event={event} />
    </div>
  );
}