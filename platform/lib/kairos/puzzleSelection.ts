import { readFileSync } from "fs";
import { join } from "path";
import type { KairosPuzzle, KairosCategory } from "./types";

// Read puzzle data at module load — this file is server-only
const puzzlePath = join(process.cwd(), "data", "cassandra_puzzle_queue_v4_final.json");
const puzzleData = JSON.parse(readFileSync(puzzlePath, "utf-8"));

// ─── Category mapping ────────────────────────────────────────────────────────

/** Map raw puzzle data into KairosCategory based on its fields */
function categorize(p: RawPuzzle): KairosCategory {
  if (p.puzzle_set === "markov_threat" || p.puzzle_set === "population_markov")
    return "markov_threat";
  if (p.is_defensive) return "defensive";
  if (!p.has_tactic) return "quiet";
  if (p.sequence_length === 1) return "single_tactic";
  if (p.sequence_length >= 2 && p.sequence_length <= 3) return "short_sequence";
  if (p.sequence_length >= 4) return "deep_sequence";
  return "mixed";
}

interface RawPuzzle {
  puzzle_id: string;
  puzzle_set: string;
  puzzle_type: string;
  fen: string;
  correct_response: string;
  correct_response_san: string;
  board_orientation?: string;
  josh_color?: string | null;
  has_tactic: boolean;
  sequence_length: number;
  is_defensive: boolean;
  tactic_subtype: string;
  tactic_piece: string;
  position_complexity_score: number;
  target_solve_time: number;
  framing: string;
  [key: string]: unknown;
}

// ─── Quota per category ──────────────────────────────────────────────────────
// Total = 20 puzzles
const QUOTA: Record<KairosCategory, number> = {
  quiet: 3,
  single_tactic: 3,
  short_sequence: 3,
  deep_sequence: 2,
  defensive: 3,
  markov_threat: 3,
  mixed: 3,
};

// ─── Seeded PRNG ─────────────────────────────────────────────────────────────
/** Simple seeded PRNG (mulberry32) for reproducible shuffles */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}

function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Main selection function ─────────────────────────────────────────────────

export function selectKairosPuzzles(sessionId: string): KairosPuzzle[] {
  const allPuzzles = (puzzleData as { puzzles: RawPuzzle[] }).puzzles;
  const rng = mulberry32(hashString(sessionId));

  // Group by category
  const byCategory = new Map<KairosCategory, RawPuzzle[]>();
  for (const p of allPuzzles) {
    const cat = categorize(p);
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(p);
  }

  // Select quota from each category (seeded shuffle, take N)
  const selected: { puzzle: RawPuzzle; category: KairosCategory }[] = [];
  for (const [cat, quota] of Object.entries(QUOTA) as [KairosCategory, number][]) {
    const pool = byCategory.get(cat) ?? [];
    const shuffled = seededShuffle(pool, rng);
    for (let i = 0; i < Math.min(quota, shuffled.length); i++) {
      selected.push({ puzzle: shuffled[i], category: cat });
    }
  }

  // If under 20, fill from mixed/remaining
  const remaining = allPuzzles.filter(
    (p) => !selected.some((s) => s.puzzle.puzzle_id === p.puzzle_id)
  );
  const shuffledRemaining = seededShuffle(remaining, rng);
  while (selected.length < 20 && shuffledRemaining.length > 0) {
    const p = shuffledRemaining.shift()!;
    selected.push({ puzzle: p, category: categorize(p) });
  }

  // Interleave: avoid consecutive same-category
  const interleaved = interleaveCategories(selected, rng);

  // Alternate board orientation roughly 10/10
  let whiteCount = 0;
  let blackCount = 0;
  return interleaved.map((item) => {
    let orientation: "white" | "black";
    if (item.puzzle.board_orientation === "white" || item.puzzle.board_orientation === "black") {
      orientation = item.puzzle.board_orientation;
    } else {
      // Assign to balance
      orientation = whiteCount <= blackCount ? "white" : "black";
    }
    if (orientation === "white") whiteCount++;
    else blackCount++;

    return {
      puzzle_id: item.puzzle.puzzle_id,
      fen: item.puzzle.fen,
      correct_response: item.puzzle.correct_response,
      correct_response_san: item.puzzle.correct_response_san,
      board_orientation: orientation,
      has_tactic: item.puzzle.has_tactic,
      sequence_length: item.puzzle.sequence_length,
      is_defensive: item.puzzle.is_defensive,
      tactic_subtype: item.puzzle.tactic_subtype,
      tactic_piece: item.puzzle.tactic_piece,
      position_complexity_score: item.puzzle.position_complexity_score,
      target_solve_time: item.puzzle.target_solve_time,
      framing: item.puzzle.framing,
      kairos_category: item.category,
    };
  });
}

/** Shuffle then re-order to avoid consecutive same-category puzzles */
function interleaveCategories(
  items: { puzzle: RawPuzzle; category: KairosCategory }[],
  rng: () => number
): typeof items {
  const shuffled = seededShuffle(items, rng);
  const result: typeof items = [];
  const pool = [...shuffled];

  while (pool.length > 0) {
    const lastCat = result.length > 0 ? result[result.length - 1].category : null;
    // Find first item that doesn't match last category
    const idx = pool.findIndex((p) => p.category !== lastCat);
    if (idx >= 0) {
      result.push(pool.splice(idx, 1)[0]);
    } else {
      // No choice — take first remaining
      result.push(pool.shift()!);
    }
  }
  return result;
}
