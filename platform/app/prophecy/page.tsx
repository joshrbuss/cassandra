import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import ProphecyShell from "./ProphecyShell";
import { getDailyProphecyPuzzle, todayUtcMidnight } from "@/lib/prophecy";

export const metadata = {
  title: "Cassandra's Prophecy — Daily Brilliant Puzzle",
  description: "Find the brilliant move that Cassandra saw. A new puzzle every day.",
};

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
  const existingAttempt = await prisma.puzzleAttempt.findFirst({
    where: {
      userId: session.userId,
      puzzleId: puzzle.id,
      createdAt: { gte: todayUtcMidnight() },
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
