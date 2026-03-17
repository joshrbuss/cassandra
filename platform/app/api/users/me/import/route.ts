/**
 * POST /api/users/me/import
 *
 * Phase 1 (fast, <10s): Fetch games from Chess.com/Lichess APIs,
 * save raw PGNs to RawGame table, return game count immediately.
 *
 * Phase 2 happens via /api/puzzles/analyse-game (called per-game by the client).
 */

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchRecentGames as lichessGames } from "@/lib/chess-apis/lichess";
import { fetchRecentGames as chesscomGames } from "@/lib/chess-apis/chesscom";

export const maxDuration = 30;

function extractGameUrl(pgn: string): string | undefined {
  const link = pgn.match(/\[Link\s+"([^"]+)"\]/)?.[1];
  if (link) return link;
  const site = pgn.match(/\[Site\s+"([^"]+)"\]/)?.[1];
  if (site?.startsWith("http")) return site;
  return undefined;
}

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { lichessUsername: true, chessComUsername: true, lastSyncedAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // First sync = no lastSyncedAt → fetch ALL games. Subsequent = incremental.
  const since = user.lastSyncedAt ?? null;

  // Fetch PGNs from both platforms
  const allPgns: { pgn: string; platform: string }[] = [];

  if (user.lichessUsername) {
    try {
      const pgns = await lichessGames(user.lichessUsername, 500, since);
      for (const pgn of pgns) {
        allPgns.push({ pgn, platform: "lichess" });
      }
    } catch (err) {
      console.error(`[import] Lichess fetch failed: ${err}`);
    }
  }

  if (user.chessComUsername) {
    try {
      const pgns = await chesscomGames(user.chessComUsername, 500, since);
      for (const pgn of pgns) {
        allPgns.push({ pgn, platform: "chesscom" });
      }
    } catch (err) {
      console.error(`[import] Chess.com fetch failed: ${err}`);
    }
  }

  if (allPgns.length === 0) {
    // Update lastSyncedAt even if no games found
    await prisma.user.update({
      where: { id: session.userId },
      data: { lastSyncedAt: new Date() },
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      gamesQueued: 0,
      gamesTotal: 0,
      firstPuzzleId: null,
    });
  }

  // Deduplicate against already-queued/done games by gameUrl
  const existingUrls = new Set(
    (await prisma.rawGame.findMany({
      where: { userId: session.userId },
      select: { gameUrl: true },
    })).map((g) => g.gameUrl).filter(Boolean)
  );

  // Also deduplicate against existing puzzles by gameUrl
  const existingPuzzleUrls = new Set(
    (await prisma.puzzle.findMany({
      where: { sourceUserId: session.userId, source: "user_import", gameUrl: { not: null } },
      select: { gameUrl: true },
    })).map((p) => p.gameUrl).filter(Boolean)
  );

  const newGames = allPgns.filter((g) => {
    const url = extractGameUrl(g.pgn);
    if (!url) return true; // Can't dedup without URL, let it through
    return !existingUrls.has(url) && !existingPuzzleUrls.has(url);
  });

  // Insert new games into RawGame queue
  if (newGames.length > 0) {
    await prisma.rawGame.createMany({
      data: newGames.map((g) => ({
        userId: session.userId!,
        platform: g.platform,
        pgn: g.pgn,
        gameUrl: extractGameUrl(g.pgn) ?? null,
        status: "pending",
      })),
    });
  }

  // Count total pending games for this user
  const pendingCount = await prisma.rawGame.count({
    where: { userId: session.userId, status: "pending" },
  });

  // Check if there are already existing puzzles (for firstPuzzleId)
  const firstPuzzle = await prisma.puzzle.findFirst({
    where: { sourceUserId: session.userId, source: "user_import" },
    orderBy: { evalCp: "desc" },
    select: { id: true },
  });

  // Update lastSyncedAt
  await prisma.user.update({
    where: { id: session.userId },
    data: { lastSyncedAt: new Date() },
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    gamesQueued: newGames.length,
    gamesTotal: pendingCount,
    firstPuzzleId: firstPuzzle?.id ?? null,
  });
}
