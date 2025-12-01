// src/app/api/admin/faqs/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Faq from "@/models/Faq";

import { requireRole } from "@/lib/requireRole";
import { withRateLimit } from "@/lib/ratelimit";
import { z } from "zod";

export const dynamic = "force-dynamic";

/* ------------ Zod schema ------------ */

const FaqInputSchema = z.object({
  category: z.string().trim().min(1),
  question: z.string().trim().min(1),

  answer_html: z.string().optional().default(""),
  answer_plain: z.string().optional().default(""),

  is_published: z.boolean().optional().default(true),
  order: z.number().optional().default(0),
});

/* ------------ helpers ------------ */

function normalizeBooleansAndOrder(json) {
  const bool = (v, d = false) => {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return v === "true" || v === "1";
    return d;
  };
  const num = (v, d = 0) => {
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      return Number.isNaN(n) ? d : n;
    }
    return d;
  };

  return {
    ...json,
    is_published: bool(json.is_published, true),
    order: num(json.order, 0),
  };
}

function mapInputToPayload(input) {
  return {
    category: input.category.trim(),
    question: input.question.trim(),

    answer_html: input.answer_html || "",
    answer_plain: input.answer_plain || "",

    is_published:
      typeof input.is_published === "boolean" ? input.is_published : true,
    order:
      typeof input.order === "number" && !Number.isNaN(input.order)
        ? input.order
        : 0,
  };
}

// ใช้ตัด HTML → plain text สำหรับ answer_plain
function htmlToPlain(html = "") {
  if (!html) return "";

  let s = String(html);

  // ตัด script/style ออก
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");

  // tag ที่เป็นการขึ้นบรรทัดใหม่
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/p>/gi, "\n\n");
  s = s.replace(/<\/h[1-6]>/gi, "\n\n");
  s = s.replace(/<\/li>/gi, "\n");
  s = s.replace(/<(ul|ol)>/gi, "\n");

  // ตัด tag HTML ออก
  s = s.replace(/<[^>]+>/g, "");

  // decode entity ที่ใช้บ่อย
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // ตัดช่องว่างส่วนเกิน / บรรทัดว่าง
  s = s
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  const MAX_LEN = 4000;
  if (s.length > MAX_LEN) {
    s = s.slice(0, MAX_LEN) + "…";
  }

  return s;
}

/* ------------ GET (list) ------------ */

export const GET = withRateLimit({ points: 60, duration: 60 })(
  async (req) => {
    try {
      await requireRole(req, ["admin", "editor", "viewer"]);
      await dbConnect();

      const { searchParams } = new URL(req.url);
      const q = (searchParams.get("q") || "").trim();
      const category = (searchParams.get("category") || "").trim();
      const published = (searchParams.get("published") || "").trim();

      const where = {};

      if (q) {
        const re = new RegExp(q, "i");
        where.$or = [
          { category: re },
          { question: re },
          { answer_plain: re },
        ];
      }

      if (category) {
        where.category = category;
      }

      if (published === "true") where.is_published = true;
      if (published === "false") where.is_published = false;

      const items = await Faq.find(where)
        .sort({ category: 1, order: 1, createdAt: 1 })
        .lean();

      return NextResponse.json({ ok: true, items }, { status: 200 });
    } catch (e) {
      if (e instanceof Response) return e;
      console.error("GET /api/admin/faqs error:", e);
      const msg = e?.message || "Fetch failed";
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }
  }
);

/* ------------ POST (create) ------------ */

export const POST = withRateLimit({ points: 20, duration: 60 })(
  async (req) => {
    try {
      await requireRole(req, ["admin", "editor"]);
      await dbConnect();

      const json = await req.json();
      const normalized = normalizeBooleansAndOrder(json);
      const input = FaqInputSchema.parse(normalized);
      const payload = mapInputToPayload(input);

      // auto answer_plain ถ้ายังว่างแต่มี HTML
      if (!payload.answer_plain && payload.answer_html) {
        payload.answer_plain = htmlToPlain(payload.answer_html).slice(0, 260);
      }

      const created = await Faq.create(payload);
      const item = created.toObject();

      return NextResponse.json({ ok: true, item }, { status: 201 });
    } catch (e) {
      if (e instanceof Response) return e;
      console.error("POST /api/admin/faqs error:", e);
      const msg = e?.errors?.[0]?.message || e?.message || "Create failed";
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }
  }
);

/* ------------ PATCH (update by _id ใน body) ------------ */

export const PATCH = withRateLimit({ points: 30, duration: 60 })(
  async (req) => {
    try {
      await requireRole(req, ["admin", "editor"]);
      await dbConnect();

      const json = await req.json();
      const id = String(json?._id || "").trim();
      if (!id) {
        return NextResponse.json(
          { ok: false, error: "_id is required" },
          { status: 400 }
        );
      }

      const normalized = normalizeBooleansAndOrder(json);
      const input = FaqInputSchema.parse(normalized);
      const payload = mapInputToPayload(input);

      if (!payload.answer_plain && payload.answer_html) {
        payload.answer_plain = htmlToPlain(payload.answer_html).slice(0, 260);
      }

      const updated = await Faq.findByIdAndUpdate(id, payload, {
        new: true,
      }).lean();

      if (!updated) {
        return NextResponse.json(
          { ok: false, error: "Not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ ok: true, item: updated }, { status: 200 });
    } catch (e) {
      if (e instanceof Response) return e;
      console.error("PATCH /api/admin/faqs error:", e);
      const msg = e?.errors?.[0]?.message || e?.message || "Update failed";
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }
  }
);

/* ------------ DELETE (id ผ่าน query) ------------ */

export const DELETE = withRateLimit({ points: 10, duration: 60 })(
  async (req) => {
    try {
      await requireRole(req, ["admin"]);
      await dbConnect();

      const { searchParams } = new URL(req.url);
      const id = String(searchParams.get("id") || "").trim();

      if (!id) {
        return NextResponse.json(
          { ok: false, error: "id is required" },
          { status: 400 }
        );
      }

      const removed = await Faq.findByIdAndDelete(id).lean();
      if (!removed) {
        return NextResponse.json(
          { ok: false, error: "Not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ ok: true, id }, { status: 200 });
    } catch (e) {
      if (e instanceof Response) return e;
      console.error("DELETE /api/admin/faqs error:", e);
      const msg = e?.message || "Delete failed";
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }
  }
);
