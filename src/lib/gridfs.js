// src/lib/gridfs.js
// Store/serve binary files INSIDE the MSDB MongoDB database using GridFS.
// Mongoose 8 bundles the mongodb driver, so GridFSBucket needs no new dependency.
import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";

const BUCKET_NAME = "course_outlines";

/** คืน GridFSBucket บน connection ที่ active อยู่ (เชื่อม DB ก่อนเสมอ) */
export async function getBucket() {
  await dbConnect();
  const db = mongoose.connection?.db;
  if (!db) throw new Error("MongoDB connection is not ready");
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
}

/** แปลง string -> ObjectId แบบปลอดภัย (คืน null ถ้าไม่ถูกต้อง) */
export function toObjectId(id) {
  try {
    if (id instanceof mongoose.Types.ObjectId) return id;
    const s = String(id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(s)) return null;
    return new mongoose.Types.ObjectId(s);
  } catch {
    return null;
  }
}

/** อัปโหลด buffer เข้า GridFS -> { fileId, length } */
export async function uploadBuffer({ buffer, filename, contentType }) {
  if (!buffer || !buffer.length) throw new Error("Empty file buffer");
  const bucket = await getBucket();

  return await new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename || "outline", {
      contentType: contentType || "application/octet-stream",
    });
    uploadStream.on("error", reject);
    uploadStream.on("finish", () => {
      resolve({ fileId: uploadStream.id, length: uploadStream.length });
    });
    uploadStream.end(buffer);
  });
}

/** หา metadata ของไฟล์ (คืน null ถ้าไม่พบ / id ไม่ถูกต้อง) */
export async function findFile(fileId) {
  const _id = toObjectId(fileId);
  if (!_id) return null;
  try {
    const bucket = await getBucket();
    const files = await bucket.find({ _id }).limit(1).toArray();
    return files?.[0] || null;
  } catch {
    return null;
  }
}

/** คืน readable stream ของไฟล์ (throws ถ้า id ไม่ถูกต้อง) */
export async function openDownloadStream(fileId) {
  const _id = toObjectId(fileId);
  if (!_id) throw new Error("Invalid file id");
  const bucket = await getBucket();
  return bucket.openDownloadStream(_id);
}

/** ลบไฟล์ + chunks (เงียบ ๆ ถ้า id ไม่ถูกต้อง / ไม่พบ) */
export async function deleteFile(fileId) {
  const _id = toObjectId(fileId);
  if (!_id) return false;
  try {
    const bucket = await getBucket();
    await bucket.delete(_id);
    return true;
  } catch {
    return false;
  }
}
