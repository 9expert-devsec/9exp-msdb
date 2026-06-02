// src/lib/publicUrl.js
// Build absolute, publicly-fetchable URLs for THIS MSDB deployment.
// External consumers (e.g. Genesis) live on a different origin and cannot use
// relative paths, so outline download links must be absolute.

let warnedOnce = false;

function getBase() {
  const raw = process.env.MSDB_PUBLIC_BASE_URL;
  if (!raw || !raw.trim()) {
    if (!warnedOnce) {
      warnedOnce = true;
      console.warn(
        "[publicUrl] MSDB_PUBLIC_BASE_URL is not set — falling back to relative URLs. " +
          "External consumers (Genesis) will not be able to resolve them."
      );
    }
    return "";
  }
  // strip any trailing slashes
  return raw.trim().replace(/\/+$/, "");
}

/**
 * Join MSDB_PUBLIC_BASE_URL + path into an absolute URL.
 * - Tolerates a path with or without a leading slash.
 * - If the env is missing, returns the (relative) path unchanged and warns once.
 * - If `path` is already absolute (http/https), returns it as-is.
 */
export function absoluteUrl(path) {
  const p = String(path || "");
  if (/^https?:\/\//i.test(p)) return p; // already absolute

  const base = getBase();
  const rel = p.startsWith("/") ? p : `/${p}`;
  if (!base) return rel; // fallback: relative
  return `${base}${rel}`;
}

export default absoluteUrl;
