/**
 * POST /api/internal/reset-puzzles
 *
 * Admin endpoint: clears all user_import puzzles and re-queues games for re-analysis.
 * Protected by CRON_SECRET.
 *
 * Steps:
 *  1. Delete all Puzzle records where source = "user_import"
 *  2. Reset all RawGame records to status = "pending"
 *  3. Reset lastSyncedAt for all users (so next sync re-fetches all games)
 */

import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deletedPuzzles = await prisma.puzzle.deleteMany({
    where: { source: "user_import" },
  });

  const resetGames = await prisma.rawGame.updateMany({
    data: { status: "pending", puzzlesFound: 0, processedAt: null },
  });

  const resetUsers = await prisma.user.updateMany({
    where: {
      OR: [
        { lichessUsername: { not: null } },
        { chessComUsername: { not: null } },
      ],
    },
    data: { lastSyncedAt: null },
  });

  return NextResponse.json({
    ok: true,
    puzzlesDeleted: deletedPuzzles.count,
    gamesRequeued: resetGames.count,
    usersReset: resetUsers.count,
  });
}
