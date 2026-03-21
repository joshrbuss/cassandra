import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEMO_USERNAME = "J_R_B_01";

const PUZZLE_SELECT = {
  solvingFen: true,
  solutionMoves: true,
  themes: true,
  opponentUsername: true,
  moveNumber: true,
  playerColor: true,
  type: true,
} as const;

function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function serializePuzzle(p: {
  solvingFen: string;
  solutionMoves: string;
  themes: string;
  opponentUsername: string | null;
  moveNumber: number | null;
  playerColor: string | null;
  type: string;
}) {
  return {
    fen: p.solvingFen,
    solution: p.solutionMoves.split(" ")[0] ?? "",
    tacticType: p.themes.split(" ").filter(Boolean)[0] ?? p.type,
    opponentName: p.opponentUsername ?? "Opponent",
    moveNumber: p.moveNumber ?? 1,
    playerColor: p.playerColor ?? "white",
  };
}

export async function GET() {
  try {
    // Find the demo user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { chessComUsername: DEMO_USERNAME },
          { chessComUsername: DEMO_USERNAME.toLowerCase() },
          { lichessUsername: DEMO_USERNAME },
          { lichessUsername: DEMO_USERNAME.toLowerCase() },
        ],
      },
      select: { id: true },
    });

    if (!user) {
      console.warn("[demo] User not found:", DEMO_USERNAME);
      return NextResponse.json({ error: "Demo user not found" }, { status: 404 });
    }

    console.log("[demo] Found user:", user.id);

    // Fallback puzzle — any puzzle for this user
    const anyPuzzle = await prisma.puzzle.findFirst({
      where: { sourceUserId: user.id },
      orderBy: { createdAt: "desc" },
      select: PUZZLE_SELECT,
    });

    // 1. Missed tactics — standard puzzle (not retrograde/move_ranking)
    const tacticsPuzzleRaw = await prisma.puzzle.findFirst({
      where: {
        sourceUserId: user.id,
        type: "standard",
      },
      orderBy: { createdAt: "desc" },
      select: PUZZLE_SELECT,
    });
    console.log("[demo] tacticsPuzzle:", tacticsPuzzleRaw ? "found" : "null");

    // 2. Stronger moves — move_ranking (scales) puzzle
    const scalesPuzzleRaw = await prisma.puzzle.findFirst({
      where: {
        sourceUserId: user.id,
        type: "move_ranking",
      },
      orderBy: { createdAt: "desc" },
      select: PUZZLE_SELECT,
    });
    console.log("[demo] scalesPuzzle:", scalesPuzzleRaw ? "found" : "null");

    // 3. Positions to reconstruct — retrograde (echo) puzzle
    const echoPuzzleRaw = await prisma.puzzle.findFirst({
      where: {
        sourceUserId: user.id,
        type: "retrograde",
      },
      orderBy: { createdAt: "desc" },
      select: PUZZLE_SELECT,
    });
    console.log("[demo] echoPuzzle:", echoPuzzleRaw ? "found" : "null");

    // Use fallback for any null puzzles
    const fb = anyPuzzle;
    const tacticsPuzzle = tacticsPuzzleRaw ?? fb;
    const scalesPuzzle = scalesPuzzleRaw ?? fb;
    const echoPuzzle = echoPuzzleRaw ?? fb;

    if (!tacticsPuzzle) {
      console.warn("[demo] No puzzles at all for user:", user.id);
      return NextResponse.json({ error: "No puzzles found" }, { status: 404 });
    }

    // Count stats
    const [missedTactics, strongerMoves, retrograde] = await Promise.all([
      prisma.puzzle.count({ where: { sourceUserId: user.id } }),
      prisma.puzzleAttempt.count({ where: { userId: user.id, attemptNumber: { gt: 1 } } }),
      prisma.puzzle.count({ where: { sourceUserId: user.id, type: "retrograde" } }),
    ]);

    // Recent users with puzzles
    let recentActivity: { username: string; puzzleCount: number; timeAgo: string }[] = [];
    try {
      const recentUsersRaw = await prisma.user.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        where: { puzzles: { some: {} } },
        include: { _count: { select: { puzzles: true } } },
      });
      recentActivity = recentUsersRaw.map((u) => ({
        username: u.chessComUsername ?? u.lichessUsername ?? "anon",
        puzzleCount: u._count.puzzles,
        timeAgo: timeAgo(u.createdAt),
      }));
    } catch (err) {
      console.error("[demo] Recent users query failed:", err);
    }

    return NextResponse.json({
      tacticsPuzzle: serializePuzzle(tacticsPuzzle),
      scalesPuzzle: scalesPuzzle ? serializePuzzle(scalesPuzzle) : serializePuzzle(tacticsPuzzle),
      echoPuzzle: echoPuzzle ? serializePuzzle(echoPuzzle) : serializePuzzle(tacticsPuzzle),
      missedTactics,
      strongerMoves,
      retrograde: retrograde || 1,
      recentActivity,
    });
  } catch (error) {
    console.error("[demo] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
