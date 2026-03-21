import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEMO_USERNAME = "J_R_B_01";

const PUZZLE_SELECT = {
  id: true,
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
  id: string;
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

    // Debug: log all puzzle types for this user
    const typeCounts = await prisma.puzzle.groupBy({
      by: ["type"],
      where: { sourceUserId: user.id },
      _count: true,
    });
    console.log("[demo] puzzle types in DB:", JSON.stringify(typeCounts));

    // Fetch 3 different puzzles regardless of type
    const puzzles = await prisma.puzzle.findMany({
      where: { sourceUserId: user.id },
      take: 3,
      orderBy: { createdAt: "desc" },
      select: PUZZLE_SELECT,
    });
    console.log("[demo] Fetched", puzzles.length, "puzzles");

    if (puzzles.length === 0) {
      console.warn("[demo] No puzzles at all for user:", user.id);
      return NextResponse.json({ error: "No puzzles found" }, { status: 404 });
    }

    const tacticsPuzzle = puzzles[0];
    const scalesPuzzle = puzzles[1] ?? puzzles[0];
    const echoPuzzle = puzzles[2] ?? puzzles[1] ?? puzzles[0];

    // Log each FEN to verify they're different
    console.log("[demo] tacticsPuzzle FEN:", tacticsPuzzle.solvingFen.slice(0, 40));
    console.log("[demo] scalesPuzzle FEN:", scalesPuzzle.solvingFen.slice(0, 40));
    console.log("[demo] echoPuzzle FEN:", echoPuzzle.solvingFen.slice(0, 40));

    // Count stats
    const [missedTactics, strongerMoves, retrograde] = await Promise.all([
      prisma.puzzle.count({ where: { sourceUserId: user.id } }),
      prisma.puzzleAttempt.count({ where: { userId: user.id, attemptNumber: { gt: 1 } } }),
      prisma.puzzle.count({ where: { sourceUserId: user.id, type: "retrograde" } }),
    ]);

    // Recent users
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
      scalesPuzzle: serializePuzzle(scalesPuzzle),
      echoPuzzle: serializePuzzle(echoPuzzle),
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
