/**
 * Fire a custom GA4 event via window.gtag (if loaded).
 * Safe to call even if gtag hasn't been loaded yet — silently no-ops.
 */
export function gtagEvent(name: string, params?: Record<string, string | number | boolean>) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
}
