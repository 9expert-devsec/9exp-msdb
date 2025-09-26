import dbConnect from "@/lib/mongoose";
import "@/models/Program"; // ensure register
import "@/models/Skill";
import PublicCourse from "@/models/PublicCourse";
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
      { course_name: { $regex: q, $options: "i" } },
      { course_teaser: { $regex: q, $options: "i" } },
      { course_id: { $regex: q, $options: "i" } },
    ];
  }
  if (program) where.program = program;
  if (skill) where.skills = skill;

  const items = await PublicCourse.find(where)
    .populate("program")
    .populate("skills")
    .sort({ sort_order: 1, createdAt: -1 }) // 👈 เรียงตามลำดับที่ตั้งเอง
    .lean();

  return Response.json({ items });
}

export async function POST(req) {
  await dbConnect();
  const body = await req.json();
  const created = await PublicCourse.create(body);
  const item = await PublicCourse.findById(created._id)
    .populate("program", "program_name programiconurl programcolor")
    .populate("skills", "skill_name");
  return new Response(JSON.stringify({ item }), { status: 201 });
}
