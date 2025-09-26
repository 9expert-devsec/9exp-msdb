import dbConnect from "../../../../lib/mongoose";
import PublicCourse from "@/models/PublicCourse";
import { Types } from "mongoose";
import "@/models/Program"; 
import "@/models/Skill"; 

export const dynamic = "force-dynamic";

export async function GET(_, { params }) {
  await dbConnect();
  const { id } = params;
  if (!Types.ObjectId.isValid(id)) return new Response("Invalid id", { status: 400 });
  const item = await PublicCourse.findById(id)
    .populate("program", "program_id program_name")
    .populate("skills", "skill_id skill_name");
  if (!item) return new Response("Not found", { status: 404 });
  return new Response(JSON.stringify({ item }), { status: 200 });
}

export async function PATCH(req, { params }) {
  await dbConnect();
  const { id } = params;
  const payload = await req.json();
  const item = await PublicCourse.findByIdAndUpdate(id, payload, { new: true })
    .populate("program", "program_id program_name")
    .populate("skills", "skill_id skill_name");
  if (!item) return new Response("Not found", { status: 404 });
  return new Response(JSON.stringify({ item }), { status: 200 });
}

export async function DELETE(_, { params }) {
  await dbConnect();
  const { id } = params;
  await PublicCourse.findByIdAndDelete(id);
  return new Response(null, { status: 204 });
}
