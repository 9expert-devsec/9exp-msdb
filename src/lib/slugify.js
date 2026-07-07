// src/lib/slugify.js
// Best-effort kebab slug for the break-screen profile `?course=<slug>` key.
// Produces a url-safe string matching /^[a-z0-9-]+$/. Thai (and other non
// [a-z0-9]) characters are dropped, so a Thai-only label yields "" — the admin
// then types the slug manually (the form keeps it editable).
export function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-") // collapse runs of non-url-safe chars to "-"
    .replace(/^-+|-+$/g, "");    // trim leading/trailing dashes
}

// True if `s` is already a valid break-screen slug.
export function isValidSlug(s) {
  return /^[a-z0-9-]+$/.test(String(s || ""));
}

export default slugify;
