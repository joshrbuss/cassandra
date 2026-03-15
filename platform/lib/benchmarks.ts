/**
 * Time control benchmarks for contextual timer feedback.
 * Thresholds are in milliseconds.
 * Phase 3 spec: "For a Blitz player, this type of position should take ~10–15s"
 */

export type TimeControl = "bullet" | "blitz" | "rapid" | "classical";

export const TIME_CONTROLS: TimeControl[] = [
  "bullet",
  "blitz",
  "rapid",
  "classical",
];

export const TIME_CONTROL_LABELS: Record<TimeControl, string> = {
  bullet: "Bullet",
  blitz: "Blitz",
  rapid: "Rapid",
  classical: "Classical",
};

export interface Benchmark {
  targetMs: number;
  label: string; // human-readable, e.g. "under 8s"
}

/** Default thresholds per time control (spec §Phase 3) */
export const BENCHMARKS: Record<TimeControl, Benchmark> = {
  bullet: { targetMs: 8_000, label: "under 8s" },
  blitz: { targetMs: 20_000, label: "8–20s" },
  rapid: { targetMs: 45_000, label: "20–45s" },
  classical: { targetMs: 90_000, label: "under 90s" },
};

export type PercentileBucket = "top10" | "top25" | "average" | "below";

export const BUCKET_LABELS: Record<PercentileBucket, string> = {
  top10: "Top 10%",
  top25: "Top 25%",
  average: "Average",
  below: "Below Average",
};

export const BUCKET_COLORS: Record<PercentileBucket, string> = {
  top10: "text-cyan-600",
  top25: "text-green-600",
  average: "text-yellow-600",
  below: "text-gray-500",
};

export function percentileToBucket(percentile: number): PercentileBucket {
  if (percentile >= 90) return "top10";
  if (percentile >= 75) return "top25";
  if (percentile >= 25) return "average";
  return "below";
}

/** Format milliseconds as M:SS */
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, "0")}`
    : `${seconds}s`;
}
