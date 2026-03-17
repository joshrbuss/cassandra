/**
 * POST /api/puzzles/analyse-game
 *
 * Phase 2: Analyse games from the RawGame queue in chunks.
 *
 * For Lichess games (with %eval annotations): analyses the whole game in one call
 * (fast — no Stockfish needed for blunder detection, only for solution moves).
 *
 * For Chess.com games (no %eval): analyses up to POSITIONS_PER_CHUNK positions
 * per call, saving progress in RawGame.analysedUpTo. The client polls repeatedly
 * until the game is complete, then moves to the next game.
 *
 * Returns: { done: boolean, gameId, puzzlesFound, remaining, firstPuzzleId }
 * - done=true when no more pending/processing games exist
 */

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractPuzzlesFromGame } from "@/lib/jobs/extractPuzzles";
import { extractPuzzlesFromAnnotatedPgn } from "@/lib/jobs/extractPuzzlesFromAnnotatedPgn";

export const maxDuration = 60;

/** Max personal puzzles per user */
const MAX_PERSONAL_PUZZLES = 500;

/** Max positions to evaluate per function call (keeps within ~45s at ~1s/position) */
const POSITIONS_PER_CHUNK = 20;

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Grab next game: either a partially-analysed one (processing) or a new pending one
  const game = await prisma.rawGame.findFirst({
    where: {
      userId: session.userId,
      status: { in: ["processing", "pending"] },
    },
    orderBy: [
      // processing first (resume), then pending (new)
      { status: "asc" },
      { createdAt: "asc" },
    ],
  });

  if (!game) {
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

  // Mark as processing if not already
  if (game.status === "pending") {
    await prisma.rawGame.update({
      where: { id: game.id },
      data: { status: "processing" },
    });
  }

  let puzzlesFound = game.puzzlesFound; // accumulate across chunks
  const startMs = Date.now();

  try {
    // Check puzzle cap
    const existingCount = await prisma.puzzle.count({
      where: { sourceUserId: session.userId, source: "user_import" },
    });
    const remaining = MAX_PERSONAL_PUZZLES - existingCount;

    console.log(`[analyse-game] Game ${game.id}: platform=${game.platform} analysedUpTo=${game.analysedUpTo} existing=${existingCount} remaining=${remaining}`);

    if (remaining <= 0) {
      await prisma.rawGame.update({
        where: { id: game.id },
        data: { status: "done", processedAt: new Date() },
      });
    } else {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { lichessUsername: true, chessComUsername: true },
      });
      const playerUsername = game.platform === "lichess"
        ? user?.lichessUsername
        : user?.chessComUsername;

      const hasEvals = game.pgn.includes("[%eval");
      console.log(`[analyse-game] Game ${game.id}: hasEvals=${hasEvals} player=${playerUsername} startIdx=${game.analysedUpTo}`);
      const extractStart = Date.now();

      let candidates;
      let gameComplete: boolean;

      if (hasEvals) {
        // Lichess: fast annotated extraction (no chunking needed)
        candidates = await extractPuzzlesFromAnnotatedPgn(game.pgn, session.userId, playerUsername ?? undefined);
        gameComplete = true;
        console.log(`[analyse-game] Annotated: ${candidates.length} candidates in ${Date.now() - extractStart}ms`);
      } else {
        // Chess.com: chunked Stockfish analysis
        const result = await extractPuzzlesFromGame(
          game.pgn,
          session.userId,
          playerUsername ?? undefined,
          game.analysedUpTo,
          POSITIONS_PER_CHUNK,
        );
        candidates = result.candidates;
        gameComplete = result.complete;
        console.log(`[analyse-game] Chunked: ${candidates.length} candidates, stoppedAt=${result.stoppedAt}/${result.totalPositions} complete=${gameComplete} in ${Date.now() - extractStart}ms`);

        // Save progress
        await prisma.rawGame.update({
          where: { id: game.id },
          data: { analysedUpTo: result.stoppedAt },
        });
      }

      // Insert candidates with dedup
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

      if (gameComplete) {
        await prisma.rawGame.update({
          where: { id: game.id },
          data: { status: "done", processedAt: new Date(), puzzlesFound },
        });
      } else {
        // Still in progress — update puzzlesFound for accumulation
        await prisma.rawGame.update({
          where: { id: game.id },
          data: { puzzlesFound },
        });
      }
    }
  } catch (err) {
    console.error(`[analyse-game] Failed for game ${game.id} after ${Date.now() - startMs}ms: ${err}`);
    await prisma.rawGame.update({
      where: { id: game.id },
      data: { status: "failed", processedAt: new Date() },
    });
  }

  // Count remaining games (pending + processing = still needs work)
  const pendingRemaining = await prisma.rawGame.count({
    where: { userId: session.userId, status: { in: ["pending", "processing"] } },
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
