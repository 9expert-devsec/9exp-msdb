// src/app/api/admin/upload/career-path-image/route.js
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function toOptimizedUrl(url) {
  // ทำให้โหลดไวขึ้น (q_auto,f_auto)
  // https://res.cloudinary.com/.../image/upload/... -> .../image/upload/q_auto,f_auto/...
  if (!url || typeof url !== "string") return "";
  return url.replace("/upload/", "/upload/q_auto,f_auto/");
}

function ensureCloudinaryConfig() {
  // รองรับทั้ง CLOUDINARY_URL หรือแยก 3 ตัวแปร
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({ secure: true });
    return;
  }
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      "Missing Cloudinary env. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET",
    );
  }

  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
}

async function uploadFileToCloudinary(file, { folder }) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        overwrite: false,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      },
    );

    stream.end(buffer);
  });
}

/* ---------------- POST (upload) ---------------- */
export async function POST(req) {
  try {
    ensureCloudinaryConfig();

    const form = await req.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") || "msdb/career-path").trim();

    if (!file) return jsonError("file is required", 400);
    if (typeof file === "string") return jsonError("invalid file", 400);

    // file is a Web File
    if (!file.type || !file.type.startsWith("image/")) {
      return jsonError("only image file is allowed", 400);
    }

    // กันไฟล์ใหญ่เกิน (ปรับได้)
    const maxBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxBytes) {
      return jsonError("file too large (max 10MB)", 413);
    }

    const result = await uploadFileToCloudinary(file, { folder });

    const url = result?.secure_url || result?.url || "";
    const publicId = result?.public_id || "";

    return NextResponse.json(
      {
        ok: true,
        url: toOptimizedUrl(url),
        rawUrl: url,
        publicId,
        width: result?.width,
        height: result?.height,
        bytes: result?.bytes,
        format: result?.format,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("POST /api/admin/upload/career-path-image error:", err);
    return jsonError(err?.message || "upload error", 500);
  }
}

/* ---------------- DELETE (destroy by publicId) ---------------- */
export async function DELETE(req) {
  try {
    ensureCloudinaryConfig();

    const body = await req.json().catch(() => ({}));
    const publicId = String(body?.publicId || "").trim();
    if (!publicId) return jsonError("publicId is required", 400);

    const res = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });

    return NextResponse.json({ ok: true, result: res }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/admin/upload/career-path-image error:", err);
    return jsonError(err?.message || "delete error", 500);
  }
}
