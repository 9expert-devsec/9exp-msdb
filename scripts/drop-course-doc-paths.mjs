// scripts/drop-course-doc-paths.mjs
// One-off: remove the deprecated `course_doc_paths` field from every PublicCourse
// document. Run with:  node scripts/drop-course-doc-paths.mjs
//
// Reads MONGODB_URI (and optional MONGODB_DBNAME) from the environment / .env.
import "dotenv/config";
import mongoose from "mongoose";

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DBNAME;
  if (!uri) {
    console.error("Missing MONGODB_URI in environment.");
    process.exit(1);
  }

  await mongoose.connect(uri, dbName ? { dbName } : {});
  console.log("Connected to MongoDB.");

  // Operate directly on the collection so we don't depend on the (now-removed)
  // field being present in the schema. PublicCourse -> "publiccourses".
  const coll = mongoose.connection.collection("publiccourses");

  const res = await coll.updateMany(
    {},
    { $unset: { course_doc_paths: "" } }
  );

  // Mongoose/driver versions expose either modifiedCount or nModified.
  const modified = res.modifiedCount ?? res.nModified ?? 0;
  console.log(`Unset course_doc_paths. modifiedCount = ${modified}`);

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch(async (err) => {
  console.error("drop-course-doc-paths failed:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
