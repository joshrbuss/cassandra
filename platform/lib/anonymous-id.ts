/**
 * Generates a stable anonymous user ID stored in localStorage.
 * Used for attempt tracking before OAuth auth is added (Phase 7).
 */

const KEY = "cassandra_anon_id";

export function getAnonId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = "anon_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(KEY, id);
  }
  return id;
}

/** Derive a short display name from an anonymous ID, e.g. "Guest #4f2a" */
export function anonDisplayName(userId: string): string {
  const short = userId.replace("anon_", "").slice(0, 4);
  return `Guest #${short}`;
}
