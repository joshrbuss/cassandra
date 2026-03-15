import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/puzzles/opponent-prediction
 *
 * Returns a random opponent-prediction puzzle.
 * Optional query params:
 *   ?exclude=id1,id2  — skip recently seen puzzle IDs
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const exclude = searchParams
    .get("exclude")
    ?.split(",")
    .filter(Boolean) ?? [];

  const puzzles = await prisma.puzzle.findMany({
    where: {
      type: "opponent_prediction",
      id: exclude.length ? { notIn: exclude } : undefined,
    },
    select: { id: true },
  });

  if (puzzles.length === 0) {
    return NextResponse.json(
      { error: "No opponent prediction puzzles found" },
      { status: 404 }
    );
  }

  const random = puzzles[Math.floor(Math.random() * puzzles.length)];
  const puzzle = await prisma.puzzle.findUnique({ where: { id: random.id } });

  return NextResponse.json(puzzle);
}
