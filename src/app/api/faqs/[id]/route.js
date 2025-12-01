// src/app/api/faqs/[id]/route.js
import dbConnect from "@/lib/mongoose";
import FAQ from "@/models/Faq";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  await dbConnect();

  const id = params.id;
  const item = await FAQ.findOne({ _id: id, is_published: true }).lean();

  if (!item) {
    return new Response("Not found", { status: 404 });
  }

  return Response.json({ ok: true, item }, { status: 200 });
}
