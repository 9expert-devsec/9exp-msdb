// src/app/api/public-courses/outline/[fileId]/route.js
// Streams an English Course Outline file back from MSDB (GridFS).
// Served inline (Content-Disposition: inline) with the correct Content-Type so
// the admin form's <iframe> can render PDFs. Same-origin only — we deliberately
// do NOT set any anti-framing header (no X-Frame-Options) on this route.
import { Readable } from "node:stream";
import { findFile, openDownloadStream } from "@/lib/gridfs";

export const runtime = "nodejs"; // GridFS streams need Node APIs
export const dynamic = "force-dynamic";

function sanitizeFilename(name = "") {
  // strip quotes / control chars that would break the header
  return String(name).replace(/["\r\n]/g, "").trim() || "course-outline";
}

// Public file route — anyone with the URL may fetch/embed it cross-origin
// (Genesis lives on a different origin). Keep these permissive.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range",
  "Access-Control-Max-Age": "600",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(_req, { params }) {
  try {
    const { fileId } = await params;

    const file = await findFile(fileId);
    if (!file) {
      return new Response(JSON.stringify({ ok: false, error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    const contentType = file.contentType || "application/octet-stream";
    const filename = sanitizeFilename(file.filename);

    const nodeStream = await openDownloadStream(fileId);
    // Surface read errors instead of hanging the response.
    nodeStream.on("error", (err) => {
      console.error("Outline stream error:", err);
    });

    const webStream = Readable.toWeb(nodeStream);

    const headers = new Headers(CORS);
    headers.set("Content-Type", contentType);
    headers.set(
      "Content-Disposition",
      `inline; filename="${filename}"`
    );
    if (Number.isFinite(file.length)) {
      headers.set("Content-Length", String(file.length));
    }
    // public file — allow shared caching so Genesis/CDN can cache it
    headers.set("Cache-Control", "public, max-age=300");

    return new Response(webStream, { status: 200, headers });
  } catch (e) {
    console.error("Outline GET error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || "Fetch failed" }),
      { status: 400, headers: { "Content-Type": "application/json", ...CORS } }
    );
  }
}
