import dbConnect from "@/lib/mongoose";
import Event from "@/models/Event";
import EventResponse from "@/models/EventResponse";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

/** แปลงคำตอบเป็นแถวๆ สำหรับ Excel ตามลำดับฟิลด์ใน event.form_fields */
function buildRows(event, responses) {
  const fields = event.form_fields || [];
  // header: วันที่, เวลา, อีเมล(ที่จับได้), แล้วตามด้วยทุก label
  const headers = [
    "Submitted Date",
    "Submitted Time",
    "Email (detected)",
    ...fields.map((f) => f.label),
  ];

  const rows = [headers];

  for (const r of responses) {
    const a = r.answers || {};

    // หา email จากคำตอบ (รองรับทั้ง type=email / key=email / label มีคำว่า email/อีเมล)
    const email =
      (event.email_field_key && a[event.email_field_key]) ||
      (fields.find((f) => f.type === "email" && a[f.key])?.key && a[fields.find((f) => f.type === "email" && a[f.key])?.key]) ||
      a["email"] ||
      (fields.find((f) => /email|อีเมล/i.test(String(f.label)))?.key &&
        a[fields.find((f) => /email|อีเมล/i.test(String(f.label)))?.key]) ||
      "";

    const submitted = new Date(r.createdAt || r.created_at || r._id.getTimestamp?.() || Date.now());
    const dateStr = submitted.toLocaleDateString("th-TH");
    const timeStr = submitted.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

    const cols = fields.map((f) => {
      // handle checkbox array
      if (f.type === "checkbox") {
        const selected = Array.isArray(a[f.key]) ? a[f.key] : [];
        const otherEnabled = !!a[`${f.key}__other_enabled`];
        const otherText = (a[`${f.key}__other`] || "").toString().trim();
        const all = [...selected];
        if (otherEnabled && otherText) all.push(`Other: ${otherText}`);
        return all.join("; ");
      }
      // radio + other
      if (f.type === "radio") {
        const val = a[f.key];
        if (val === "Other") {
          const other = (a[`${f.key}__other`] || "").toString().trim();
          return other ? `Other: ${other}` : "Other";
        }
        return val ?? "";
      }
      // select/short/long/email/phone
      return a[f.key] ?? "";
    });

    rows.push([dateStr, timeStr, email, ...cols]);
  }

  return rows;
}

/** GET /api/admin/events/:id/export?format=xlsx|csv  (default xlsx) */
export async function GET(req, { params }) {
  await dbConnect();

  const event = await Event.findById(params.id).lean();
  if (!event) return new Response("Event not found", { status: 404 });

  const responses = await EventResponse.find({ eventId: event._id })
    .sort({ createdAt: 1 })
    .lean();

  const rows = buildRows(event, responses);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Responses");

  const url = new URL(req.url);
  const format = (url.searchParams.get("format") || "xlsx").toLowerCase();

  const filenameBase = `event-${event.slug || event._id}-responses-${new Date()
    .toISOString()
    .slice(0, 10)}`;

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(ws);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
      },
    });
  }

  // default: xlsx
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
    },
  });
}
