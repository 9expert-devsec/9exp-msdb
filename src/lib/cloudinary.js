import { v2 as cloudinary } from "cloudinary";

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.warn("[cloudinary] missing envs");
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

export default cloudinary;

/** อัปโหลดจากไฟล์ (Blob) ของ formData
 *  resourceType "auto" ให้ Cloudinary ตรวจชนิดเอง รองรับ SVG/PNG/JPG ได้ครบ
 *  (บางบัญชี reject SVG ถ้า hardcode "image")
 */
export async function uploadFromFormFile(
  file,
  { folder = "courses", resourceType = "auto" } = {}
) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}
