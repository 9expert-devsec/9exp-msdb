import dbConnect from "@/lib/mongoose";
import Event from "@/models/Event";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  await dbConnect();
  const slug = params?.slug;
  if (!slug) return new Response("Bad request", { status: 400 });

  const item = await Event.findOne({ slug, published: true }).lean();
  if (!item) return new Response("Not found", { status: 404 });
  return Response.json(item);
}
