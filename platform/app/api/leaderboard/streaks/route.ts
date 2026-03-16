import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  streak: number;
  country: string | null;
}

export interface StreakLeaderboardResponse {
  current: LeaderboardEntry[];
  allTime: LeaderboardEntry[];
}

function displayName(user: {
  lichessUsername: string | null;
  chessComUsername: string | null;
}): string {
  return user.lichessUsername ?? user.chessComUsername ?? "Anonymous";
}

export async function GET() {
  const [currentTop, allTimeTop] = await Promise.all([
    prisma.user.findMany({
      where: { currentStreak: { gt: 0 } },
      orderBy: { currentStreak: "desc" },
      take: 100,
      select: {
        id: true,
        lichessUsername: true,
        chessComUsername: true,
        avatarUrl: true,
        currentStreak: true,
        country: true,
      },
    }),
    prisma.user.findMany({
      where: { longestStreak: { gt: 0 } },
      orderBy: { longestStreak: "desc" },
      take: 100,
      select: {
        id: true,
        lichessUsername: true,
        chessComUsername: true,
        avatarUrl: true,
        longestStreak: true,
        country: true,
      },
    }),
  ]);

  // Dense rank: tied values share the same rank
  function denseRank<T>(items: T[], getValue: (item: T) => number): number[] {
    const ranks: number[] = [];
    let rank = 0;
    let prevValue: number | null = null;
    for (const item of items) {
      const val = getValue(item);
      if (val !== prevValue) {
        rank++;
        prevValue = val;
      }
      ranks.push(rank);
    }
    return ranks;
  }

  const currentRanks = denseRank(currentTop, (u) => u.currentStreak);
  const current: LeaderboardEntry[] = currentTop.map((u, i) => ({
    rank: currentRanks[i],
    userId: u.id,
    displayName: displayName(u),
    avatarUrl: u.avatarUrl,
    streak: u.currentStreak,
    country: u.country,
  }));

  const allTimeRanks = denseRank(allTimeTop, (u) => u.longestStreak);
  const allTime: LeaderboardEntry[] = allTimeTop.map((u, i) => ({
    rank: allTimeRanks[i],
    userId: u.id,
    displayName: displayName(u),
    avatarUrl: u.avatarUrl,
    streak: u.longestStreak,
    country: u.country,
  }));

  return NextResponse.json({ current, allTime } satisfies StreakLeaderboardResponse, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
