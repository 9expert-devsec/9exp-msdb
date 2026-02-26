// src/app/api/admin/career-path/[id]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import CareerPath from "@/models/CareerPath";
import PublicCourse from "@/models/PublicCourse";

export const dynamic = "force-dynamic";

/* ---- helpers (reuse minimal) ---- */
function clean(x) {
  return String(x ?? "").trim();
}

function clampInt(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, Math.floor(v)));
}

function pickStr(x) {
  return clean(x);
}

function pickArrLines(x) {
  if (Array.isArray(x)) return x.map((v) => clean(v)).filter(Boolean);
  if (typeof x === "string") return x.split("\n").map(clean).filter(Boolean);
  return [];
}

function normalizePrice(price) {
  const fullPrice = Number(price?.fullPrice || 0) || 0;
  const salePrice = Number(price?.salePrice || 0) || 0;

  let discountPct = Number(price?.discountPct || 0) || 0;
  if (!discountPct && fullPrice > 0 && salePrice > 0 && salePrice < fullPrice) {
    discountPct = Math.round(((fullPrice - salePrice) / fullPrice) * 100);
  }

  return {
    fullPrice,
    salePrice,
    discountPct: clampInt(discountPct, 0, 99),
    currency: clean(price?.currency) || "THB",
  };
}

function normalizeImages(x) {
  const obj = x && typeof x === "object" ? x : {};
  return {
    url: pickStr(obj.url),
    publicId: pickStr(obj.publicId),
    alt: pickStr(obj.alt),
  };
}

function normalizeLinks(x) {
  const obj = x && typeof x === "object" ? x : {};
  return {
    detailUrl: pickStr(obj.detailUrl),
    signupUrl: pickStr(obj.signupUrl),
    outlineUrl: pickStr(obj.outlineUrl),
  };
}

function normalizeDetail(x) {
  const obj = x && typeof x === "object" ? x : {};
  return {
    tagline: pickStr(obj.tagline),
    intro: pickStr(obj.intro),
    objectives: pickArrLines(obj.objectives),
    suitableFor: pickArrLines(obj.suitableFor),
    prerequisites: pickArrLines(obj.prerequisites),
    benefits: pickArrLines(obj.benefits),
    contentHtml: pickStr(obj.contentHtml),
  };
}

