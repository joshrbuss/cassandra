/**
 * /unlearned — The Unlearned: picks a random unsolved personal puzzle.
 *
 * Priority:
 *   1. Random unsolved personal puzzle (no successful attempt)
 *   2. Random previously failed puzzle (has attempts but none successful)
 *   3. Any random personal puzzle (all solved — let user re-do)
 * If no personal puzzles at all: redirects to /home
 */

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const metadata = {
  title: "The Unlearned — Cassandra Chess",
};

export default async function UnlearnedPage() {
  const session = await auth();
  if (!session?.userId) redirect("/connect");

  // Get all personal puzzle IDs
  const allPuzzles = await prisma.puzzle.findMany({
    where: { sourceUserId: session.userId, source: "user_import" },
    select: { id: true },
  });

  if (allPuzzles.length === 0) {
    redirect("/home");
  }

  const allIds = allPuzzles.map((p) => p.id);

  // Get IDs of puzzles the user has solved successfully
  const solvedAttempts = await prisma.puzzleAttempt.findMany({
    where: {
      userId: session.userId,
      puzzleId: { in: allIds },
      success: true,
    },
    select: { puzzleId: true },
    distinct: ["puzzleId"],
  });
  const solvedIds = new Set(solvedAttempts.map((a) => a.puzzleId));

  // 1. Try unsolved puzzles
  const unsolved = allIds.filter((id) => !solvedIds.has(id));
  if (unsolved.length > 0) {
    const pick = unsolved[Math.floor(Math.random() * unsolved.length)];
    redirect(`/unlearned/${pick}`);
  }

  // 2. Try previously failed puzzles (attempted but not solved)
  const failedAttempts = await prisma.puzzleAttempt.findMany({
    where: {
      userId: session.userId,
      puzzleId: { in: allIds },
      success: false,
    },
    select: { puzzleId: true },
    distinct: ["puzzleId"],
  });
  const failedIds = failedAttempts
    .map((a) => a.puzzleId)
    .filter((id) => !solvedIds.has(id));

  if (failedIds.length > 0) {
    const pick = failedIds[Math.floor(Math.random() * failedIds.length)];
    redirect(`/unlearned/${pick}`);
  }

  // 3. Fallback: any random personal puzzle (all solved)
  const pick = allIds[Math.floor(Math.random() * allIds.length)];
  redirect(`/unlearned/${pick}`);
}
