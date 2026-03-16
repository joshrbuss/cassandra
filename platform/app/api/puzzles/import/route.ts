/**
 * POST /api/puzzles/import
 *
 * Accepts an array of puzzle candidates extracted client-side (Chess.com + WASM
 * Stockfish) and persists them for the authenticated user.
 *
 * Enforces the same 500-puzzle cap and solvingFen deduplication as the
 * server-side import job.
 */

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const MAX_PERSONAL_PUZZLES = 500;

interface PuzzleInput {
  id: string;
  fen: string;
  solvingFen: string;
  lastMove: string;
  solutionMoves: string;
  rating?: number;
  themes?: string;
  gameUrl?: string;
  opponentUsername?: string;
  gameDate?: string;
  gameResult?: string;
  moveNumber?: number;
  evalCp?: number;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { puzzles: PuzzleInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { puzzles } = body;
  if (!Array.isArray(puzzles) || puzzles.length === 0) {
    return NextResponse.json({ imported: 0 });
  }

  const userId = session.userId;

  const existingCount = await prisma.puzzle.count({
    where: { sourceUserId: userId, source: "user_import" },
  });

  if (existingCount >= MAX_PERSONAL_PUZZLES) {
    return NextResponse.json({ imported: 0, capped: true });
  }

  const remaining = MAX_PERSONAL_PUZZLES - existingCount;
  let imported = 0;

  for (const puzzle of puzzles.slice(0, remaining)) {
    if (!puzzle.fen || !puzzle.solvingFen || !puzzle.solutionMoves || !puzzle.id) continue;

    // Deduplicate by solvingFen (same position shouldn't become two puzzles)
    const dup = await prisma.puzzle.findFirst({
      where: { solvingFen: puzzle.solvingFen },
      select: { id: true },
    });
    if (dup) continue;

    try {
      await prisma.puzzle.create({
        data: {
          id: puzzle.id,
          fen: puzzle.fen,
          solvingFen: puzzle.solvingFen,
          lastMove: puzzle.lastMove ?? "",
          solutionMoves: puzzle.solutionMoves,
          rating: puzzle.rating ?? 800,
          themes: puzzle.themes ?? "tactics",
          type: "standard",
          source: "user_import",
          sourceUserId: userId,
          isPublic: false,
          gameUrl: puzzle.gameUrl,
          opponentUsername: puzzle.opponentUsername,
          gameDate: puzzle.gameDate,
          gameResult: puzzle.gameResult,
          moveNumber: puzzle.moveNumber,
          evalCp: puzzle.evalCp,
        },
      });
      imported++;
    } catch {
      // Skip on unique constraint or other DB error (e.g. duplicate id)
    }
  }

  return NextResponse.json({ imported });
}
