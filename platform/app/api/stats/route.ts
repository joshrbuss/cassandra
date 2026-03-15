import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface StatsResponse {
  puzzles_solved: number;
  registered_players: number;
  puzzles_in_library: number;
  active_battles: number;
  longest_current_streak: number;
}

// Module-level cache for the full response (60s TTL)
let cached: StatsResponse | null = null;
let cacheExpiry = 0;

/**
 * GET /api/stats
 * Returns site-wide aggregate stats for homepage trust signals.
 * Cached for 60 seconds.
 */
export async function GET() {
  const now = Date.now();
  if (cached !== null && now < cacheExpiry) {
    return NextResponse.json(cached);
  }

  const [siteStats, distinctPlayers, puzzleCount, activeBattleCount, streakAgg] =
    await Promise.all([
      prisma.siteStats.findUnique({ where: { id: 1 } }),
      prisma.puzzleAttempt.findMany({
        where: { userId: { not: null } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.puzzle.count(),
      prisma.battle.count({ where: { status: "active" } }),
      prisma.user.aggregate({ _max: { currentStreak: true } }),
    ]);

  cached = {
    puzzles_solved: Number(siteStats?.totalPuzzlesSolved ?? 0),
    registered_players: distinctPlayers.length,
    puzzles_in_library: puzzleCount,
    active_battles: activeBattleCount,
    longest_current_streak: streakAgg._max.currentStreak ?? 0,
  };
  cacheExpiry = now + 60_000;

  return NextResponse.json(cached);
}
