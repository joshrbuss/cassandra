import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import BrilliantPuzzleShell from "@/components/puzzles/BrilliantPuzzleShell";

export const metadata: Metadata = {
  title: "Brilliant Puzzle of the Day",
  description: "Find the computer-class brilliant move. A new puzzle every day.",
};

/**
 * Picks a deterministic "puzzle of the day" by using the day number (days since
 * Unix epoch) as an index into the sorted list of brilliant puzzles.
 * All users see the same puzzle on a given UTC day; it rotates daily.
 */
async function getDailyBrilliantPuzzle() {
  const total = await prisma.puzzle.count({ where: { subtype: "brilliant" } });
  if (total === 0) return null;

  const dayNumber = Math.floor(Date.now() / 86_400_000); // UTC days since epoch
  const skipIdx = dayNumber % total;

  return prisma.puzzle.findFirst({
    where: { subtype: "brilliant" },
    orderBy: { id: "asc" }, // deterministic ordering
    skip: skipIdx,
  });
}

export default async function BrilliantPuzzlePage() {
  const puzzle = await getDailyBrilliantPuzzle();

  if (!puzzle) {
    return (
      <main className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center px-4 text-center">
        <span className="text-5xl mb-4">💎</span>
        <h1 className="text-2xl font-bold text-white mb-2">Coming Soon</h1>
        <p className="text-zinc-400 text-sm mb-6">
          Brilliant puzzles are loaded when the database is enriched.
          <br />
          Run <code className="text-cyan-400">npm run db:tag-brilliant</code> after seeding.
        </p>
        <Link
          href="/puzzles"
          className="text-sm text-cyan-400 hover:text-cyan-300 underline"
        >
          ← Browse all puzzles
        </Link>
      </main>
    );
  }

  return <BrilliantPuzzleShell puzzle={puzzle} />;
}
