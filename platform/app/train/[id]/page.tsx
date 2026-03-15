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
    },
  });

  if (!puzzle) notFound();

  const solvingTurn = puzzle.solvingFen.split(" ")[1];
  const boardOrientation: "white" | "black" = solvingTurn === "w" ? "white" : "black";

  const stripeLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
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

        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Your puzzles
          </p>
          <h1 className="text-lg font-bold text-gray-900 mt-0.5">
            Find the best move
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {puzzle.source === "chesscom"
              ? "From your Chess.com games"
              : puzzle.source === "user_import"
              ? "From your Lichess games"
              : "From one of your own games"}
          </p>
        </div>

        {/* Board + solve logic (client component) */}
        <TrainPuzzleClient
          puzzleId={puzzle.id}
          solvingFen={puzzle.solvingFen}
          solutionMoves={puzzle.solutionMoves}
          boardOrientation={boardOrientation}
        />

        {/* Navigation — always visible below the board */}
        <div className="mt-6 flex items-center justify-between">
          <Link
            href="/train"
            className="inline-flex items-center gap-1 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors"
          >
            Next puzzle →
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-gray-400 hover:underline"
          >
            Done for now
          </Link>
        </div>
      </div>
    </main>
  );
}
