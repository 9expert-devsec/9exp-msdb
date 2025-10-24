import dbConnect from "@/lib/mongoose";
import "@/models/Program";
import "@/models/Skill";
import OnlineCourse from "@/models/OnlineCourse";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const program = searchParams.get("program") || "";
  const skill = searchParams.get("skill") || "";

  const where = {};
  if (q) {
    where.$or = [
      { o_course_name: { $regex: q, $options: "i" } },
      { o_course_teaser: { $regex: q, $options: "i" } },
      { o_course_id: { $regex: q, $options: "i" } },
    ];
  }
  if (program) where.program = program;
  if (skill) where.skills = skill;

  const items = await OnlineCourse.find(where)
    .populate("program")
    .populate("skills")
    .sort({ sort_order: 1, createdAt: -1 })
    .lean();

  return Response.json({ items });
}

export async function POST(req) {
  await dbConnect();
  const body = await req.json();
  const created = await OnlineCourse.create(body);
  const item = await OnlineCourse.findById(created._id)
    .populate("program", "program_name programiconurl programcolor")
    .populate("skills", "skill_name");
  return new Response(JSON.stringify({ item }), { status: 201 });
}
