import dbConnect from "@/lib/mongoose";
import Program from "@/models/Program";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(_, { params }) {
  await dbConnect();
  const { id } = params;
  if (!Types.ObjectId.isValid(id)) return new Response("Invalid id", { status: 400 });
  const item = await Program.findById(id);
  if (!item) return new Response("Not found", { status: 404 });
  return new Response(JSON.stringify({ item }), { status: 200 });
}

export async function PATCH(req, { params }) {
  await dbConnect();
  const { id } = params;
  const payload = await req.json();
  const item = await Program.findByIdAndUpdate(id, payload, { new: true });
  if (!item) return new Response("Not found", { status: 404 });
  return new Response(JSON.stringify({ item }), { status: 200 });
}

export async function DELETE(_, { params }) {
  await dbConnect();
  const { id } = params;
  await Program.findByIdAndDelete(id);
  return new Response(null, { status: 204 });
}
