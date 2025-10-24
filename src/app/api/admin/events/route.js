import dbConnect from "@/lib/mongoose";
import Event from "@/models/Event";

export const dynamic = "force-dynamic";

export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (slug) {
    const one = await Event.findOne({ slug }).lean();
    return one ? Response.json(one) : new Response("Not found", { status: 404 });
  }
  const items = await Event.find().sort({ createdAt: -1 }).lean();
  return Response.json(items);
}

export async function POST(req) {
  await dbConnect();
  const body = await req.json();
  const base = (body.title || "event")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const slug = base || `event-${Date.now()}`;
  const doc = await Event.create({ ...body, slug });
  return Response.json(doc, { status: 201 });
}
