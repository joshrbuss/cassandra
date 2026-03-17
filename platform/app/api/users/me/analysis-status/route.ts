/**
 * GET /api/users/me/analysis-status
 *
 * Returns the background analysis progress for the current user.
 * Used by the dashboard to show "Still analysing..." or "Analysis complete".
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [pendingCount, totalGames, totalPuzzles] = await Promise.all([
    prisma.rawGame.count({
      where: { userId: session.userId, status: { in: ["pending", "processing"] } },
    }),
    prisma.rawGame.count({
      where: { userId: session.userId },
    }),
    prisma.puzzle.count({
      where: { sourceUserId: session.userId, source: "user_import" },
    }),
  ]);

  const doneGames = totalGames - pendingCount;
  const isComplete = pendingCount === 0;

  return NextResponse.json({
    isComplete,
    pendingGames: pendingCount,
    totalGames,
    doneGames,
    totalPuzzles,
  });
}
