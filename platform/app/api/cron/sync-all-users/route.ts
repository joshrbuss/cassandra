/**
 * GET /api/cron/sync-all-users
 *
 * Daily cron (3am UTC): fetches games from Lichess/Chess.com for all users
 * with linked accounts and queues them as pending RawGame records.
 *
 * Behaviour:
 *  - If user.lastSyncedAt is null → fetch ALL games (first sync after reset)
 *  - If user.lastSyncedAt is set → only fetch games since that date (incremental)
 *  - Deduplicates by gameUrl against existing RawGame records
 *  - Updates lastSyncedAt after queuing
 *
 * The queued RawGames are then processed by /api/cron/analyse-games (every 5 min).
 *
 * Protected by CRON_SECRET header.
 */

import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchRecentGames as lichessGames } from "@/lib/chess-apis/lichess";
import { fetchRecentGames as chesscomGames } from "@/lib/chess-apis/chesscom";

export const maxDuration = 300;

/** Max users to process per invocation (stay within function limits) */
const USERS_PER_RUN = 20;

/** Max runtime before we stop processing more users (ms) */
const MAX_RUNTIME_MS = 270_000;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV === "development";
  }
  const provided =
    req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  return provided === secret;
}

function extractGameUrl(pgn: string): string | undefined {
  const link = pgn.match(/\[Link\s+"([^"]+)"\]/)?.[1];
  if (link) return link;
  const site = pgn.match(/\[Site\s+"([^"]+)"\]/)?.[1];
  if (site?.startsWith("http")) return site;
  return undefined;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startMs = Date.now();

  // Fetch users with linked accounts, prioritise those never synced (lastSyncedAt IS NULL)
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { lichessUsername: { not: null } },
        { chessComUsername: { not: null } },
      ],
    },
    select: {
      id: true,
      lichessUsername: true,
      chessComUsername: true,
      lastSyncedAt: true,
    },
    orderBy: { lastSyncedAt: "asc" }, // null values first (never synced)
    take: USERS_PER_RUN,
  });

  if (users.length === 0) {
    return NextResponse.json({ ok: true, usersProcessed: 0, gamesQueued: 0 });
  }

  console.log(`[sync-all-users] Processing ${users.length} users`);

  let totalUsersProcessed = 0;
  let totalGamesQueued = 0;

  for (const user of users) {
    if (Date.now() - startMs > MAX_RUNTIME_MS) {
      console.log(`[sync-all-users] Time limit reached after ${totalUsersProcessed} users`);
      break;
    }

    const since = user.lastSyncedAt ?? null;
    console.log(`[sync-all-users] User ${user.id}: lichess=${user.lichessUsername ?? "none"} chesscom=${user.chessComUsername ?? "none"} since=${since?.toISOString() ?? "ALL"}`);

    const allPgns: { pgn: string; platform: string }[] = [];

    // Fetch from Lichess
    if (user.lichessUsername) {
      try {
        const pgns = await lichessGames(user.lichessUsername, 500, since);
        for (const pgn of pgns) {
          allPgns.push({ pgn, platform: "lichess" });
        }
        console.log(`[sync-all-users] User ${user.id}: ${pgns.length} Lichess games fetched`);
      } catch (err) {
        console.error(`[sync-all-users] Lichess fetch failed for ${user.lichessUsername}: ${err}`);
      }
    }

    // Fetch from Chess.com
    if (user.chessComUsername) {
      try {
        const pgns = await chesscomGames(user.chessComUsername, 500, since);
        for (const pgn of pgns) {
          allPgns.push({ pgn, platform: "chesscom" });
        }
        console.log(`[sync-all-users] User ${user.id}: ${pgns.length} Chess.com games fetched`);
      } catch (err) {
        console.error(`[sync-all-users] Chess.com fetch failed for ${user.chessComUsername}: ${err}`);
      }
    }

    if (allPgns.length === 0) {
      // Still update lastSyncedAt so we don't keep retrying empty accounts
      await prisma.user.update({
        where: { id: user.id },
        data: { lastSyncedAt: new Date() },
      }).catch(() => {});
      totalUsersProcessed++;
      continue;
    }

    // Deduplicate by gameUrl against existing RawGame records for this user
    const existingUrls = new Set(
      (await prisma.rawGame.findMany({
        where: { userId: user.id },
        select: { gameUrl: true },
      })).map((g) => g.gameUrl).filter(Boolean)
    );

    // Also deduplicate against existing puzzles by gameUrl
    const existingPuzzleUrls = new Set(
      (await prisma.puzzle.findMany({
        where: { sourceUserId: user.id, source: "user_import", gameUrl: { not: null } },
        select: { gameUrl: true },
      })).map((p) => p.gameUrl).filter(Boolean)
    );

    const newGames = allPgns.filter((g) => {
      const url = extractGameUrl(g.pgn);
      if (!url) return true; // Can't dedup without URL, let it through
      return !existingUrls.has(url) && !existingPuzzleUrls.has(url);
    });

    console.log(`[sync-all-users] User ${user.id}: ${allPgns.length} total, ${newGames.length} new (after dedup)`);

    // Queue new games as pending RawGames
    if (newGames.length > 0) {
      await prisma.rawGame.createMany({
        data: newGames.map((g) => ({
          userId: user.id,
          platform: g.platform,
          pgn: g.pgn,
          gameUrl: extractGameUrl(g.pgn) ?? null,
          status: "pending",
        })),
      });
      totalGamesQueued += newGames.length;
    }

    // Update lastSyncedAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSyncedAt: new Date() },
    }).catch(() => {});

    totalUsersProcessed++;
  }

  console.log(`[sync-all-users] Done: ${totalUsersProcessed} users, ${totalGamesQueued} games queued in ${Date.now() - startMs}ms`);

  return NextResponse.json({
    ok: true,
    usersProcessed: totalUsersProcessed,
    gamesQueued: totalGamesQueued,
    durationMs: Date.now() - startMs,
  });
}
