// ─── Kairos diagnostic puzzle types ──────────────────────────────────────────

export interface KairosPuzzle {
  puzzle_id: string;
  fen: string;
  correct_response: string; // UCI
  correct_response_san: string;
  board_orientation: "white" | "black";
  has_tactic: boolean;
  sequence_length: number;
  is_defensive: boolean;
  tactic_subtype: string;
  tactic_piece: string;
  position_complexity_score: number;
  target_solve_time: number;
  framing: string;
  /** Kairos category for diagnostics */
  kairos_category: KairosCategory;
}

export type KairosCategory =
  | "quiet"
  | "single_tactic"
  | "short_sequence"
  | "deep_sequence"
  | "defensive"
  | "markov_threat"
  | "mixed";

export interface KairosPuzzleResult {
  puzzle_id: string;
  solve_time_seconds: number;
  move_played: string; // UCI
  move_correct: boolean;
  has_tactic: boolean;
  sequence_length: number;
  is_defensive: boolean;
  tactic_subtype: string;
  position_complexity_score: number;
  target_solve_time: number;
  time_vs_target: number;
  kairos_category: KairosCategory;
}

export interface KairosAggregateMetrics {
  total_puzzles: number;
  correct_count: number;
  accuracy_pct: number;
  avg_solve_time: number;
  /** Average solve time by category */
  avg_time_by_category: Partial<Record<KairosCategory, number>>;
  /** Accuracy by category */
  accuracy_by_category: Partial<Record<KairosCategory, { correct: number; total: number; pct: number }>>;
  /** Accuracy by tactic subtype */
  accuracy_by_tactic: Record<string, { correct: number; total: number }>;
  /** Defensive accuracy */
  defensive_accuracy: { correct: number; total: number; pct: number };
  /** Quiet position accuracy */
  quiet_accuracy: { correct: number; total: number; pct: number };
  /** Avg time: tactical vs quiet */
  avg_time_tactical: number;
  avg_time_quiet: number;
  /** Accuracy by sequence length */
  accuracy_by_sequence_length: Record<number, { correct: number; total: number }>;
}

export type InsightKey =
  | "clock_drain"
  | "missed_tactics"
  | "missed_defense"
  | "flat_timing"
  | "strong_overall";

export interface KairosInsight {
  key: InsightKey;
  headline: string;
  body: string;
  shareStat: string;
  shareNumber: string;
}

export interface KairosProfile {
  /** Speed profile */
  speed: {
    avg_tactical: number;
    avg_quiet: number;
    avg_defensive: number;
    avg_deep: number;
  };
  /** Accuracy profile */
  accuracy: {
    tactical_rate: string; // "5/8"
    defensive_rate: string;
    quiet_rate: string;
    by_tactic: Record<string, string>; // "fork": "2/3"
  };
  /** Calculation depth */
  depth: {
    single_move_pct: number;
    sequence_pct: number;
    depth_drop_pct: number;
  };
  /** Template key */
  archetype:
    | "strong_recogniser_weak_calculator"
    | "weak_recogniser_strong_calculator"
    | "clock_burner"
    | "tactical_blind_spot_defense"
    | "consistent_slow"
    | "strong_overall";
  archetype_description: string;
}
