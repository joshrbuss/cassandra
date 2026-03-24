import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * V2 puzzle extraction — storage endpoint.
 *
 * POST /api/extract-v2/store
 * Body: { username, sourceUserId?, games: [{ gameUrl, puzzles, moveEvals }] }
 *
 * Receives client-side extraction results and persists puzzles + MoveEvals.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sourceUserId, games } = body as {
      sourceUserId: string | null;
      games: Array<{
        gameUrl?: string;
        puzzles: Array<{
          id: string;
          fen: string;
          solvingFen: string;
          lastMove: string;
          solutionMoves: string;
          rating: number;
          themes: string;
          type: string;
          candidateMoves?: string;
          outOfTheory?: boolean;
          parentPuzzleId?: string;
          opponentBestMove?: string;
          counterMove?: string;
          threatBluffAnswer?: string;
          decoyMoves?: string;
          score?: number;
          gameUrl?: string;
          opponentUsername?: string;
          gameDate?: string;
          gameResult?: string;
          moveNumber?: number;
          evalCp?: number;
          playerColor?: string;
        }>;
        moveEvals: Array<{
          moveNumber: number;
          side: string;
          evalCp: number;
          bestMoveCp: number;
          cpl: number;
          phase: string;
          movePlayed: string;
          bestMove: string;
        }>;
      }>;
    };

    let stored = 0;
    let skipped = 0;
    let evalsStored = 0;

    for (const game of games) {
      const gameId = game.gameUrl ?? `game-${Date.now()}`;

      // Store MoveEvals
      if (game.moveEvals.length > 0) {
        await prisma.moveEval.createMany({
          data: game.moveEvals.map((e) => ({
            gameId,
            moveNumber: e.moveNumber,
            side: e.side,
            evalCp: e.evalCp,
            bestMoveCp: e.bestMoveCp,
            cpl: e.cpl,
            phase: e.phase,
            movePlayed: e.movePlayed,
            bestMove: e.bestMove,
            subtype: "v2",
          })),
        });
        evalsStored += game.moveEvals.length;
      }

      // Store puzzles (skip duplicates)
      for (const c of game.puzzles) {
        const existing = await prisma.puzzle.findFirst({
          where: { solvingFen: c.solvingFen, sourceUserId: sourceUserId ?? undefined },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await prisma.puzzle.create({
          data: {
            id: c.id,
            fen: c.fen,
            solvingFen: c.solvingFen,
            lastMove: c.lastMove,
            solutionMoves: c.solutionMoves,
            rating: c.rating,
            themes: `${c.themes} v2`,
            type: c.type,
            candidateMoves: c.candidateMoves ?? null,
            outOfTheory: c.outOfTheory ?? null,
            parentPuzzleId: c.parentPuzzleId ?? null,
            opponentBestMove: c.opponentBestMove ?? null,
            counterMove: c.counterMove ?? null,
            threatBluffAnswer: c.threatBluffAnswer ?? null,
            decoyMoves: c.decoyMoves ?? null,
            puzzleScore: c.score ?? null,
            source: "user_import",
            sourceUserId: sourceUserId ?? undefined,
            isPublic: false,
            gameUrl: c.gameUrl,
            opponentUsername: c.opponentUsername,
            gameDate: c.gameDate,
            gameResult: c.gameResult,
            moveNumber: c.moveNumber,
            evalCp: c.evalCp,
            playerColor: c.playerColor,
            subtype: "v2",
          },
        });
        stored++;
      }
    }

    return NextResponse.json({ ok: true, stored, skipped, evalsStored });
  } catch (error) {
    console.error("[extract-v2/store] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
