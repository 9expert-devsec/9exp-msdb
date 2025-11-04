import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import PublicCourse from "@/models/PublicCourse";

import "@/models/Program";
import "@/models/Skill";

const cleanArray = (a) =>
  Array.isArray(a) ? a.map((s) => String(s).trim()).filter(Boolean) : [];
const cleanTopics = (arr) =>
  Array.isArray(arr)
    ? arr.map((t) => ({
        title: String(t?.title || "").trim(),
        bullets: cleanArray(t?.bullets),
      }))
    : [];
const toInt = (v, d = 0) =>
  Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d;

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const program = searchParams.get("program");
    const skill = searchParams.get("skill");
    const limit = Math.min(
      Math.max(toInt(searchParams.get("limit"), 50), 1),
      200
    );
    const page = Math.max(toInt(searchParams.get("page"), 1), 1);

    const filter = {};
    if (program) filter.program = program;
    if (skill) filter.skills = skill;
    if (q) filter.$text = { $search: q };

    const total = await PublicCourse.countDocuments(filter);
    const items = await PublicCourse.find(filter)
      .populate("program")
      .populate("skills")
      .populate("previous_course")
      .sort({ sort_order: 1, course_name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({ ok: true, total, page, limit, items });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e.message || "Internal error" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await dbConnect();

    const payload = await req.json();

    payload.course_objectives = cleanArray(payload.course_objectives);
    payload.course_target_audience = cleanArray(payload.course_target_audience);
    payload.course_prerequisites = cleanArray(payload.course_prerequisites);
    payload.course_system_requirements = cleanArray(
      payload.course_system_requirements
    );
    payload.training_topics = cleanTopics(payload.training_topics);
    payload.course_doc_paths = cleanArray(payload.course_doc_paths);
    payload.course_lab_paths = cleanArray(payload.course_lab_paths);
    payload.course_case_study_paths = cleanArray(
      payload.course_case_study_paths
    );
    payload.website_urls = cleanArray(payload.website_urls);
    payload.exam_links = cleanArray(payload.exam_links);

    payload.course_trainingdays = toInt(payload.course_trainingdays, 0);
    payload.course_traininghours = toInt(payload.course_traininghours, 0);
    payload.course_price = toInt(payload.course_price, 0);
    payload.sort_order = toInt(payload.sort_order, 0);
    payload.course_netprice =
      payload.course_netprice === "" || payload.course_netprice == null
        ? null
        : toInt(payload.course_netprice, null);

    const created = await PublicCourse.create(payload);
    const item = await PublicCourse.findById(created._id)
      .populate("program")
      .populate("skills")
      .populate("previous_course")
      .lean();

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e.message || "Create failed" },
      { status: 400 }
    );
  }
}
