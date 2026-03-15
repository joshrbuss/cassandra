/**
 * Derives a one-line threat explanation from Lichess theme tags.
 * Used in the opponent prediction post-solve feedback.
 */
const THEME_EXPLANATIONS: Record<string, string> = {
  backRankMate: "a back rank checkmate",
  pin: "a pin winning material",
  fork: "a fork winning material",
  deflection: "a deflection to remove your defender",
  zwischenzug: "an in-between move",
  skewer: "a skewer",
  discoveredAttack: "a discovered attack",
  mateIn1: "checkmate in one move",
  mateIn2: "checkmate in two moves",
  mateIn3: "checkmate in three moves",
  sacrifice: "a piece sacrifice for a decisive advantage",
  trappedPiece: "trapping your piece",
  hangingPiece: "winning a hanging piece",
  attraction: "an attraction tactic",
  interference: "an interference move",
  xRayAttack: "an X-ray attack",
};

export function buildThreatExplanation(themes: string): string {
  for (const theme of themes.split(" ")) {
    const desc = THEME_EXPLANATIONS[theme];
    if (desc) return `Your opponent was threatening ${desc}.`;
  }
  return "Your opponent had a strong tactical idea in this position.";
}
