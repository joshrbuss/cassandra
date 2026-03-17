/**
 * POST /api/internal/import-games
 *
 * Cron-triggered endpoint that imports games and extracts puzzles for users
 * who have linked Lichess or Chess.com accounts.
 *
 * Protected by CRON_SECRET header — must match process.env.CRON_SECRET.
 *
 * Schedule: Run via Vercel Cron (vercel.json) or any external scheduler.
 * One invocation processes up to USERS_PER_RUN users to fit within serverless limits.
 *
 * To trigger manually during development:
 *   curl -X POST http://localhost:3000/api/internal/import-games \
 *        -H "x-cron-secret: <your CRON_SECRET>" \
 *        -H "Content-Type: application/json" \
 *        -d '{"userId": "<optional specific user id>"}'
 */

import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { importGamesForUser } from "@/lib/jobs/importGames";

/** Max users to process per cron invocation */
const USERS_PER_RUN = 5;

/** Max runtime before we stop processing more users (ms) */
const MAX_RUNTIME_MS = 240_000;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // If no secret is configured, only allow in development
    return process.env.NODE_ENV === "development";
  }
  const provided =
    req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  return provided === secret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startMs = Date.now();

  // Optional: target a specific user (useful for testing and for the
  // "first visit after OAuth link" non-blocking trigger)
  let specificUserId: string | null = null;
  try {
    const body = (await req.json()) as { userId?: string };
    specificUserId = body.userId ?? null;
  } catch {
    // Body is optional
  }

  const results: Awaited<ReturnType<typeof importGamesForUser>>[] = [];

  if (specificUserId) {
    // Single-user mode (non-blocking trigger from settings page)
    const result = await importGamesForUser(specificUserId);
    results.push(result);
  } else {
    // Batch mode: process users who have linked accounts but haven't been
    // imported recently (last import > 6 hours ago, or never)
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1_000);

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { lichessUsername: { not: null } },
          { chessComUsername: { not: null } },
        ],
        // Only users whose most recent imported puzzle is old or absent
        NOT: {
          puzzles: {
            some: {
              source: "user_import",
              createdAt: { gte: sixHoursAgo },
            },
          },
        },
      },
      select: { id: true },
      take: USERS_PER_RUN,
    });

    for (const user of users) {
      if (Date.now() - startMs > MAX_RUNTIME_MS) break;
      const result = await importGamesForUser(user.id);
      results.push(result);
    }
  }

  const totalImported = results.reduce((s, r) => s + r.puzzlesImported, 0);
  const totalProcessed = results.reduce((s, r) => s + r.gamesProcessed, 0);

  // Also process any abandoned RawGames (user left /analysing page mid-analysis)
  let rawGamesProcessed = 0;
  if (Date.now() - startMs < MAX_RUNTIME_MS) {
    const { extractPuzzlesFromGame } = await import("@/lib/jobs/extractPuzzles");
    const { extractPuzzlesFromAnnotatedPgn } = await import("@/lib/jobs/extractPuzzlesFromAnnotatedPgn");

    const staleGames = await prisma.rawGame.findMany({
      where: {
        status: { in: ["pending", "processing"] },
        // Only process games that have been waiting for >5 minutes (abandoned)
        createdAt: { lt: new Date(Date.now() - 5 * 60 * 1000) },
      },
      include: { user: { select: { lichessUsername: true, chessComUsername: true } } },
      take: 10,
    });

    for (const game of staleGames) {
      if (Date.now() - startMs > MAX_RUNTIME_MS) break;

      await prisma.rawGame.update({ where: { id: game.id }, data: { status: "processing" } });

      try {
        const playerUsername = game.platform === "lichess"
          ? game.user.lichessUsername
          : game.user.chessComUsername;
        const hasEvals = game.pgn.includes("[%eval");
        const candidates = hasEvals
          ? await extractPuzzlesFromAnnotatedPgn(game.pgn, game.userId, playerUsername ?? undefined)
          : await extractPuzzlesFromGame(game.pgn, game.userId, playerUsername ?? undefined);

        let found = 0;
        for (const c of candidates) {
          const exists = await prisma.puzzle.findFirst({ where: { solvingFen: c.solvingFen }, select: { id: true } });
          if (exists) continue;
          await prisma.puzzle.create({ data: { ...c } });
          found++;
        }

        await prisma.rawGame.update({
          where: { id: game.id },
          data: { status: "done", processedAt: new Date(), puzzlesFound: found },
        });
        rawGamesProcessed++;
      } catch (err) {
        await prisma.rawGame.update({ where: { id: game.id }, data: { status: "failed", processedAt: new Date() } });
        console.error(`[cron] Failed to process RawGame ${game.id}: ${err}`);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    usersProcessed: results.length,
    gamesProcessed: totalProcessed,
    puzzlesImported: totalImported,
    rawGamesProcessed,
    durationMs: Date.now() - startMs,
    results,
  });
}
