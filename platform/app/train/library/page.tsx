/**
 * /train/library — Picks a random library puzzle at the user's ELO and redirects.
 *
 * Used as the fallback destination when personal puzzle import finds nothing,
 * and as the "Next puzzle" target from library puzzle pages.
 */

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";

export default async function LibraryIndexPage() {
  const session = await auth();
  if (!session?.userId) redirect("/onboarding");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { normalizedElo: true },
  });

  const userElo = user?.normalizedElo ?? 1000;
  const eloMin = userElo - 150;
  const eloMax = userElo + 150;

  // Try ELO-matched puzzle first
  const matchedCount = await prisma.libraryPuzzle.count({
    where: { rating: { gte: eloMin, lte: eloMax } },
  });

  if (matchedCount > 0) {
    const skip = Math.floor(Math.random() * matchedCount);
    const puzzle = await prisma.libraryPuzzle.findFirst({
      where: { rating: { gte: eloMin, lte: eloMax } },
      select: { id: true },
      skip,
    });
    if (puzzle) redirect(`/train/library/${puzzle.id}`);
  }

  // Fallback: any library puzzle
  const totalCount = await prisma.libraryPuzzle.count();
  if (totalCount > 0) {
    const skip = Math.floor(Math.random() * totalCount);
    const puzzle = await prisma.libraryPuzzle.findFirst({
      select: { id: true },
      skip,
    });
    if (puzzle) redirect(`/train/library/${puzzle.id}`);
  }

  notFound();
}
