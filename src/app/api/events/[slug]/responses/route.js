import dbConnect from "@/lib/mongoose";
import Event from "@/models/Event";
import EventResponse from "@/models/EventResponse";
import { ServerClient } from "postmark";

export const dynamic = "force-dynamic";

/* ===== helpers ===== */

// หาอีเมลผู้ใช้จากคำตอบ
function pickEmail(event, answers) {
  if (event?.email_field_key && answers?.[event.email_field_key]) {
    return String(answers[event.email_field_key]).trim();
  }
  const fields = event?.form_fields || [];
  let f = fields.find((x) => x.type === "email" && answers?.[x.key]);
  if (f) return String(answers[f.key]).trim();
  f = fields.find((x) => /email|อีเมล/i.test(String(x.label || "")) && answers?.[x.key]);
  if (f) return String(answers[f.key]).trim();
  return "";
}

// รวมอีเมลแอดมินจาก .env (รองรับหลายเมลคั่นด้วย , และตัวเก่า)
function getAdminEmails() {
  const list = [
    process.env.ADMIN_NOTIFY_EMAILS || "", // เช่น "a@x.com,b@y.com"
    process.env.ADMIN_NOTIFY_EMAIL || "",  // เดิม
  ]
    .join(",")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return Array.from(new Set(list)); // unique
}

/* ===== handler ===== */

export async function POST(req, ctx) {
  await dbConnect();
  const { slug } = await ctx.params;

  const event = await Event.findOne({ slug, published: true }).lean();
  if (!event) return new Response("Event not found", { status: 404 });

  const { answers = {} } = await req.json();

  // บันทึกคำตอบก่อน (แม้ส่งเมลพลาดก็ยังเก็บข้อมูล)
  const saved = await EventResponse.create({ eventId: event._id, answers });

  try {
    const client = new ServerClient(process.env.POSTMARK_API_TOKEN);
    const stream = process.env.POSTMARK_MESSAGE_STREAM || "outbound";
    const from = process.env.MAIL_FROM;

    const adminList = getAdminEmails();          // ['a@..','b@..']
    const adminBcc = adminList.length ? adminList.join(",") : undefined;

    const userEmail = pickEmail(event, answers);

    // ✅ ส่งให้ผู้ใช้ + BCC ทีมงาน (หลายคนได้)
    if (userEmail) {
      await client.sendEmail({
        From: from,
        To: userEmail,
        Bcc: adminBcc, // <<— หลายอีเมลคั่นด้วยคอมมา
        Subject: `ยืนยันการรับข้อมูล: ${event.title}`,
        HtmlBody: `
          <div
  style="
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
    background-color: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 10px;
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    overflow: hidden;
  "
>
  <div style="text-align: center; margin-bottom: 24px;">
    <img
      src="https://www.9experttraining.com/images/bar-template-gmail.png"
      alt="9Expert Training"
      width="100%"
    />
  </div>
  <div style="padding: 0 24px">
    <h3 style="color: #000; font-size: 20px">
      9Expert ขอขอบคุณที่ทุกคนเข้ามาร่วมงาน
    </h3>
    <p style="font-size: 18px; font-weight: 600">"${event.title}"</p>
    <p style="margin-top: 16px">
      โดยท่านสามารถ <b>Download ไฟล์นำเสนอ</b> ได้ที่:
    </p>
    <p>
      <a
        href="https://9exp.link/data-ai-day-2025"
        target="_blank"
        style="
              display: inline-block;
              padding: 12px 24px;
              background-color: #0a1f33;
              color: #ffffff;
              text-decoration: none;
              font-size: 16px;
              border-radius: 5px;
            "
        >Download File</a
      >
    </p>
  </div>

  <hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd" />
  <div style="padding: 0 24px">
<p>สนใจเรียนรู้เพิ่มทักษะด้าน <b>DATA | AI | Automation</b></p>
  <p>
    <a
      href="https://www.9experttraining.com"
      target="_blank"
      style="color: #2563eb"
      >9Expert Training</a
    >
  </p>
  </div>
  
</div>
`, TextBody: `9Expert ขอขอบคุณที่เข้าร่วมงาน
"${event.title}"\n\nดาวน์โหลดไฟล์ได้ที่:
https://9exp.link/data-ai-day-2025\n\nเรียนรู้เพิ่มเติมได้ที่:
https://www.9experttraining.com`,
        MessageStream: stream,
      });
    }

    // กรณีไม่มีอีเมลผู้ใช้ -> ส่งแจ้งเตือนถึงทีมงานทั้งหมด
    if (!userEmail && adminList.length) {
      await client.sendEmail({
        From: from,
        To: adminList.join(","), // ส่งฉบับเดียวถึงหลายคน
        Subject: `[แจ้งเตือน] มีผู้ตอบแบบฟอร์มใหม่: ${event.title}`,
        HtmlBody: `
          <div style="font-family:ui-monospace;background:#f6f6f6;padding:12px;border-radius:8px">
            <pre>${JSON.stringify(answers, null, 2)}</pre>
            <div>Response ID: ${String(saved._id)}</div>
          </div>
        `,
        TextBody: `New submission\n${JSON.stringify(answers, null, 2)}`,
        MessageStream: stream,
      });
    }
  } catch (e) {
    console.error("Postmark error:", e?.message || e);
  }

  return Response.json({ ok: true, id: saved._id });
}
