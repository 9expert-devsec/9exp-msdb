// GET /api/skills
// POST /api/skills
import dbConnect from "@/lib/mongoose";
import Skill from "@/models/Skill";
import Program from "@/models/Program";
import PublicCourse from "@/models/PublicCourse";
import OnlineCourse from "@/models/OnlineCourse";

export const dynamic = "force-dynamic";

export async function GET(req) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const withPrograms = searchParams.get("withPrograms");

  const items = await Skill.find().sort({ skill_name: 1 }).lean();

  if (withPrograms) {
    // รวม program ใต้แต่ละ skill จากทั้ง public/online courses
    for (const s of items) {
      const pubProgIds = await PublicCourse.distinct("program", { skills: s._id });
      const onlProgIds = await OnlineCourse.distinct("program", { skills: s._id });
      const uniqIds = [...new Set([...pubProgIds, ...onlProgIds])].filter(Boolean);

      const programs = uniqIds.length
        ? await Program.find({ _id: { $in: uniqIds } })
            .select("_id program_name program_id programcolor")
            .lean()
        : [];

      s.programs = programs;
      s.programCount = programs.length;
    }
  }

  return Response.json({ items });
}

export async function POST(req) {
  await dbConnect();
  try {
    const payload = await req.json();

    // รับเฉพาะฟิลด์ของ skill
    const doc = {
      skill_id: payload.skill_id,
      skill_name: payload.skill_name,
      skilliconurl: payload.skilliconurl || "",
      skillcolor: payload.skillcolor || "#8b5cf6",
      skill_teaser: payload.skill_teaser || "",
      skill_roadmap_url: payload.skill_roadmap_url || "",
    };

    const item = await Skill.create(doc);
    return Response.json({ item }, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: err.message || "Failed to create skill" },
      { status: 400 }
    );
  }
}
