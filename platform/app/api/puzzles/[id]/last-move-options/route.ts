import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  correctMoveOption,
  generateDistractors,
  shuffle,
} from "@/lib/distractor";

/**
 * GET /api/puzzles/[id]/last-move-options
 *
 * Returns the correct last move plus 3 distractors for a given puzzle,
 * in randomised order. The client receives a `correctUci` field so it
 * can check the answer locally without a second round-trip.
 *
 * Response shape:
 * {
 *   options: Array<{ uci: string; san: string; resultFen: string }>,
 *   correctUci: string,
 *   playerColor: "white" | "black"   // whose turn it is to answer
 * }
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const puzzle = await prisma.puzzle.findUnique({ where: { id } });
  if (!puzzle) {
    return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
  }

  try {
    // For opponent_prediction puzzles, avoid using the player's best response
    // as a distractor (spec: "avoid the puzzle's best move as a distractor").
    const playerBestMove =
      puzzle.type === "opponent_prediction"
        ? puzzle.solutionMoves.trim().split(/\s+/)[0] ?? ""
        : "";

    const correct = correctMoveOption(puzzle.fen, puzzle.lastMove);
    const distractors = generateDistractors(
      puzzle.fen,
      puzzle.lastMove,
      playerBestMove ? [playerBestMove] : [],
      3
    );
    const options = shuffle([correct, ...distractors]);

    // The side that made the last move is the one whose turn it is in `fen`
    // (because fen is the position BEFORE the last move).
    // In Lichess format, fen.split(" ")[1] is "w" or "b" — the side to move.
    const fenTurn = puzzle.fen.split(" ")[1];
    const playerColor = fenTurn === "w" ? "white" : "black";

    return NextResponse.json({
      options,
      correctUci: puzzle.lastMove,
      playerColor,
    });
  } catch (err) {
    console.error("last-move-options error:", err);
    return NextResponse.json(
      { error: "Failed to generate options" },
      { status: 500 }
    );
  }
}
