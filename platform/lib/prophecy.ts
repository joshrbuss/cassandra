import { prisma } from "@/lib/prisma";

/**
 * Returns the UTC start of today as a Date object.
 */
export function todayUtcMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Returns the UTC dayIndex (consistent across timezones).
 */
export function utcDayIndex(): number {
  const now = new Date();
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86_400_000);
}

/**
 * Picks today's prophecy puzzle deterministically, matched to user Elo.
 */
export async function getDailyProphecyPuzzle(userElo: number | null) {
  const elo = userElo ?? 1500;
  const ratingMin = elo - 200;
  const ratingMax = elo + 200;

  // Try Elo-matched pool first
  let where = { themes: { contains: "sacrifice" }, rating: { gte: ratingMin, lte: ratingMax } };
  let total = await prisma.libraryPuzzle.count({ where });

  // Fallback: rating >= 1500 if Elo-matched pool is empty
  if (total === 0) {
    where = { themes: { contains: "sacrifice" }, rating: { gte: 1500, lte: 99999 } };
    total = await prisma.libraryPuzzle.count({ where });
  }

  if (total === 0) return null;

  const dayIndex = utcDayIndex();
  const skipIdx = dayIndex % total;

  return prisma.libraryPuzzle.findFirst({
    where,
    orderBy: { id: "asc" },
    skip: skipIdx,
  });
}

/**
 * Checks if the user has completed today's prophecy puzzle.
 */
export async function hasCompletedProphecyToday(userId: string, userElo: number | null): Promise<boolean> {
  const puzzle = await getDailyProphecyPuzzle(userElo);
  if (!puzzle) return false;

  const attempt = await prisma.puzzleAttempt.findFirst({
    where: {
      userId,
      puzzleId: puzzle.id,
      createdAt: { gte: todayUtcMidnight() },
    },
    select: { id: true },
  });

  return !!attempt;
}
