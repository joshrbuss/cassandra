import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ScalesShell from "./ScalesShell";

export const metadata = {
  title: "The Scales — Rank the Top 3 Moves",
  description:
    "See a position, find the top 3 moves, and rank them from best to worst. The Scales trains the skill that separates good players from great ones.",
};

/**
 * Pick a random LibraryPuzzle for The Scales.
 * Excludes mateIn1 (trivial), prefers middlegame positions.
 * Uses the solvingFen (position after opponent's last move) as the position to evaluate.
 */
async function getScalesPuzzle(userElo: number | null) {
  const elo = userElo ?? 1200;
  const ratingMin = elo - 300;
  const ratingMax = elo + 300;

  // Exclude all mate-themed puzzles — The Scales needs positions with clear cp differences
  const EXCLUDED_THEMES = ["mateIn1", "mateIn2", "mateIn3", "mate", "backRankMate", "smotheredMate", "hookMate"];

  // Try middlegame positions in ELO range first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let where: any = {
    themes: { contains: "middlegame" },
    rating: { gte: ratingMin, lte: ratingMax },
    AND: EXCLUDED_THEMES.map((t) => ({ themes: { not: { contains: t } } })),
  };
  let total = await prisma.libraryPuzzle.count({ where });

  // Fallback: any non-mate in ELO range
  if (total === 0) {
    where = {
      rating: { gte: ratingMin, lte: ratingMax },
      AND: EXCLUDED_THEMES.map((t) => ({ themes: { not: { contains: t } } })),
    };
    total = await prisma.libraryPuzzle.count({ where });
  }

  // Fallback: any non-mate
  if (total === 0) {
    where = {
      AND: EXCLUDED_THEMES.map((t) => ({ themes: { not: { contains: t } } })),
    };
    total = await prisma.libraryPuzzle.count({ where });
  }

  if (total === 0) return null;

  const skip = Math.floor(Math.random() * total);
  return prisma.libraryPuzzle.findFirst({
    where,
    orderBy: { id: "asc" },
    skip,
    select: {
      id: true,
      solvingFen: true,
      rating: true,
      themes: true,
    },
  });
}

export default async function ScalesPage() {
  const session = await auth();
  if (!session?.userId) redirect("/connect");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { elo: true },
  });

  const puzzle = await getScalesPuzzle(user?.elo ?? null);

  if (!puzzle) {
    return (
      <main className="min-h-screen bg-[#0e0e0e] flex flex-col items-center justify-center px-4 text-center">
        <p className="text-[#c8942a] text-3xl mb-4">&#9878;</p>
        <h1 className="text-xl font-bold text-white mb-2">No Positions Available</h1>
        <p className="text-gray-500 text-sm mb-6">
          The Scales needs library puzzles to work. Try again later.
        </p>
      </main>
    );
  }

  return (
    <ScalesShell
      puzzleId={puzzle.id}
      fen={puzzle.solvingFen}
      rating={puzzle.rating}
    />
  );
}
