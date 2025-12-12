// src/app/api/admin/schedules/[id]/route.js
import dbConnect from "@/lib/mongoose";
import "@/models/PublicCourse";
import Schedule from "@/models/Schedule";

export const dynamic = "force-dynamic";

/* ---------- helpers ---------- */
const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;

const normalizeToUtcMidnight = (input) => {
  if (!input) return null;

  // 1) date-only string: "YYYY-MM-DD"
  if (typeof input === "string") {
    const s = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return new Date(`${s}T00:00:00.000Z`);
    }
  }

  // 2) ISO string with time OR Date object
  const dt = input instanceof Date ? input : new Date(String(input));
  if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) return null;

  // 3) Convert moment -> Bangkok calendar day
  const bkk = new Date(dt.getTime() + BKK_OFFSET_MS);

  // 4) Store UTC midnight for that Bangkok day
  return new Date(
    Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), bkk.getUTCDate())
  );
};

const parseDates = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map(normalizeToUtcMidnight)
    .filter(Boolean)
    .sort((a, b) => a - b);

/* ---------- GET ---------- */
export async function GET(_req, { params }) {
  await dbConnect();

  const item = await Schedule.findById(params.id)
    .populate({ path: "course", populate: { path: "program" } })
    .lean();

  if (!item) return new Response("Not found", { status: 404 });
  return Response.json({ item });
}

/* ---------- PATCH ---------- */
export async function PATCH(req, { params }) {
  await dbConnect();

  const body = await req.json();

  // allow only editable fields
  const payload = {};

  if (body.status) payload.status = body.status;
  if (body.type) payload.type = body.type;

  // IMPORTANT: normalize dates on update too
  if (Array.isArray(body.dates)) {
    const normalized = parseDates(body.dates);
    if (normalized.length) payload.dates = normalized;
  }

  if (typeof body.signup_url === "string") {
    payload.signup_url = body.signup_url || undefined;
  }

  const item = await Schedule.findByIdAndUpdate(params.id, payload, {
    new: true,
    runValidators: true,
  }).populate({ path: "course", populate: { path: "program" } });

  if (!item) return new Response("Not found", { status: 404 });
  return Response.json({ ok: true, item });
}

/* ---------- DELETE ---------- */
export async function DELETE(_req, { params }) {
  await dbConnect();

  const gone = await Schedule.findByIdAndDelete(params.id);
  if (!gone) return new Response("Not found", { status: 404 });

  return Response.json({ ok: true });
}
