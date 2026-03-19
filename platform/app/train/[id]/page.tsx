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
import { cookies } from "next/headers";
import TrainPuzzleClient from "./TrainPuzzleClient";
import { getT, resolveLocale, LOCALE_COOKIE, preloadLocale } from "@/lib/i18n";

export const metadata = {
  title: "Train — Cassandra Chess",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TrainPuzzlePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.userId) redirect("/connect");

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

  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  await preloadLocale(locale);
  const t = getT(locale);
  const stripeLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
  const paidUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isPaid: true },
  });

  return (
    <main className="min-h-screen bg-white">
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
        stripeLink={paidUser?.isPaid ? null : (stripeLink ?? null)}
        footerText={t("dashboard.footer")}
      />
    </main>
  );
}
