/**
 * /unlearned/library/[id] — Library puzzle page.
 *
 * Serves a curated Lichess puzzle filtered to the user's ELO band.
 * Shown when the user has no personal puzzles yet.
 */

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import TrainPuzzleClient from "../../[id]/TrainPuzzleClient";
import AdSlot from "@/components/AdSlot";

export const metadata = {
  title: "The Unlearned — Cassandra Chess",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LibraryPuzzlePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.userId) redirect("/connect");

  const { id } = await params;

  const puzzle = await prisma.libraryPuzzle.findUnique({
    where: { id },
    select: {
      id: true,
      solvingFen: true,
      solutionMoves: true,
      rating: true,
      themes: true,
      gameUrl: true,
    },
  });

  if (!puzzle) notFound();

  const solvingTurn = puzzle.solvingFen.split(" ")[1];
  const boardOrientation: "white" | "black" = solvingTurn === "w" ? "white" : "black";

  const stripeLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
  const paidUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isPaid: true },
  });

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/home" className="text-sm text-blue-600 hover:underline">
            &larr; Dashboard
          </Link>
          {stripeLink && !paidUser?.isPaid && (
            <a
              href={stripeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-full hover:bg-purple-100 transition-colors"
            >
              Go ad-free
            </a>
          )}
        </div>

        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Curated for your level
          </p>
          <h1 className="text-lg font-bold text-gray-900 mt-0.5">
            Find the best move
          </h1>
          {puzzle.gameUrl ? (
            <a
              href={puzzle.gameUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline mt-0.5 inline-block"
            >
              View original game &rarr;
            </a>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">
              From the Lichess puzzle library
            </p>
          )}
        </div>

        <TrainPuzzleClient
          puzzleId={puzzle.id}
          solvingFen={puzzle.solvingFen}
          solutionMoves={puzzle.solutionMoves}
        />

        <div className="mt-4">
          <AdSlot slot="1234567890" isPaid={!!paidUser?.isPaid} />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Link
            href="/unlearned/library"
            className="inline-flex items-center gap-1 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors"
          >
            Next puzzle &rarr;
          </Link>
          <Link href="/home" className="text-sm text-gray-400 hover:underline">
            Done for now
          </Link>
        </div>
      </div>
    </main>
  );
}
