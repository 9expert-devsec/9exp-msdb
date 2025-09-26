import dbConnect from "@/lib/mongoose";
import cloudinary, { uploadFromFormFile } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export async function POST(req) {
  await dbConnect(); // ไม่จำเป็นมาก แต่กัน cold start แล้วมาต่อ DB ที่ต้องใช้ต่อๆ ไป
  try {
    const form = await req.formData();
    const file = form.get("file");
    const folder = form.get("folder") || "courses";
    if (!file) return new Response("Missing file", { status: 400 });

    const result = await uploadFromFormFile(file, { folder });
    return new Response(JSON.stringify({
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width, height: result.height, format: result.format
    }), { status: 201 });
  } catch (e) {
    console.error("upload error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
