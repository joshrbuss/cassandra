/**
 * POST /api/internal/reset-puzzles
 *
 * Admin endpoint: full clean slate — deletes all user_import puzzles,
 * all RawGame records, and resets lastSyncedAt so the next sync
 * re-fetches ALL games from scratch.
 *
 * Protected by CRON_SECRET.
 */

import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Delete all user-imported puzzles
  const deletedPuzzles = await prisma.puzzle.deleteMany({
    where: { source: "user_import" },
  });

  // 2. Delete all RawGame records (full wipe, not re-queue)
  const deletedGames = await prisma.rawGame.deleteMany({});

  // 3. Reset lastSyncedAt for all users so next sync fetches ALL games
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
    gamesDeleted: deletedGames.count,
    usersReset: resetUsers.count,
  });
}
