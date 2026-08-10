// src/lib/revalidateBreakScreen.js
// Fire-and-forget ping to the break-screen app's on-demand ISR revalidation
// endpoint, so the projector refreshes within seconds of a profile save instead
// of waiting out its 5-minute ISR cycle.
//
// CONTRACT: never throws, never blocks the caller's response. If the ping fails,
// times out, or the env is unset, the admin's save still returns success. Callers
// MUST NOT await this.

/**
 * Ping break-screen to revalidate the given course slug's page. Fire-and-forget.
 * @param {string} slug - kebab-case profile slug (the ?course=<slug> key).
 */
export function pingBreakScreenRevalidate(slug) {
  const base = process.env.BREAK_SCREEN_REVALIDATE_URL; // e.g. https://break.9expert.app/api/revalidate
  const secret = process.env.REVALIDATE_SECRET;
  if (!base || !secret || !slug) return; // silently skip if not configured

  // Do NOT await from the caller. Swallow all errors.
  (async () => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3000);
      await fetch(`${base}?path=/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "x-revalidate-token": secret },
        signal: ctrl.signal,
      }).catch(() => {});
      clearTimeout(t);
    } catch {
      /* fire-and-forget: ignore */
    }
  })();
}
