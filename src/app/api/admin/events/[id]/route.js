import dbConnect from "@/lib/mongoose";
import Event from "@/models/Event";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  const { id } = await params;
  await dbConnect();
  const item = await Event.findById(id).lean();
  return item ? Response.json(item) : new Response("Not found", { status: 404 });
}

export async function PUT(req, { params }) {
  const { id } = await params;
  await dbConnect();
  const data = await req.json();
  const updated = await Event.findByIdAndUpdate(id, data, { new: true });
  return updated ? Response.json(updated) : new Response("Not found", { status: 404 });
}

export async function DELETE(_req, { params }) {
  const { id } = await params;
  await dbConnect();
  await Event.findByIdAndDelete(id);
  return new Response(null, { status: 204 });
}
