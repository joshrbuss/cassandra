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
 * Picks today's prophecy puzzle deterministically, matched to user Elo.
 *
 * Pool: sacrifice-themed LibraryPuzzles with rating within ±200 of userElo.
 * Falls back to rating ≥ 1500 if the Elo-matched pool is empty.
 * Deterministic by day: dayIndex = floor(now / 86400000), skip(dayIndex % poolSize).
 */
async function getDailyProphecyPuzzle(userElo: number | null) {
  const elo = userElo ?? 1500;
  const ratingMin = elo - 200;
  const ratingMax = elo + 200;

  // Try Elo-matched pool first
  let where = { themes: { contains: "sacrifice" }, rating: { gte: ratingMin, lte: ratingMax } };
  let total = await prisma.libraryPuzzle.count({ where });
  console.log(`[prophecy] Sacrifice pool (rating ${ratingMin}-${ratingMax}): ${total}`);

  // Fallback: rating >= 1500 if Elo-matched pool is empty
  if (total === 0) {
    where = { themes: { contains: "sacrifice" }, rating: { gte: 1500, lte: 99999 } };
    total = await prisma.libraryPuzzle.count({ where });
    console.log(`[prophecy] Fallback pool (sacrifice ≥1500): ${total}`);
  }

  if (total === 0) {
    console.log("[prophecy] WARNING: 0 sacrifice puzzles in LibraryPuzzle table");
    return null;
  }

  const today = new Date();
  const dayIndex = Math.floor(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) / 86_400_000);
  const skipIdx = dayIndex % total;

  const puzzle = await prisma.libraryPuzzle.findFirst({
    where,
    orderBy: { id: "asc" },
    skip: skipIdx,
  });

  console.log(`[prophecy] userElo=${elo} day=${dayIndex} skip=${skipIdx}/${total} puzzle=${puzzle?.id ?? "null"} rating=${puzzle?.rating ?? "n/a"}`);
  return puzzle;
}

export default async function ProphecyPage() {
  const session = await auth();
  if (!session?.userId) redirect("/connect");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { elo: true },
  });

  const puzzle = await getDailyProphecyPuzzle(user?.elo ?? null);

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

  // Check if user already solved today's prophecy (UTC date-aware)
  const nowUtc = new Date();
  const todayUtcStart = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate()));
  const existingAttempt = await prisma.puzzleAttempt.findFirst({
    where: {
      userId: session.userId,
      puzzleId: puzzle.id,
      createdAt: { gte: todayUtcStart },
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
