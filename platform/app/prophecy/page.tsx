import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import ProphecyShell from "./ProphecyShell";

export const metadata = {
  title: "Cassandra's Prophecy — Daily Brilliant Puzzle",
  description: "Find the brilliant move that Cassandra saw. A new puzzle every day.",
};

/**
 * Picks today's brilliant puzzle deterministically from LibraryPuzzle
 * using day-of-year as seed. All users see the same puzzle on a given UTC day.
 *
 * Lichess themes don't include "brilliantMove" — we use "sacrifice" (the real
 * Lichess tag) with a rating floor of 1800 to surface impressive puzzles.
 */
async function getDailyProphecyPuzzle() {
  // Lichess uses "sacrifice" — not "brilliantMove" — as the theme tag
  const total = await prisma.libraryPuzzle.count({
    where: { themes: { contains: "sacrifice" }, rating: { gte: 1800 } },
  });
  console.log(`[prophecy] Brilliant (sacrifice ≥1800) puzzle pool: ${total}`);

  if (total === 0) {
    console.log("[prophecy] WARNING: 0 sacrifice puzzles with rating >= 1800 in LibraryPuzzle table");
    return null;
  }

  const dayNumber = Math.floor(Date.now() / 86_400_000);
  const skipIdx = dayNumber % total;

  const puzzle = await prisma.libraryPuzzle.findFirst({
    where: { themes: { contains: "sacrifice" }, rating: { gte: 1800 } },
    orderBy: { id: "asc" },
    skip: skipIdx,
  });

  console.log(`[prophecy] Day ${dayNumber}, index ${skipIdx}/${total}, puzzle=${puzzle?.id ?? "null"}, rating=${puzzle?.rating ?? "n/a"}`);
  return puzzle;
}

export default async function ProphecyPage() {
  const session = await auth();
  if (!session?.userId) redirect("/connect");

  const puzzle = await getDailyProphecyPuzzle();

  if (!puzzle) {
    return (
      <main className="min-h-screen bg-[#0e0e0e] flex flex-col items-center justify-center px-4 text-center">
        <p className="text-[#c8942a] text-3xl mb-4">&#9733;</p>
        <h1 className="text-xl font-bold text-white mb-2">No Prophecy Today</h1>
        <p className="text-gray-500 text-sm mb-6">
          No brilliant puzzles are loaded yet.
        </p>
        <Link href="/home" className="text-sm text-[#c8942a] hover:underline">
          &larr; Back to home
        </Link>
      </main>
    );
  }

  // Check if user already solved today's prophecy
  const todayStr = new Date().toISOString().split("T")[0];
  const existingAttempt = await prisma.puzzleAttempt.findFirst({
    where: {
      userId: session.userId,
      puzzleId: puzzle.id,
      createdAt: { gte: new Date(todayStr) },
    },
    select: { success: true, solveTimeMs: true },
  });

  return (
    <ProphecyShell
      puzzleId={puzzle.id}
      solvingFen={puzzle.solvingFen}
      solutionMoves={puzzle.solutionMoves}
      themes={puzzle.themes}
      rating={puzzle.rating}
      alreadySolved={!!existingAttempt}
      alreadySolvedSuccess={existingAttempt?.success ?? false}
    />
  );
}
