/**
 * POST /api/users/me/import
 *
 * Auth-gated endpoint that triggers game import and puzzle extraction
 * for the currently signed-in user. Responds immediately with the result.
 *
 * Used by the /train page on first visit (when the user has no personal puzzles yet).
 * Also callable from the dashboard. No CRON_SECRET required — uses session auth.
 */

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { importGamesForUser } from "@/lib/jobs/importGames";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60; // seconds — Lichess eval parsing is fast; Chess.com Stockfish may add time

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await importGamesForUser(session.userId);

  // Find the first (highest cp-loss) personal puzzle for immediate redirect
  const firstPuzzle = await prisma.puzzle.findFirst({
    where: { sourceUserId: session.userId, source: "user_import" },
    orderBy: { evalCp: "desc" },
    select: { id: true },
  });

  return NextResponse.json({
    ok: true,
    gamesProcessed: result.gamesProcessed,
    puzzlesImported: result.puzzlesImported,
    errors: result.errors,
    firstPuzzleId: firstPuzzle?.id ?? null,
  });
}
