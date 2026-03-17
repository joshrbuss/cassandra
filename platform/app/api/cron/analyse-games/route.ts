/**
 * GET/POST /api/cron/analyse-games
 *
 * Background cron job that processes pending RawGames left over after the
 * foreground /analysing page finishes (which only handles the first 10-20 games).
 *
 * Runs every 5 minutes via Vercel Cron (GET). Can also be triggered manually:
 *
 *   curl -X POST https://your-domain/api/cron/analyse-games \
 *        -H "Authorization: Bearer <CRON_SECRET>"
 *
 * Protected by CRON_SECRET header (x-cron-secret or Authorization: Bearer).
 */

import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractPuzzlesFromGame } from "@/lib/jobs/extractPuzzles";
import { extractPuzzlesFromAnnotatedPgn } from "@/lib/jobs/extractPuzzlesFromAnnotatedPgn";

export const maxDuration = 60;

/** Max games to process per invocation */
const GAMES_PER_RUN = 10;

/** Max personal puzzles per user */
const MAX_PERSONAL_PUZZLES = 500;

/** Max positions per Stockfish chunk (same as analyse-game route) */
const POSITIONS_PER_CHUNK = 20;

/** Max runtime before we stop (ms) — leave headroom for the 60s limit */
const MAX_RUNTIME_MS = 50_000;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV === "development";
  }
  const provided =
    req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  return provided === secret;
}

async function handleRequest(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startMs = Date.now();
  let gamesProcessed = 0;
  let puzzlesCreated = 0;

  // Pick up pending/processing games across all users, oldest first
  const games = await prisma.rawGame.findMany({
    where: {
      status: { in: ["pending", "processing"] },
    },
    orderBy: [
      { status: "asc" }, // processing first (resume)
      { createdAt: "asc" },
    ],
    include: {
      user: { select: { lichessUsername: true, chessComUsername: true } },
    },
    take: GAMES_PER_RUN,
  });

  if (games.length === 0) {
    return NextResponse.json({ ok: true, gamesProcessed: 0, puzzlesCreated: 0, message: "No pending games" });
  }

  console.log(`[cron/analyse-games] Found ${games.length} pending/processing games`);

  for (const game of games) {
    if (Date.now() - startMs > MAX_RUNTIME_MS) {
      console.log(`[cron/analyse-games] Time limit reached after ${gamesProcessed} games`);
      break;
    }

    // Mark as processing
    if (game.status === "pending") {
      await prisma.rawGame.update({
        where: { id: game.id },
        data: { status: "processing" },
      });
    }

    try {
      // Check puzzle cap for this user
      const existingCount = await prisma.puzzle.count({
        where: { sourceUserId: game.userId, source: "user_import" },
      });
      const remaining = MAX_PERSONAL_PUZZLES - existingCount;

      if (remaining <= 0) {
        await prisma.rawGame.update({
          where: { id: game.id },
          data: { status: "done", processedAt: new Date() },
        });
        gamesProcessed++;
        continue;
      }

      const playerUsername = game.platform === "lichess"
        ? game.user.lichessUsername
        : game.user.chessComUsername;

      const hasEvals = game.pgn.includes("[%eval");
      let candidates;
      let gameComplete: boolean;

      if (hasEvals) {
        // Lichess: fast annotated extraction
        candidates = await extractPuzzlesFromAnnotatedPgn(game.pgn, game.userId, playerUsername ?? undefined);
        gameComplete = true;
      } else {
        // Chess.com: chunked Stockfish analysis
        const result = await extractPuzzlesFromGame(
          game.pgn,
          game.userId,
          playerUsername ?? undefined,
          game.analysedUpTo,
          POSITIONS_PER_CHUNK,
        );
        candidates = result.candidates;
        gameComplete = result.complete;

        // Save progress
        await prisma.rawGame.update({
          where: { id: game.id },
          data: { analysedUpTo: result.stoppedAt },
        });
      }

      // Insert candidates with dedup
      let puzzlesFound = game.puzzlesFound;
      for (const c of candidates) {
        if (puzzlesFound >= remaining) break;

        const exists = await prisma.puzzle.findFirst({
          where: { solvingFen: c.solvingFen },
          select: { id: true },
        });
        if (exists) continue;

        await prisma.puzzle.create({ data: { ...c } });
        puzzlesFound++;
        puzzlesCreated++;
      }

      if (gameComplete) {
        await prisma.rawGame.update({
          where: { id: game.id },
          data: { status: "done", processedAt: new Date(), puzzlesFound },
        });
      } else {
        await prisma.rawGame.update({
          where: { id: game.id },
          data: { puzzlesFound },
        });
      }

      gamesProcessed++;
    } catch (err) {
      console.error(`[cron/analyse-games] Failed game ${game.id}: ${err}`);
      await prisma.rawGame.update({
        where: { id: game.id },
        data: { status: "failed", processedAt: new Date() },
      });
      gamesProcessed++;
    }
  }

  console.log(`[cron/analyse-games] Done: ${gamesProcessed} games, ${puzzlesCreated} puzzles in ${Date.now() - startMs}ms`);

  return NextResponse.json({
    ok: true,
    gamesProcessed,
    puzzlesCreated,
    durationMs: Date.now() - startMs,
  });
}

/** Vercel Cron calls GET */
export async function GET(req: NextRequest) {
  return handleRequest(req);
}

/** Manual trigger via curl -X POST */
export async function POST(req: NextRequest) {
  return handleRequest(req);
}
