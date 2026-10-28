// src/app/api/skills/[id]/route.js
import dbConnect from "@/lib/mongoose";
import Skill from "@/models/Skill";       
import "@/models/Program";                 
import { requireRole } from "@/lib/requireRole";
export const dynamic = "force-dynamic";

export async function GET(req, ctx) {
  await dbConnect();
  const { id } = await ctx.params;       
  const item = await Skill.findById(id);
  if (!item) return new Response("Not found", { status: 404 });
  return Response.json({ item });
}

export async function PATCH(req, ctx) {
  try {
    await requireRole(req, ["admin", "editor"]);
    await dbConnect();
    const { id } = await ctx.params;
    const payload = await req.json();
    const item = await Skill.findByIdAndUpdate(id, payload, { new: true });
    if (!item) return new Response("Not found", { status: 404 });
    return Response.json({ item });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

export async function DELETE(req, ctx) {
  try {
    await requireRole(req, ["admin"]);
    await dbConnect();
    const { id } = await ctx.params;
    await Skill.findByIdAndDelete(id);
    return new Response(null, { status: 204 });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}
