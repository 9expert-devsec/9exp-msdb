import dbConnect from "@/lib/mongoose";
import Program from "@/models/Program";
import PublicCourse from "@/models/PublicCourse";
import OnlineCourse from "@/models/OnlineCourse";

export const dynamic = "force-dynamic";

export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const withCounts = searchParams.get("withCounts");

  const items = await Program.find().sort({ program_name: 1 });

  if (withCounts) {
    const ids = items.map((p) => p._id);
    const [pubCounts, onCounts] = await Promise.all([
      PublicCourse.aggregate([
        { $match: { program: { $in: ids } } },
        { $group: { _id: "$program", n: { $sum: 1 } } },
      ]),
      OnlineCourse.aggregate([
        { $match: { program: { $in: ids } } },
        { $group: { _id: "$program", n: { $sum: 1 } } },
      ]),
    ]);
    const pubMap = Object.fromEntries(
      pubCounts.map((i) => [String(i._id), i.n])
    );
    const onMap = Object.fromEntries(onCounts.map((i) => [String(i._id), i.n]));
    const enriched = items.map((p) => ({
      ...p.toObject(),
      counts: {
        public: pubMap[String(p._id)] || 0,
        online: onMap[String(p._id)] || 0,
      },
    }));
    return new Response(JSON.stringify({ items: enriched }), { status: 200 });
  }

  return new Response(JSON.stringify({ items }), { status: 200 });
}

export async function POST(req) {
  await dbConnect();
  const body = await req.json();
  const created = await Program.create(body);
  return new Response(JSON.stringify({ item: created }), { status: 201 });
}
