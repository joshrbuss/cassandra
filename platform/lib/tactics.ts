export const TACTICS = [
  "fork",
  "pin",
  "skewer",
  "discoveredAttack",
  "backRankMate",
  "mateIn1",
  "mateIn2",
  "mateIn3",
  "endgame",
  "opening",
  "sacrifice",
  "deflection",
  "zwischenzug",
  "brilliant",
] as const;

export type Tactic = (typeof TACTICS)[number];

/** Maps our tactic keys to Lichess theme tag strings */
export const LICHESS_THEME_MAP: Record<Tactic, string> = {
  fork: "fork",
  pin: "pin",
  skewer: "skewer",
  discoveredAttack: "discoveredAttack",
  backRankMate: "backRankMate",
  mateIn1: "mateIn1",
  mateIn2: "mateIn2",
  mateIn3: "mateIn3",
  endgame: "endgame",
  opening: "opening",
  sacrifice: "sacrifice",
  deflection: "deflection",
  zwischenzug: "zwischenzug",
  brilliant: "sacrifice",
};

export const TACTIC_LABELS: Record<Tactic, string> = {
  fork: "Fork",
  pin: "Pin",
  skewer: "Skewer",
  discoveredAttack: "Discovered Attack",
  backRankMate: "Back Rank Mate",
  mateIn1: "Mate in 1",
  mateIn2: "Mate in 2",
  mateIn3: "Mate in 3",
  endgame: "Endgame",
  opening: "Opening",
  sacrifice: "Sacrifice",
  deflection: "Deflection",
  zwischenzug: "Zwischenzug",
  brilliant: "Brilliant",
};

/** Extract the primary tactic type from a puzzle's space-separated themes string */
export function primaryTactic(themes: string): Tactic | null {
  const tags = themes.trim().split(/\s+/);
  for (const tag of tags) {
    if (TACTICS.includes(tag as Tactic)) {
      return tag as Tactic;
    }
  }
  return null;
}

/** Parse a comma-separated tactics query param into a validated Tactic array */
export function parseTactics(raw: string | null): Tactic[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t): t is Tactic => TACTICS.includes(t as Tactic));
}
