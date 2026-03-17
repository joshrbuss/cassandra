/**
 * POST /api/puzzles/analyse-game
 *
 * Phase 2: Analyse a single game from the RawGame queue.
 * Takes the next pending game for the authenticated user,
 * runs Stockfish analysis, creates puzzles, marks game as done.
 *
 * Returns: { done: boolean, gameId, puzzlesFound, remaining }
 * - done=true when no more pending games exist
 */

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractPuzzlesFromGame } from "@/lib/jobs/extractPuzzles";
import { extractPuzzlesFromAnnotatedPgn } from "@/lib/jobs/extractPuzzlesFromAnnotatedPgn";

export const maxDuration = 30;

/** Max personal puzzles per user */
const MAX_PERSONAL_PUZZLES = 500;

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Grab next pending game for this user
  const game = await prisma.rawGame.findFirst({
    where: { userId: session.userId, status: "pending" },
    orderBy: { createdAt: "asc" },
  });

  if (!game) {
    // No more games to process
    const firstPuzzle = await prisma.puzzle.findFirst({
      where: { sourceUserId: session.userId, source: "user_import" },
      orderBy: { evalCp: "desc" },
      select: { id: true },
    });
    return NextResponse.json({
      done: true,
      gameId: null,
      puzzlesFound: 0,
      remaining: 0,
      firstPuzzleId: firstPuzzle?.id ?? null,
    });
  }

  // Mark as processing
  await prisma.rawGame.update({
    where: { id: game.id },
    data: { status: "processing" },
  });

  let puzzlesFound = 0;
  const startMs = Date.now();

  try {
    // Check puzzle cap
    const existingCount = await prisma.puzzle.count({
      where: { sourceUserId: session.userId, source: "user_import" },
    });
    const remaining = MAX_PERSONAL_PUZZLES - existingCount;

    console.log(`[analyse-game] Game ${game.id}: platform=${game.platform} existing=${existingCount} remaining=${remaining}`);

    if (remaining <= 0) {
      await prisma.rawGame.update({
        where: { id: game.id },
        data: { status: "done", processedAt: new Date(), puzzlesFound: 0 },
      });
    } else {
      // Determine player username
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { lichessUsername: true, chessComUsername: true },
      });
      const playerUsername = game.platform === "lichess"
        ? user?.lichessUsername
        : user?.chessComUsername;

      // Extract puzzles — use annotated extractor for Lichess (has %eval), Stockfish for Chess.com
      const hasEvals = game.pgn.includes("[%eval");
      console.log(`[analyse-game] Game ${game.id}: hasEvals=${hasEvals} player=${playerUsername} extracting...`);
      const extractStart = Date.now();
      const candidates = hasEvals
        ? await extractPuzzlesFromAnnotatedPgn(game.pgn, session.userId, playerUsername ?? undefined)
        : await extractPuzzlesFromGame(game.pgn, session.userId, playerUsername ?? undefined);
      console.log(`[analyse-game] Game ${game.id}: ${candidates.length} candidates in ${Date.now() - extractStart}ms`);

      // Insert with dedup
      for (const candidate of candidates) {
        if (puzzlesFound >= remaining) break;

        const existing = await prisma.puzzle.findFirst({
          where: { solvingFen: candidate.solvingFen },
          select: { id: true },
        });
        if (existing) continue;

        await prisma.puzzle.create({
          data: {
            id: candidate.id,
            fen: candidate.fen,
            solvingFen: candidate.solvingFen,
            lastMove: candidate.lastMove,
            solutionMoves: candidate.solutionMoves,
            rating: candidate.rating,
            themes: candidate.themes,
            type: candidate.type,
            source: candidate.source,
            sourceUserId: candidate.sourceUserId,
            isPublic: candidate.isPublic,
            gameUrl: candidate.gameUrl,
            opponentUsername: candidate.opponentUsername,
            gameDate: candidate.gameDate,
            gameResult: candidate.gameResult,
            moveNumber: candidate.moveNumber,
            evalCp: candidate.evalCp,
            playerColor: candidate.playerColor,
          },
        });
        puzzlesFound++;
      }

      await prisma.rawGame.update({
        where: { id: game.id },
        data: { status: "done", processedAt: new Date(), puzzlesFound },
      });
    }
  } catch (err) {
    console.error(`[analyse-game] Failed for game ${game.id} after ${Date.now() - startMs}ms: ${err}`);
    await prisma.rawGame.update({
      where: { id: game.id },
      data: { status: "failed", processedAt: new Date() },
    });
  }

  // Count remaining pending games
  const pendingRemaining = await prisma.rawGame.count({
    where: { userId: session.userId, status: "pending" },
  });

  const firstPuzzle = await prisma.puzzle.findFirst({
    where: { sourceUserId: session.userId, source: "user_import" },
    orderBy: { evalCp: "desc" },
    select: { id: true },
  });

  return NextResponse.json({
    done: pendingRemaining === 0,
    gameId: game.id,
    puzzlesFound,
    remaining: pendingRemaining,
    firstPuzzleId: firstPuzzle?.id ?? null,
  });
}
