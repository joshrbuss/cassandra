import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { anonDisplayName } from "@/lib/anonymous-id";
import { formatTime } from "@/lib/benchmarks";

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  solveTimeMs: number;
  formattedTime: string;
  isCurrentUser: boolean;
}

/**
 * GET /api/puzzles/[id]/leaderboard
 *
 * Returns the top 10 fastest successful solves for a puzzle.
 * Query param: ?userId=anon_xxxx — used to highlight the current user's entry.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUserId = new URL(req.url).searchParams.get("userId") ?? "";

  const puzzle = await prisma.puzzle.findUnique({ where: { id }, select: { id: true } });
  if (!puzzle) {
    return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
  }

  // Best time per user (avoid counting the same user multiple times)
  const rawRows = await prisma.puzzleAttempt.findMany({
    where: {
      puzzleId: id,
      success: true,
      solveTimeMs: { not: null },
    },
    orderBy: { solveTimeMs: "asc" },
    select: { userId: true, solveTimeMs: true },
  });

  // Deduplicate: keep best time per userId
  const bestPerUser = new Map<string, number>();
  for (const row of rawRows) {
    const key = row.userId ?? "anonymous";
    const prev = bestPerUser.get(key);
    if (prev === undefined || (row.solveTimeMs as number) < prev) {
      bestPerUser.set(key, row.solveTimeMs as number);
    }
  }

  const sorted = [...bestPerUser.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, 10);

  const entries: LeaderboardEntry[] = sorted.map(([userId, ms], idx) => ({
    rank: idx + 1,
    displayName: anonDisplayName(userId),
    solveTimeMs: ms,
    formattedTime: formatTime(ms),
    isCurrentUser: userId === currentUserId,
  }));

  return NextResponse.json({ entries });
}
