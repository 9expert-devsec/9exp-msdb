import dbConnect from "@/lib/mongoose";
import "@/models/Program"; // ensure register
import "@/models/Skill";
import PublicCourse from "@/models/PublicCourse";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const program = searchParams.get("program"); // ObjectId
  const skill = searchParams.get("skill"); // ObjectId

  const query = {};
  if (q && q.trim()) {
    try {
      query.$text = { $search: q };
    } catch {
      const rx = new RegExp(q, "i");
      query.$or = [{ course_name: rx }, { course_teaser: rx }];
    }
  }
  if (program && Types.ObjectId.isValid(program)) query.program = program;
  if (skill && Types.ObjectId.isValid(skill)) query.skills = { $in: [skill] };

  const items = await PublicCourse.find(query)
    .populate({
      path: "program",
      select: "program_name programiconurl programcolor", // <- เพิ่มตรงนี้
    })
    .populate({ path: "skills", select: "skill_name" })
    .sort({ course_name: 1 })
    .lean();

  return new Response(JSON.stringify({ items }), { status: 200 });
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
