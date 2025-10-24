import { ServerClient } from "postmark";

export async function GET() {
  const token = process.env.POSTMARK_API_TOKEN;
  const from = process.env.MAIL_FROM;
  const stream = process.env.POSTMARK_MESSAGE_STREAM || "outbound";
  const admins = (process.env.ADMIN_NOTIFY_EMAILS || "").split(",").map(s => s.trim()).filter(Boolean);

  try {
    const client = new ServerClient(token);
    const res = await client.sendEmail({
      From: from,
      To: admins[0] || from,
      Subject: "Postmark debug from production",
      TextBody: `OK\nFrom=${from}\nStream=${stream}\nAdmins=${admins.join(",")}`,
      MessageStream: stream,
    });
    return Response.json({ ok: true, postmark: res, env: { from, stream, admins } });
  } catch (e) {
    return Response.json({ ok: false, error: String(e), env: { from, stream, admins, hasToken: !!token } }, { status: 500 });
  }
}
