import { NextRequest, NextResponse } from "next/server";
import { Chess } from "chess.js";
import { prisma } from "@/lib/prisma";
import { buildThreatExplanation } from "@/lib/puzzle-explanation";

export type PredictScore = "full" | "partial" | "none";

export interface PredictResponse {
  score: PredictScore;
  pointsAwarded: number; // 0 | 50 | 100
  correct: boolean; // true if first move was right
  correctSequence: string[]; // UCI moves
  correctSequenceSan: string[]; // SAN for display
  explanation: string; // "Your opponent was threatening X"
}

/**
 * POST /api/puzzles/[id]/predict
 *
 * Body: { predicted: string[] }  — array of UCI moves the user predicted
 *   predicted[0] = their guess for the opponent's first move (= puzzle.lastMove)
 *   predicted[1] = optional guess for opponent's follow-up (= solutionMoves[1])
 *
 * Scoring:
 *   Full (100 pts)    — all predicted moves correct
 *   Partial (50 pts)  — first move correct only
 *   None (0 pts)      — first move wrong
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.predicted) || body.predicted.length === 0) {
    return NextResponse.json(
      { error: "Body must be { predicted: string[] }" },
      { status: 400 }
    );
  }

  const puzzle = await prisma.puzzle.findUnique({ where: { id } });
  if (!puzzle) {
    return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
  }

  if (puzzle.type !== "opponent_prediction") {
    return NextResponse.json(
      { error: "This endpoint is only for opponent_prediction puzzles" },
      { status: 400 }
    );
  }

  // The correct first move is always puzzle.lastMove (opponent's move from fen)
  // The optional second correct move is solutionMoves[1] (opponent's follow-up)
  const solutionParts = puzzle.solutionMoves.trim().split(/\s+/);
  const correctFirst = puzzle.lastMove;
  const correctSecond = solutionParts[1] ?? null; // opponent's reply after player responds

  const predicted = body.predicted as string[];

  // Build SAN representations for the response
  function toSan(fen: string, uci: string): string {
    try {
      const chess = new Chess(fen);
      const result = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      return result?.san ?? uci;
    } catch {
      return uci;
    }
  }

  // FEN after first opponent move + player's correct response = position for second prediction
  function fenAfterMoves(startFen: string, ucis: string[]): string | null {
    try {
      const chess = new Chess(startFen);
      for (const uci of ucis) {
        const result = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
        if (!result) return null;
      }
      return chess.fen();
    } catch {
      return null;
    }
  }

  const firstCorrect = predicted[0] === correctFirst;
  const secondCorrect =
    correctSecond !== null && predicted.length > 1
      ? predicted[1] === correctSecond
      : null;

  // Determine score
  let score: PredictScore;
  let pointsAwarded: number;

  if (!firstCorrect) {
    score = "none";
    pointsAwarded = 0;
  } else if (correctSecond === null || secondCorrect === true) {
    // Full: first correct, and either no second step or second also correct
    score = "full";
    pointsAwarded = 100;
  } else {
    // First correct but second wrong
    score = "partial";
    pointsAwarded = 50;
  }

  // Build correct sequence SANs
  const correctSequence = correctSecond ? [correctFirst, correctSecond] : [correctFirst];
  const correctSequenceSan = [toSan(puzzle.fen, correctFirst)];
  if (correctSecond) {
    // After opponent first move + player's reply (solutionMoves[0]), get opponent follow-up SAN
    const fenForSecond = fenAfterMoves(puzzle.fen, [correctFirst, solutionParts[0]]);
    if (fenForSecond) {
      correctSequenceSan.push(toSan(fenForSecond, correctSecond));
    }
  }

  const response: PredictResponse = {
    score,
    pointsAwarded,
    correct: firstCorrect,
    correctSequence,
    correctSequenceSan,
    explanation: buildThreatExplanation(puzzle.themes),
  };

  return NextResponse.json(response);
}
