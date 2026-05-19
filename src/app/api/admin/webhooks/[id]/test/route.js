// src/app/api/admin/webhooks/[id]/test/route.js
import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import dbConnect from "@/lib/mongoose";
import WebhookSubscription from "@/models/WebhookSubscription";
import { requireRole } from "@/lib/requireRole";

export const dynamic = "force-dynamic";

const TEST_TIMEOUT_MS = 5000;

export async function POST(req, { params }) {
  try {
    await requireRole(req, ["admin"]);
    await dbConnect();

    const { id } = await params;
    const sub = await WebhookSubscription.findById(id);
    if (!sub) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 }
      );
    }

    const eventName = "ping";
    const body = JSON.stringify({
      event: eventName,
      timestamp: new Date().toISOString(),
      data: { message: "Test webhook from MSDB", subscriber: sub.name },
    });

    const signature = createHmac("sha256", String(sub.secret || ""))
      .update(body)
      .digest("hex");

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TEST_TIMEOUT_MS);

    let statusCode = 0;
    let errMsg = "";
    let responseText = "";

    try {
      const res = await fetch(sub.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": `sha256=${signature}`,
          "X-Webhook-Event": eventName,
        },
        body,
        signal: ctrl.signal,
      });
      statusCode = res.status;
      try {
        responseText = (await res.text()).slice(0, 500);
      } catch {
        responseText = "";
      }
    } catch (e) {
      errMsg = e?.name === "AbortError" ? "timeout" : String(e?.message || e);
    } finally {
      clearTimeout(timer);
    }

    sub.last_triggered_at = new Date();
    sub.last_status_code = statusCode || null;
    sub.last_error = errMsg;
    await sub.save();

    return NextResponse.json(
      {
        ok: !errMsg && statusCode >= 200 && statusCode < 300,
        status: statusCode,
        error: errMsg || null,
        response_preview: responseText,
      },
      { status: 200 }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/admin/webhooks/[id]/test error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Test failed" },
      { status: 400 }
    );
  }
}
