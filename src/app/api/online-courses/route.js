import dbConnect from "@/lib/mongoose";
import "@/models/Program";
import "@/models/Skill";
import OnlineCourse from "@/models/OnlineCourse";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q"),
    program = searchParams.get("program"),
    skill = searchParams.get("skill");
  const query = {};
  if (q && q.trim()) {
    try {
      query.$text = { $search: q };
    } catch {
      const rx = new RegExp(q, "i");
      query.$or = [{ o_course_name: rx }, { o_course_teaser: rx }];
    }
  }
  if (program && Types.ObjectId.isValid(program)) query.program = program;
  if (skill && Types.ObjectId.isValid(skill)) query.skills = { $in: [skill] };

  const items = await OnlineCourse.find(query)
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
  const created = await OnlineCourse.create(body);
  const item = await OnlineCourse.findById(created._id)
    .populate("program", "program_name programiconurl programcolor")
    .populate("skills", "skill_name");
  return new Response(JSON.stringify({ item }), { status: 201 });
}
