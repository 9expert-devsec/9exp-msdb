// src/app/api/admin/public-courses/outline/route.js
// Stores an English Course Outline file INSIDE MSDB (GridFS) and returns its
// metadata. It does NOT mutate any course — the form then PATCHes the course
// with a course_outline_en object of kind "file".
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/requireRole";
import { withRateLimit } from "@/lib/ratelimit";
import { uploadBuffer } from "@/lib/gridfs";

export const runtime = "nodejs"; // GridFS streams need Node APIs
export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
  "text/plain",
]);

export const POST = withRateLimit({ points: 20, duration: 60 })(async (req) => {
  try {
    await requireRole(req, ["admin", "editor"]);

    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { ok: false, error: "Missing file" },
        { status: 400 }
      );
    }

    const contentType = file.type || "application/octet-stream";
    if (!ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Unsupported file type. Allowed: PDF, DOC, DOCX, TXT.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Empty file" },
        { status: 400 }
      );
    }
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "File too large (max 20 MB)" },
        { status: 400 }
      );
    }

    const filename = file.name || "course-outline";
    const { fileId, length } = await uploadBuffer({
      buffer,
      filename,
      contentType,
    });

    return NextResponse.json(
      {
        ok: true,
        file_id: String(fileId),
        filename,
        content_type: contentType,
        size: length,
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Outline upload error:", e);
    const msg = e?.message || "Upload failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
});
