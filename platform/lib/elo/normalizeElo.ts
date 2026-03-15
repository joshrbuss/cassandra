/**
 * Chess.com ratings are inflated vs Lichess by roughly 100–150 points.
 * We normalize everything to Lichess scale for internal puzzle matching.
 *
 * Always store both: rawElo (shown to user) and normalizedElo (used internally).
 * Store eloPlatform so you know which scale the raw number came from.
 */
export function normalizeElo(
  elo: number,
  platform: "chess_com" | "lichess"
): number {
  if (platform === "lichess") return elo;
  // Approximate Chess.com → Lichess conversion
  // Based on community cross-platform data — adjust if empirically off
  return Math.max(400, Math.round(elo * 0.88 - 50));
}
