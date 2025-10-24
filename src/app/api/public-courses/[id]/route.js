import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import PublicCourse from "@/models/PublicCourse";

const cleanArray = (a) =>
  Array.isArray(a) ? a.map((s) => String(s).trim()).filter(Boolean) : [];
const cleanTopics = (arr) =>
  Array.isArray(arr)
    ? arr.map((t) => ({
        title: String(t?.title || "").trim(),
        bullets: cleanArray(t?.bullets),
      }))
    : [];
const toInt = (v, d = 0) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);

async function getId(params) {
  const p = await params;
  return p?.id;
}

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const id = await getId(params);
    const item = await PublicCourse.findById(id)
      .populate("program")
      .populate("skills")
      .populate("previous_course")
      .lean();
    if (!item) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, item });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e.message || "Internal error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    await dbConnect();
    const id = await getId(params);
    const payload = await req.json();

    if ("course_objectives" in payload)
      payload.course_objectives = cleanArray(payload.course_objectives);
    if ("course_target_audience" in payload)
      payload.course_target_audience = cleanArray(payload.course_target_audience);
    if ("course_prerequisites" in payload)
      payload.course_prerequisites = cleanArray(payload.course_prerequisites);
    if ("course_system_requirements" in payload)
      payload.course_system_requirements = cleanArray(payload.course_system_requirements);
    if ("training_topics" in payload) payload.training_topics = cleanTopics(payload.training_topics);
    if ("course_doc_paths" in payload) payload.course_doc_paths = cleanArray(payload.course_doc_paths);
    if ("course_lab_paths" in payload) payload.course_lab_paths = cleanArray(payload.course_lab_paths);
    if ("course_case_study_paths" in payload)
      payload.course_case_study_paths = cleanArray(payload.course_case_study_paths);
    if ("website_urls" in payload) payload.website_urls = cleanArray(payload.website_urls);
    if ("exam_links" in payload) payload.exam_links = cleanArray(payload.exam_links);

    if ("course_trainingdays" in payload) payload.course_trainingdays = toInt(payload.course_trainingdays, 0);
    if ("course_traininghours" in payload) payload.course_traininghours = toInt(payload.course_traininghours, 0);
    if ("course_price" in payload) payload.course_price = toInt(payload.course_price, 0);
    if ("sort_order" in payload) payload.sort_order = toInt(payload.sort_order, 0);

    if ("course_netprice" in payload) {
      payload.course_netprice =
        payload.course_netprice === "" || payload.course_netprice == null
          ? null
          : toInt(payload.course_netprice, null);
    }

    const item = await PublicCourse.findByIdAndUpdate(id, payload, { new: true })
      .populate("program")
      .populate("skills")
      .populate("previous_course")
      .lean();

    if (!item) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, item });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e.message || "Update failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const id = await getId(params);
    const item = await PublicCourse.findByIdAndDelete(id).lean();
    if (!item) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, deleted: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e.message || "Delete failed" },
      { status: 400 }
    );
  }
}
