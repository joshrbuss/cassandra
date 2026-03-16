/**
 * /train — Training mode home.
 *
 * If the user has personal puzzles: redirects to a random one.
 * If no personal puzzles: shows import triggers for each connected platform.
 *   - Lichess: fast server-side import (eval annotations, no engine needed)
 *   - Chess.com: client-side WASM analysis (Stockfish depth 8 in the browser)
 * If no platforms connected at all: redirects straight to library puzzles.
 * Requires auth — redirects to /onboarding if not signed in.
 */

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import TrainImportTrigger from "./TrainImportTrigger";
import ChessComImporter from "./ChessComImporter";

export const metadata = {
  title: "Train — Cassandra Chess",
};

export default async function TrainPage() {
  const session = await auth();
  if (!session?.userId) redirect("/connect");

  const count = await prisma.puzzle.count({
    where: { sourceUserId: session.userId, source: "user_import" },
  });

  if (count > 0) {
    const skip = Math.floor(Math.random() * count);
    const puzzle = await prisma.puzzle.findFirst({
      where: { sourceUserId: session.userId, source: "user_import" },
      select: { id: true },
      skip,
    });
    if (puzzle) redirect(`/train/${puzzle.id}`);
  }

  // Fetch user profile (platforms connected)
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { lichessUsername: true, chessComUsername: true },
  });

  const hasLichess = !!user?.lichessUsername;
  const hasChessCom = !!user?.chessComUsername;

  // No platforms connected — go straight to library puzzles
  if (!hasLichess && !hasChessCom) {
    redirect("/train/library");
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-4">♟</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Analyse your games
        </h1>
        <p className="text-gray-500 mb-8">
          We&apos;ll find positions where you missed the best move and turn them
          into puzzles.
        </p>

        <div className="space-y-4 text-left">
          {hasLichess && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-bold">
                  L
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Lichess</p>
                  <p className="text-xs text-gray-400">
                    Fast — uses saved engine evals
                  </p>
                </div>
              </div>
              <TrainImportTrigger />
            </div>
          )}

          {hasChessCom && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">
                  C
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Chess.com
                  </p>
                  <p className="text-xs text-gray-400">
                    Runs engine in browser (~2–4 min)
                  </p>
                </div>
              </div>
              <ChessComImporter chessComUsername={user!.chessComUsername!} />
            </div>
          )}
        </div>

        <div className="mt-8 space-y-2">
          <Link
            href="/train/library"
            className="block text-sm text-blue-600 hover:underline"
          >
            Skip — try a curated puzzle instead →
          </Link>
          <Link href="/home" className="block text-sm text-gray-400 hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
