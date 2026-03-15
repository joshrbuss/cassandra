/**
 * /train — Training mode home.
 *
 * If the user has personal puzzles: redirects to a random one.
 * If no puzzles yet: shows import triggers for each connected platform.
 *   - Lichess: fast server-side import (eval annotations, no engine needed)
 *   - Chess.com: client-side WASM analysis (Stockfish depth 8 in the browser)
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
  if (!session?.userId) redirect("/onboarding");

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

  // Fetch which platforms the user has connected
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { lichessUsername: true, chessComUsername: true },
  });

  const hasLichess = !!user?.lichessUsername;
  const hasChessCom = !!user?.chessComUsername;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-4">♟</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Getting your puzzles ready
        </h1>
        <p className="text-gray-500 mb-8">
          We&apos;ll analyse your recent games to find the positions where you
          need practice most.
        </p>

        <div className="space-y-4">
          {hasLichess && (
            <div className="text-left">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Lichess — fast (uses saved evals)
              </p>
              <TrainImportTrigger />
            </div>
          )}

          {hasChessCom && (
            <div className="text-left">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Chess.com — runs engine in browser (~2–4 min)
              </p>
              <ChessComImporter chessComUsername={user!.chessComUsername!} />
            </div>
          )}

          {!hasLichess && !hasChessCom && (
            <p className="text-sm text-gray-500">
              No accounts connected.{" "}
              <Link href="/settings" className="text-blue-600 hover:underline">
                Add an account →
              </Link>
            </p>
          )}
        </div>

        <div className="mt-8">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
