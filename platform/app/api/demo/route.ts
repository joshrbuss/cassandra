import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEMO_USERNAME = "J_R_B_01";
const TACTIC_THEMES = ["fork", "pin", "backRankMate", "mateIn1"];

function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export async function GET() {
  try {
    // Find the demo user (case-insensitive match)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { chessComUsername: DEMO_USERNAME },
          { chessComUsername: DEMO_USERNAME.toLowerCase() },
          { lichessUsername: DEMO_USERNAME },
          { lichessUsername: DEMO_USERNAME.toLowerCase() },
        ],
      },
      select: { id: true, chessComUsername: true, lichessUsername: true },
    });

    if (!user) {
      console.warn("[demo] User not found:", DEMO_USERNAME);
      return NextResponse.json({ error: "Demo user not found" }, { status: 404 });
    }

    console.log("[demo] Found user:", user.id);

    let puzzle = null;

    // 1. Try to find the most-attempted puzzle with a tactic theme
    const attempts = await prisma.puzzleAttempt.findMany({
      where: {
        userId: user.id,
        tacticType: { in: TACTIC_THEMES },
      },
      orderBy: { attemptNumber: "desc" },
      take: 10,
      select: { puzzleId: true, tacticType: true, attemptNumber: true },
    });

    console.log("[demo] Found", attempts.length, "tactic attempts");

    for (const attempt of attempts) {
      const p = await prisma.puzzle.findFirst({
        where: { id: attempt.puzzleId, sourceUserId: user.id },
        select: {
          solvingFen: true, solutionMoves: true, themes: true,
          opponentUsername: true, moveNumber: true, playerColor: true,
        },
      });
      if (p) {
        puzzle = { ...p, tacticType: attempt.tacticType, attemptNumber: attempt.attemptNumber };
        break;
      }
    }

    // 2. Fallback: any puzzle with a tactic theme
    if (!puzzle) {
      for (const theme of TACTIC_THEMES) {
        const p = await prisma.puzzle.findFirst({
          where: { sourceUserId: user.id, themes: { contains: theme } },
          select: {
            solvingFen: true, solutionMoves: true, themes: true,
            opponentUsername: true, moveNumber: true, playerColor: true,
          },
        });
        if (p) {
          puzzle = { ...p, tacticType: theme, attemptNumber: 1 };
          console.log("[demo] Fallback: found puzzle with theme", theme);
          break;
        }
      }
    }

    // 3. Final fallback: ANY puzzle for this user
    if (!puzzle) {
      const p = await prisma.puzzle.findFirst({
        where: { sourceUserId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
          solvingFen: true, solutionMoves: true, themes: true,
          opponentUsername: true, moveNumber: true, playerColor: true,
        },
      });
      if (p) {
        const firstTheme = p.themes.split(" ").filter(Boolean)[0] ?? "tactic";
        puzzle = { ...p, tacticType: firstTheme, attemptNumber: 1 };
        console.log("[demo] Final fallback: any puzzle, theme:", firstTheme);
      }
    }

    if (!puzzle) {
      console.warn("[demo] No puzzles found for user:", user.id);
      return NextResponse.json({ error: "No puzzles found" }, { status: 404 });
    }

    console.log("[demo] Serving puzzle FEN:", puzzle.solvingFen.slice(0, 40), "...");

    // Count stats
    const [missedTactics, strongerMoves, retrograde] = await Promise.all([
      prisma.puzzle.count({ where: { sourceUserId: user.id } }),
      prisma.puzzleAttempt.count({ where: { userId: user.id, attemptNumber: { gt: 1 } } }),
      prisma.puzzle.count({ where: { sourceUserId: user.id, type: "retrograde" } }),
    ]);

    // Recent users with puzzles
    const recentUsersRaw = await prisma.user.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      where: { puzzles: { some: {} } },
      select: {
        chessComUsername: true,
        lichessUsername: true,
        createdAt: true,
        _count: { select: { puzzles: true } },
      },
    });

    const recentActivity = recentUsersRaw.map((u) => ({
      username: u.chessComUsername ?? u.lichessUsername ?? "anon",
      puzzleCount: u._count.puzzles,
      timeAgo: timeAgo(u.createdAt),
    }));

    const solution = puzzle.solutionMoves.split(" ")[0] ?? "";

    return NextResponse.json({
      fen: puzzle.solvingFen,
      solution,
      tacticType: puzzle.tacticType,
      opponentName: puzzle.opponentUsername ?? "Opponent",
      moveNumber: puzzle.moveNumber ?? 1,
      playerColor: puzzle.playerColor ?? "white",
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
