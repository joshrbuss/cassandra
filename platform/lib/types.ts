export type MoveGrade =
  | "brilliant"
  | "great"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export const GRADE_LABELS: Record<
  MoveGrade,
  { label: string; symbol: string; color: string; bg: string }
> = {
  brilliant:  { label: "Brilliant",  symbol: "💎", color: "text-cyan-600",   bg: "bg-cyan-50" },
  great:      { label: "Great Move", symbol: "!",  color: "text-blue-600",   bg: "bg-blue-50" },
  good:       { label: "Good",       symbol: "✓",  color: "text-green-600",  bg: "bg-green-50" },
  inaccuracy: { label: "Inaccuracy", symbol: "~",  color: "text-yellow-600", bg: "bg-yellow-50" },
  mistake:    { label: "Mistake",    symbol: "?",  color: "text-orange-600", bg: "bg-orange-50" },
  blunder:    { label: "Blunder",    symbol: "??", color: "text-red-600",    bg: "bg-red-50" },
};

export interface CandidateMove {
  uci: string;
  san: string;
  grade: MoveGrade;
  /** Centipawn evaluation from the perspective of the side to move (higher = better) */
  eval_cp: number;
}
