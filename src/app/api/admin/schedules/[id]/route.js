import dbConnect from "@/lib/mongoose";
import "@/models/PublicCourse";
import Schedule from "@/models/Schedule"; // สมมติใช้ชื่อโมเดลนี้

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  await dbConnect();
  const item = await Schedule.findById(params.id)
    .populate({ path: "course", populate: { path: "program" } })
    .lean();
  if (!item) return new Response("Not found", { status: 404 });
  return Response.json({ item });
}

export async function PATCH(req, { params }) {
  await dbConnect();
  const body = await req.json();
  // อนุญาตเฉพาะช่องที่แก้ได้
  const payload = {};
  if (body.status) payload.status = body.status;
  if (body.type) payload.type = body.type;
  if (Array.isArray(body.dates)) payload.dates = body.dates;
  if (typeof body.signup_url === "string") payload.signup_url = body.signup_url || undefined;

  const item = await Schedule.findByIdAndUpdate(params.id, payload, {
    new: true,
    runValidators: true,
  });
  if (!item) return new Response("Not found", { status: 404 });
  return Response.json({ ok: true, item });
}

export async function DELETE(_req, { params }) {
  await dbConnect();
  const gone = await Schedule.findByIdAndDelete(params.id);
  if (!gone) return new Response("Not found", { status: 404 });
  return Response.json({ ok: true });
}
