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

export const maxDuration = 60; // seconds — Lichess eval parsing is fast; Chess.com Stockfish may add time

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await importGamesForUser(session.userId);

  return NextResponse.json({
    ok: true,
    gamesProcessed: result.gamesProcessed,
    puzzlesImported: result.puzzlesImported,
    errors: result.errors,
  });
}
