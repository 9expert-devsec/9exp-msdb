// src/app/api/admin/search-courses/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";

import PublicCourse from "@/models/PublicCourse";
import OnlineCourse from "@/models/OnlineCourse";
import Event from "@/models/Event";
import Instructor from "@/models/Instructor"; // ถ้าชื่อ model ต่าง แก้ชื่อนี้ให้ตรง

export const dynamic = "force-dynamic";

const toInt = (v, d = 10) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(Math.max(toInt(searchParams.get("limit"), 10), 1), 50);

    if (!q || q.length < 2) {
      return NextResponse.json({ ok: true, items: [] }, { status: 200 });
    }

    const re = new RegExp(q, "i");

    const perCollection = Math.max(Math.floor(limit / 3), 3);

    const [publicCourses, onlineCourses, events, instructors] = await Promise.all([
      PublicCourse.find({
        $or: [
          { course_name: re },
          { course_id: re },
          { course_teaser: re },
        ],
      })
        .select("course_name course_id program")
        .populate("program", "program_name")
        .limit(perCollection)
        .lean(),

      OnlineCourse.find({
        $or: [
          { o_course_name: re },
          { o_course_id: re },
          { o_course_teaser: re },
        ],
      })
        .select("o_course_name o_course_id program")
        .populate("program", "program_name")
        .limit(perCollection)
        .lean(),

      Event.find({
        $or: [{ title: re }, { slug: re }],
      })
        .select("title slug")
        .limit(perCollection)
        .lean(),

      Instructor.find({
        $or: [{ full_name: re }, { email: re }],
      })
        .select("full_name email")
        .limit(perCollection)
        .lean(),
    ]);

    const items = [
      ...publicCourses.map((c) => ({
        kind: "public",
        id: String(c._id),
        code: c.course_id,
        name: c.course_name,
        programName: c.program?.program_name || "",
        meta: [
          `ID: ${c.course_id}`,
          c.program?.program_name ? `Program: ${c.program.program_name}` : "",
        ]
          .filter(Boolean)
          .join(" • "),
      })),
      ...onlineCourses.map((c) => ({
        kind: "online",
        id: String(c._id),
        code: c.o_course_id,
        name: c.o_course_name,
        programName: c.program?.program_name || "",
        meta: [
          `ID: ${c.o_course_id}`,
          c.program?.program_name ? `Program: ${c.program.program_name}` : "",
        ]
          .filter(Boolean)
          .join(" • "),
      })),
      ...instructors.map((t) => ({
        kind: "instructor",
        id: String(t._id),
        code: t.email || "",
        name: t.full_name || "(No name)",
        meta: t.email ? `Email: ${t.email}` : "",
      })),
      ...events.map((e) => ({
        kind: "event",
        id: String(e._id),
        code: e.slug || "",
        name: e.title || "(No title)",
        meta: e.slug ? `Slug: ${e.slug}` : "",
      })),
    ].slice(0, limit);

    return NextResponse.json({ ok: true, items }, { status: 200 });
  } catch (e) {
    console.error("GET /api/admin/search-courses error:", e);
    return NextResponse.json(
      { ok: false, error: e.message || "Search failed" },
      { status: 500 }
    );
  }
}
