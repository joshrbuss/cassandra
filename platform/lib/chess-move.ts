import type { Chess, Move } from "chess.js";

/**
 * Attempt a chess move, smartly handling promotion.
 *
 * chess.js 1.x rejects moves with a spurious `promotion` field on
 * non-promotion moves.  This helper tries without promotion first,
 * then retries with queen promotion if the target rank is 1 or 8
 * (i.e. a pawn reaching the last rank).
 */
export function safeMove(
  chess: Chess,
  from: string,
  to: string,
): Move | null {
  // Try the move without promotion first
  try {
    return chess.move({ from, to });
  } catch {
    // chess.js 1.x throws on invalid moves
  }

  // If target is last rank, retry as queen promotion
  const rank = to[1];
  if (rank === "8" || rank === "1") {
    try {
      return chess.move({ from, to, promotion: "q" });
    } catch {
      // Invalid promotion move
    }
  }

  return null;
}
