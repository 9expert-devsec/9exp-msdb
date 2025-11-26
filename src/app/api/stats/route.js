// /src/app/api/stats/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";

import Program from "@/models/Program";
import PublicCourse from "@/models/PublicCourse";
import OnlineCourse from "@/models/OnlineCourse";
import Skill from "@/models/Skill";
import Instructor from "@/models/Instructor";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();

    // ---------- totals ----------
    const [publicCourses, onlineCourses, programs, skills] = await Promise.all([
      PublicCourse.countDocuments(),
      OnlineCourse.countDocuments(),
      Program.countDocuments(),
      Skill.countDocuments(),
    ]);

    const totals = {
      publicCourses,
      onlineCourses,
      programs,
      skills,
      allCourses: publicCourses + onlineCourses,
    };

    // ---------- courses by program ----------
    const byProgram = await Program.aggregate([
      {
        $lookup: {
          from: "publiccourses",
          localField: "_id",
          foreignField: "program",
          as: "publicCourses",
        },
      },
      {
        $lookup: {
          from: "onlinecourses",
          localField: "_id",
          foreignField: "program",
          as: "onlineCourses",
        },
      },
      {
        $addFields: {
          publicCount: { $size: "$publicCourses" },
          onlineCount: { $size: "$onlineCourses" },
        },
      },
      {
        $addFields: {
          total: { $add: ["$publicCount", "$onlineCount"] },
        },
      },
      {
        $project: {
          _id: 1,
          program_id: 1,
          program_name: 1,
          programcolor: 1,
          programiconurl: 1,
          publicCount: 1,
          onlineCount: 1,
          total: 1,
        },
      },
      { $sort: { total: -1, program_name: 1 } },
    ]);

    // ---------- instructors ----------
    const instructorsRaw = await Instructor.find(
      {},
      { name: 1, programs: 1 }
    ).lean();

    const totalInstructors = instructorsRaw.length;
    let totalProgramLinks = 0;
    let maxProgramsPerInstructor = 0;

    const enriched = instructorsRaw.map((ins) => {
      const programCount = Array.isArray(ins.programs)
        ? ins.programs.length
        : 0;
      totalProgramLinks += programCount;
      if (programCount > maxProgramsPerInstructor) {
        maxProgramsPerInstructor = programCount;
      }
      return {
        _id: String(ins._id),
        name: ins.name || "",
        programCount,
      };
    });

    const avgProgramsPerInstructor =
      totalInstructors > 0 ? totalProgramLinks / totalInstructors : 0;

    const topInstructors = enriched
      .sort((a, b) => b.programCount - a.programCount || a.name.localeCompare(b.name))
      .slice(0, 20);

    const instructorStats = {
      totalInstructors,
      avgProgramsPerInstructor,
      maxProgramsPerInstructor,
      topInstructors,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      ok: true,
      totals,
      byProgram,
      instructorStats,
    });
  } catch (e) {
    console.error("stats error", e);
    return NextResponse.json(
      { ok: false, error: e.message || "Stats failed" },
      { status: 500 }
    );
  }
}
