import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEMO_USERNAME = "J_R_B_01";
const TACTIC_THEMES = ["fork", "pin", "backRankMate", "mateIn1"];

export async function GET() {
  try {
    // Find the demo user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { chessComUsername: DEMO_USERNAME },
          { lichessUsername: DEMO_USERNAME },
        ],
      },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Demo user not found" }, { status: 404 });
    }

    // Find the most-attempted puzzle with a tactic theme
    // Join through PuzzleAttempt to get attemptNumber
    const attempts = await prisma.puzzleAttempt.findMany({
      where: {
        userId: user.id,
        tacticType: { in: TACTIC_THEMES },
      },
      orderBy: { attemptNumber: "desc" },
      take: 10,
      select: { puzzleId: true, tacticType: true, attemptNumber: true },
    });

    let puzzle = null;

    // Try to find a matching user-imported puzzle from the attempts
    for (const attempt of attempts) {
      const p = await prisma.puzzle.findFirst({
        where: {
          id: attempt.puzzleId,
          sourceUserId: user.id,
          source: "user_import",
        },
        select: {
          solvingFen: true,
          solutionMoves: true,
          themes: true,
          opponentUsername: true,
          moveNumber: true,
          playerColor: true,
        },
      });
      if (p) {
        puzzle = { ...p, tacticType: attempt.tacticType, attemptNumber: attempt.attemptNumber };
        break;
      }
    }

    // Fallback: any user puzzle with a tactic theme
    if (!puzzle) {
      const p = await prisma.puzzle.findFirst({
        where: {
          sourceUserId: user.id,
          source: "user_import",
          themes: { contains: "fork" },
        },
        select: {
          solvingFen: true,
          solutionMoves: true,
          themes: true,
          opponentUsername: true,
          moveNumber: true,
          playerColor: true,
        },
      });
      if (p) {
        puzzle = { ...p, tacticType: "fork", attemptNumber: 1 };
      }
    }

    // Last fallback: any user puzzle
    if (!puzzle) {
      const p = await prisma.puzzle.findFirst({
        where: {
          sourceUserId: user.id,
          source: "user_import",
        },
        select: {
          solvingFen: true,
          solutionMoves: true,
          themes: true,
          opponentUsername: true,
          moveNumber: true,
          playerColor: true,
        },
      });
      if (p) {
        const firstTheme = p.themes.split(" ").find((t) => TACTIC_THEMES.includes(t)) ?? p.themes.split(" ")[0] ?? "tactic";
        puzzle = { ...p, tacticType: firstTheme, attemptNumber: 1 };
      }
    }

    if (!puzzle) {
      return NextResponse.json({ error: "No puzzles found" }, { status: 404 });
    }

    // Count stats
    const [missedTactics, strongerMoves, retrograde] = await Promise.all([
      prisma.puzzle.count({
        where: { sourceUserId: user.id, source: "user_import" },
      }),
      prisma.puzzleAttempt.count({
        where: { userId: user.id, attemptNumber: { gt: 1 } },
      }),
      prisma.puzzle.count({
        where: { sourceUserId: user.id, type: "retrograde" },
      }),
    ]);

    // First solution move is the correct move
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
    });
  } catch (error) {
    console.error("[demo] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
