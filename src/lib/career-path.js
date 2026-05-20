// src/lib/career-path.js
// Shared helpers for CareerPath write routes (POST/PUT).
// Whitelist + coerce only the fields Genesis is allowed to push, so callers
// can't accidentally overwrite computed fields (stats, timestamps, _id).

export function normalizeBody(body = {}) {
  return {
    ...(body.title !== undefined && { title: String(body.title).trim() }),
    ...(body.slug !== undefined && { slug: String(body.slug).trim() }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.isPinned !== undefined && { isPinned: Boolean(body.isPinned) }),
    ...(body.sortOrder !== undefined && {
      sortOrder: Number(body.sortOrder) || 0,
    }),
    ...(body.cardDetail !== undefined && {
      cardDetail: String(body.cardDetail),
    }),
    ...(body.coverImage !== undefined && { coverImage: body.coverImage }),
    ...(body.roadmapImage !== undefined && { roadmapImage: body.roadmapImage }),
    ...(body.price !== undefined && { price: body.price }),
    ...(body.links !== undefined && { links: body.links }),
    ...(body.detail !== undefined && { detail: body.detail }),
    ...(body.curriculum !== undefined && { curriculum: body.curriculum }),
  };
}
