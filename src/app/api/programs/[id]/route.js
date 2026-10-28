import dbConnect from "@/lib/mongoose";
import Program from "@/models/Program";
import { Types } from "mongoose";
import { requireRole } from "@/lib/requireRole";

export const dynamic = "force-dynamic";

export async function GET(_, { params }) {
  const { id } = await params;
  await dbConnect();
  if (!Types.ObjectId.isValid(id)) return new Response("Invalid id", { status: 400 });
  const item = await Program.findById(id);
  if (!item) return new Response("Not found", { status: 404 });
  return new Response(JSON.stringify({ item }), { status: 200 });
}

export async function PATCH(req, { params }) {
  try {
    await requireRole(req, ["admin", "editor"]);
    const { id } = await params;
    await dbConnect();
    const payload = await req.json();
    const item = await Program.findByIdAndUpdate(id, payload, { new: true });
    if (!item) return new Response("Not found", { status: 404 });
    return new Response(JSON.stringify({ item }), { status: 200 });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

export async function DELETE(req, { params }) {
  try {
    await requireRole(req, ["admin"]);
    const { id } = await params;
    await dbConnect();
    await Program.findByIdAndDelete(id);
    return new Response(null, { status: 204 });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}
