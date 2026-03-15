import { Chess } from "chess.js";

export interface MoveOption {
  uci: string;
  san: string;
  resultFen: string;
}

/**
 * Generate distractor moves for MCQ puzzle steps.
 *
 * @param fen - Position to generate moves from
 * @param correctUci - The correct move (always excluded)
 * @param movesToAvoid - Additional UCIs to exclude (e.g. player's best reply
 *   for opponent-prediction puzzles — spec says don't use it as a distractor)
 * @param count - Number of distractors to return
 */
export function generateDistractors(
  fen: string,
  correctUci: string,
  movesToAvoid: string[] = [],
  count = 3
): MoveOption[] {
  const chess = new Chess(fen);
  const correctFrom = correctUci.slice(0, 2);
  const correctPiece =
    chess.get(correctFrom as Parameters<typeof chess.get>[0])?.type ?? "";

  const excluded = new Set([correctUci, ...movesToAvoid]);
  const allMoves = chess.moves({ verbose: true });

  const candidates = allMoves
    .filter((m) => {
      const uci = `${m.from}${m.to}${m.promotion ?? ""}`;
      return !excluded.has(uci);
    })
    .map((m) => {
      const uci = `${m.from}${m.to}${m.promotion ?? ""}`;
      let score = Math.random();
      if (m.captured) score += 2;
      if (m.san.includes("+") || m.san.includes("#")) score += 1.5;
      if (m.piece === correctPiece) score += 1;
      return { uci, san: m.san, score, move: m };
    });

  candidates.sort((a, b) => b.score - a.score);

  return candidates.slice(0, count).map(({ uci, san, move }) => {
    const preview = new Chess(fen);
    preview.move({ from: move.from, to: move.to, promotion: move.promotion });
    return { uci, san, resultFen: preview.fen() };
  });
}

/**
 * Build a MoveOption for the correct move.
 */
export function correctMoveOption(fen: string, uci: string): MoveOption {
  const chess = new Chess(fen);
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length > 4 ? uci[4] : undefined;
  const moveResult = chess.move({ from, to, promotion });
  return {
    uci,
    san: moveResult?.san ?? uci,
    resultFen: chess.fen(),
  };
}

/**
 * Shuffle an array in-place (Fisher-Yates).
 */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