function normalizeCurriculumBlocks(curr) {
  const blocks = Array.isArray(curr) ? curr : [];

  return blocks
    .map((b, bi) => {
      const kind = clean(b?.kind) === "choice" ? "choice" : "fixed";
      const title = pickStr(b?.title);
      const description = pickStr(b?.description);

      const rawItems = Array.isArray(b?.items) ? b.items : [];
      const items = rawItems
        .map((it, ii) => {
          const kindIt = clean(it?.kind) || "public";
          const kindFinal =
            kindIt === "online" || kindIt === "external" ? kindIt : "public";

          return {
            kind: kindFinal,
            publicCourse: it?.publicCourse || null,
            onlineCourse: it?.onlineCourse || null,
            externalName: pickStr(it?.externalName),
            externalUrl: pickStr(it?.externalUrl),
            note: pickStr(it?.note),
            snap: it?.snap && typeof it.snap === "object" ? it.snap : {},
            sortOrder: Number(it?.sortOrder ?? ii) || ii,
          };
        })
        .filter((it) => {
          if (it.kind === "public") return !!it.publicCourse;
          if (it.kind === "online") return !!it.onlineCourse;
          if (it.kind === "external")
            return !!(it.externalName || it.externalUrl);
          return false;
        })
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      let chooseMin = clampInt(b?.chooseMin ?? 1, 0, 99);
      let chooseMax = clampInt(b?.chooseMax ?? 1, 0, 99);
      if (kind === "fixed") {
        chooseMin = 0;
        chooseMax = 0;
      } else {
        const len = items.length;
        chooseMin = Math.min(chooseMin || 1, len);
        chooseMax = Math.min(Math.max(chooseMax || chooseMin, chooseMin), len);
        if (!len) {
          chooseMin = 0;
          chooseMax = 0;
        }
      }

      return {
        kind,
        title,
        description,
        chooseMin,
        chooseMax,
        items,
        sortOrder: Number(b?.sortOrder ?? bi) || bi,
      };
    })
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

async function hydratePublicSnapshots(blocks) {
  const ids = new Set();
  for (const b of blocks) {
    for (const it of b.items || []) {
      if (it.kind === "public" && it.publicCourse)
        ids.add(String(it.publicCourse));
    }
  }

  const idArr = Array.from(ids);
  if (!idArr.length) return blocks;

  const courses = await PublicCourse.find({ _id: { $in: idArr } })
    .select(
      "course_id course_name course_teaser course_trainingdays course_traininghours course_price course_netprice course_cover_url website_urls",
    )
    .lean();

  const map = new Map(courses.map((c) => [String(c._id), c]));

  for (const b of blocks) {
    for (const it of b.items || []) {
      if (it.kind !== "public") continue;
      const c = map.get(String(it.publicCourse));
      if (!c) continue;

      it.snap = {
        code: c.course_id || "",
        name: c.course_name || "",
        teaser: c.course_teaser || "",
        days: Number(c.course_trainingdays || 0) || 0,
        hours: Number(c.course_traininghours || 0) || 0,
        price: Number(c.course_netprice ?? c.course_price ?? 0) || 0,
        imageUrl: c.course_cover_url || "",
        publicUrl: Array.isArray(c.website_urls) ? c.website_urls[0] || "" : "",
      };
    }
  }

  return blocks;
}

function computeStats(blocks) {
  let minCourse = 0,
    maxCourse = 0,
    minDays = 0,
    maxDays = 0,
    minHours = 0,
    maxHours = 0;

  for (const b of blocks) {
    const items = Array.isArray(b.items) ? b.items : [];
    if (b.kind === "fixed") {
      const courses = items.length;
      const days = items.reduce(
        (s, it) => s + (Number(it?.snap?.days || 0) || 0),
        0,
      );
      const hours = items.reduce(
        (s, it) => s + (Number(it?.snap?.hours || 0) || 0),
        0,
      );

      minCourse += courses;
      maxCourse += courses;
      minDays += days;
      maxDays += days;
      minHours += hours;
      maxHours += hours;
      continue;
    }

    const chooseMin = clampInt(b.chooseMin ?? 1, 0, items.length);
    const chooseMax = clampInt(b.chooseMax ?? chooseMin, 0, items.length);

    minCourse += chooseMin;
    maxCourse += chooseMax;

    const daysArr = items
      .map((it) => Number(it?.snap?.days || 0) || 0)
      .sort((a, b) => a - b);
    const hoursArr = items
      .map((it) => Number(it?.snap?.hours || 0) || 0)
      .sort((a, b) => a - b);

    const sumSmallest = (arr, k) => arr.slice(0, k).reduce((s, v) => s + v, 0);
    const sumLargest = (arr, k) => arr.slice(-k).reduce((s, v) => s + v, 0);

    minDays += sumSmallest(daysArr, chooseMin);
    maxDays += sumLargest(daysArr, chooseMax);
    minHours += sumSmallest(hoursArr, chooseMin);
    maxHours += sumLargest(hoursArr, chooseMax);
  }

  const courseCount = minCourse === maxCourse ? minCourse : maxCourse;
  const dayCount = minDays === maxDays ? minDays : maxDays;
  const hourCount = minHours === maxHours ? minHours : maxHours;

  return {
    courseCount,
    dayCount,
    hourCount,
    minCourseCount: minCourse,
    maxCourseCount: maxCourse,
    minDayCount: minDays,
    maxDayCount: maxDays,
  };
}

/* ---------------- GET ---------------- */
export async function GET(_req, ctx) {
  try {
    await dbConnect();
    const { id } = await ctx.params;

    const item = await CareerPath.findById(id).lean();
    if (!item)
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 },
      );

    return NextResponse.json({ ok: true, item }, { status: 200 });
  } catch (err) {
    console.error("GET /api/admin/career-path/[id] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message },
      { status: 500 },
    );
  }
}

/* ---------------- PATCH ---------------- */
export async function PATCH(req, ctx) {
  try {
    await dbConnect();
    const { id } = await ctx.params;

    const body = await req.json();

    const payload = {};
    if ("title" in body) payload.title = pickStr(body.title);
    if ("slug" in body) payload.slug = pickStr(body.slug);

    if ("status" in body)
      payload.status = clean(body.status) === "active" ? "active" : "offline";
    if ("isPinned" in body) payload.isPinned = !!body.isPinned;
    if ("sortOrder" in body)
      payload.sortOrder = Number(body.sortOrder || 0) || 0;

    if ("coverImage" in body)
      payload.coverImage = normalizeImages(body.coverImage);
    if ("roadmapImage" in body)
      payload.roadmapImage = normalizeImages(body.roadmapImage);

    if ("cardDetail" in body) payload.cardDetail = pickStr(body.cardDetail);
    if ("price" in body) payload.price = normalizePrice(body.price);
    if ("links" in body) payload.links = normalizeLinks(body.links);
    if ("detail" in body) payload.detail = normalizeDetail(body.detail);

    if ("curriculum" in body) {
      let blocks = normalizeCurriculumBlocks(body.curriculum);
      blocks = await hydratePublicSnapshots(blocks);
      payload.curriculum = blocks;
      payload.stats = computeStats(blocks);
    }

    const item = await CareerPath.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    }).lean();

    if (!item)
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 },
      );
    return NextResponse.json({ ok: true, item }, { status: 200 });
  } catch (err) {
    const msg = String(err?.message || "");
    const isDup = msg.includes("E11000") && msg.includes("slug");
    if (isDup) {
      return NextResponse.json(
        { ok: false, error: "slug already exists" },
        { status: 409 },
      );
    }
    console.error("PATCH /api/admin/career-path/[id] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message },
      { status: 500 },
    );
  }
}

/* ---------------- DELETE ---------------- */
export async function DELETE(_req, ctx) {
  try {
    await dbConnect();
    const { id } = await ctx.params;

    const gone = await CareerPath.findByIdAndDelete(id).lean();
    if (!gone)
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 },
      );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/admin/career-path/[id] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message },
      { status: 500 },
    );
  }
}
