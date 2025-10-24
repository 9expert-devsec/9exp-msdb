import dbConnect from "@/lib/mongoose";
import Event from "@/models/Event";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  await dbConnect();
  const item = await Event.findById(params.id).lean();
  return item ? Response.json(item) : new Response("Not found", { status: 404 });
}

export async function PUT(req, { params }) {
  await dbConnect();
  const data = await req.json();
  const updated = await Event.findByIdAndUpdate(params.id, data, { new: true });
  return updated ? Response.json(updated) : new Response("Not found", { status: 404 });
}

export async function DELETE(_req, { params }) {
  await dbConnect();
  await Event.findByIdAndDelete(params.id);
  return new Response(null, { status: 204 });
}
