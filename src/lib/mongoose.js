import mongoose from "mongoose";

let cached = global._mongooseCache;
if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

export default async function dbConnect() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DBNAME;

  // ✅ เช็ค env ตอน "เรียกใช้" เท่านั้น (ไม่เช็คตอน import)
  if (!uri) {
    throw new Error("Missing MONGODB_URI in environment variables");
  }

  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const opts = dbName ? { dbName } : {};
    cached.promise = mongoose.connect(uri, opts).then((m) => m.connection);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
