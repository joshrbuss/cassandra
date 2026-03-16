/**
 * /train/[id] — Personal puzzle training page.
 *
 * Shows one of the user's own imported puzzles in standard solve mode.
 * After solving, the user clicks "Next puzzle →" to load another.
 * Requires auth — only shows the current user's private puzzles.
 */

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import TrainPuzzleClient from "./TrainPuzzleClient";

export const metadata = {
  title: "Train — Cassandra Chess",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TrainPuzzlePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.userId) redirect("/onboarding");

  const { id } = await params;

  const puzzle = await prisma.puzzle.findFirst({
    where: {
      id,
      sourceUserId: session.userId,
      source: "user_import",
    },
    select: {
      id: true,
      solvingFen: true,
      solutionMoves: true,
      themes: true,
      rating: true,
      source: true,
      gameUrl: true,
      opponentUsername: true,
      gameDate: true,
      gameResult: true,
      moveNumber: true,
      evalCp: true,
      playerColor: true,
    },
  });

  if (!puzzle) notFound();

  const stripeLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  return (
    <main className="min-h-screen bg-white px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Top nav */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-700">
            ← Dashboard
          </Link>
          {stripeLink && (
            <a
              href={stripeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-full hover:bg-purple-100 transition-colors"
            >
              ✨ Go ad-free
            </a>
          )}
        </div>

        <TrainPuzzleClient
          puzzleId={puzzle.id}
          solvingFen={puzzle.solvingFen}
          solutionMoves={puzzle.solutionMoves}
          opponentUsername={puzzle.opponentUsername}
          gameDate={puzzle.gameDate}
          gameResult={puzzle.gameResult}
          moveNumber={puzzle.moveNumber}
          evalCp={puzzle.evalCp}
          playerColor={puzzle.playerColor}
          gameUrl={puzzle.gameUrl}
        />

        {/* Footer */}
        <footer className="mt-10 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Cassandra Chess · Puzzles sourced from the Lichess open database (CC0)
          </p>
        </footer>
      </div>
    </main>
  );
}
