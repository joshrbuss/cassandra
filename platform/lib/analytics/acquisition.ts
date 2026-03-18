/**
 * Client-side UTM capture.
 *
 * Call once on page load (e.g. in a layout effect). Reads UTM params from the
 * current URL and POSTs them to /api/analytics/acquisition if any are present.
 */
export function captureAcquisition() {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const utm_source = params.get("utm_source");
  const utm_medium = params.get("utm_medium");
  const utm_campaign = params.get("utm_campaign");

  // Only fire if at least one UTM param is present
  if (!utm_source && !utm_medium && !utm_campaign) return;

  // Derive channel from medium or source
  const channel =
    utm_medium === "cpc"
      ? "paid"
      : utm_medium === "social"
        ? "social"
        : utm_medium === "email"
          ? "email"
          : utm_source === "referral"
            ? "referral"
            : utm_source ?? "direct";

  const sessionId = getOrCreateSessionId();

  fetch("/api/analytics/acquisition", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      channel,
      source: utm_source,
      medium: utm_medium,
      landingPage: window.location.pathname,
    }),
  }).catch(() => {});
}

/** Simple session ID persisted in sessionStorage for the browser tab lifetime. */
function getOrCreateSessionId(): string {
  const KEY = "cassandra_session_id";
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(KEY, id);
  }
  return id;
}
