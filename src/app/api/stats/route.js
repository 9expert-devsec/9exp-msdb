// src/app/api/stats/route.js
import dbConnect from "@/lib/mongoose";
import Program from "@/models/Program";
import Skill from "@/models/Skill";
import PublicCourse from "@/models/PublicCourse";
import OnlineCourse from "@/models/OnlineCourse";

export const dynamic = "force-dynamic";

export async function GET() {
  await dbConnect();

  // totals
  const [publicTotal, onlineTotal, programs, skillsTotal] = await Promise.all([
    PublicCourse.countDocuments({}),
    OnlineCourse.countDocuments({}),
    Program.find({})
      .select("_id program_name programiconurl programcolor")
      .lean(),
    Skill.countDocuments({}),
  ]);

  // aggregate by program
  const [pubAgg, onlAgg] = await Promise.all([
    PublicCourse.aggregate([{ $group: { _id: "$program", count: { $sum: 1 } } }]),
    OnlineCourse.aggregate([{ $group: { _id: "$program", count: { $sum: 1 } } }]),
  ]);

  const pubMap = Object.fromEntries(pubAgg.map((x) => [String(x._id), x.count]));
  const onlMap = Object.fromEntries(onlAgg.map((x) => [String(x._id), x.count]));

  const byProgram = programs.map((p) => {
    const id = String(p._id);
    const publicCount = pubMap[id] || 0;
    const onlineCount = onlMap[id] || 0;
    return {
      _id: p._id,
      program_name: p.program_name,
      programiconurl: p.programiconurl || "",
      programcolor: p.programcolor || "#64748b",
      publicCount,
      onlineCount,
      total: publicCount + onlineCount,
    };
  }).sort((a,b) => b.total - a.total);

  return Response.json({
    totals: {
      publicCourses: publicTotal,
      onlineCourses: onlineTotal,
      programs: programs.length,
      skills: skillsTotal,
      allCourses: publicTotal + onlineTotal,
    },
    byProgram,
  });
}
