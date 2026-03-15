import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  streak: number;
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
      },
    }),
  ]);

  const current: LeaderboardEntry[] = currentTop.map((u, i) => ({
    rank: i + 1,
    userId: u.id,
    displayName: displayName(u),
    avatarUrl: u.avatarUrl,
    streak: u.currentStreak,
  }));

  const allTime: LeaderboardEntry[] = allTimeTop.map((u, i) => ({
    rank: i + 1,
    userId: u.id,
    displayName: displayName(u),
    avatarUrl: u.avatarUrl,
    streak: u.longestStreak,
  }));

  return NextResponse.json({ current, allTime } satisfies StreakLeaderboardResponse, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
