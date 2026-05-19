// src/lib/webhook.js
import { createHmac } from "crypto";
import dbConnect from "@/lib/mongoose";
import WebhookSubscription from "@/models/WebhookSubscription";

const WEBHOOK_TIMEOUT_MS = 5000;

function eventMatches(pattern, eventName) {
  if (pattern === "*" || pattern === eventName) return true;
  if (pattern.endsWith(".*")) {
    const prefix = pattern.slice(0, -1); // "course."
    return eventName.startsWith(prefix);
  }
  return false;
}

function subscriberMatches(subscriber, eventName) {
  const events = Array.isArray(subscriber.events) ? subscriber.events : [];
  if (!events.length) return false;
  return events.some((p) => eventMatches(String(p || "").trim(), eventName));
}

async function sendOne(subscriber, eventName, body) {
  const signature = createHmac("sha256", String(subscriber.secret || ""))
    .update(body)
    .digest("hex");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), WEBHOOK_TIMEOUT_MS);

  let statusCode = 0;
  let errMsg = "";

  try {
    const res = await fetch(subscriber.url, {
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
  } catch (e) {
    errMsg = e?.name === "AbortError" ? "timeout" : String(e?.message || e);
  } finally {
    clearTimeout(timer);
  }

  try {
    await WebhookSubscription.updateOne(
      { _id: subscriber._id },
      {
        $set: {
          last_triggered_at: new Date(),
          last_status_code: statusCode || null,
          last_error: errMsg,
        },
      }
    );
  } catch (e) {
    console.error("[webhook] failed to update subscriber metadata:", e?.message || e);
  }

  if (errMsg) {
    console.error(`[webhook] ${eventName} -> ${subscriber.url} failed: ${errMsg}`);
  }
}

/**
 * Fire-and-forget dispatch: ส่ง webhook ไปยังทุก subscriber ที่ match event
 * - ผู้เรียก *ไม่ต้อง await* ใน main request flow
 * - error ทั้งหมดถูก swallow ภายใน function
 *
 * @param {string} eventName - เช่น "course.created", "schedule.updated"
 * @param {object} payload   - data ที่จะส่งใน "data" field
 * @returns {Promise<void>}
 */
export async function dispatchWebhook(eventName, payload) {
  try {
    await dbConnect();
    const subscribers = await WebhookSubscription.find({ is_active: true }).lean();

    const matched = subscribers.filter((s) => subscriberMatches(s, eventName));
    if (!matched.length) return;

    const body = JSON.stringify({
      event: eventName,
      timestamp: new Date().toISOString(),
      data: payload ?? null,
    });

    await Promise.all(matched.map((s) => sendOne(s, eventName, body)));
  } catch (e) {
    console.error(`[webhook] dispatch "${eventName}" error:`, e?.message || e);
  }
}
