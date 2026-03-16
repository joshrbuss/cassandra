import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
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
 * Uses auth session to identify the current user (falls back to ?userId= query param).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Prefer session userId; fall back to query param for backwards compat
  const session = await auth();
  const currentUserId =
    session?.userId ??
    new URL(req.url).searchParams.get("userId") ??
    "";

  const puzzle = await prisma.puzzle.findUnique({ where: { id }, select: { id: true } });
  if (!puzzle) {
    // Also check library puzzles
    const libPuzzle = await prisma.libraryPuzzle.findUnique({ where: { id }, select: { id: true } });
    if (!libPuzzle) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }
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

  // Look up display names for real user IDs
  const userIds = [...bestPerUser.keys()].filter((id) => !id.startsWith("anon_") && id !== "anonymous");
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, lichessUsername: true, chessComUsername: true },
      })
    : [];
  const userNameMap = new Map(
    users.map((u) => [u.id, u.lichessUsername ?? u.chessComUsername ?? "Player"])
  );

  const sorted = [...bestPerUser.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, 10);

  const entries: LeaderboardEntry[] = sorted.map(([userId, ms], idx) => ({
    rank: idx + 1,
    displayName: userNameMap.get(userId) ?? `Guest #${userId.replace("anon_", "").slice(0, 4)}`,
    solveTimeMs: ms,
    formattedTime: formatTime(ms),
    isCurrentUser: userId === currentUserId,
  }));

  return NextResponse.json({ entries });
}
