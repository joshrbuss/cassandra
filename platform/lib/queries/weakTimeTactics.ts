import { prisma } from "@/lib/prisma";
import type { Tactic } from "@/lib/tactics";

export interface SlowTactic {
  tactic: Tactic;
  userAvg: number;  // ms
  globalAvg: number; // ms
}

/**
 * Returns up to 3 tactics where the user's average solve time exceeds 2× the
 * global average for that tactic. Only considers tactics with ≥3 user attempts.
 */
export async function getSlowTactics(userId: string): Promise<SlowTactic[]> {
  // User averages per tacticType
  const userGroups = await prisma.puzzleAttempt.groupBy({
    by: ["tacticType"],
    where: {
      userId,
      tacticType: { not: null },
      solveTimeMs: { not: null },
    },
    _avg: { solveTimeMs: true },
    _count: { _all: true },
  });

  // Require at least 3 attempts per tactic
  const qualified = userGroups.filter(
    (g) => g._count._all >= 3 && g._avg.solveTimeMs !== null
  );
  if (qualified.length === 0) return [];

  // Global averages for those same tactics
  const tacticTypes = qualified.map((g) => g.tacticType as string);
  const globalGroups = await prisma.puzzleAttempt.groupBy({
    by: ["tacticType"],
    where: {
      tacticType: { in: tacticTypes },
      solveTimeMs: { not: null },
    },
    _avg: { solveTimeMs: true },
  });

  const globalMap = new Map(
    globalGroups.map((g) => [g.tacticType, g._avg.solveTimeMs ?? 0])
  );

  // Filter for slow tactics (user > 2× global)
  const slow: SlowTactic[] = qualified
    .filter((g) => {
      const gAvg = globalMap.get(g.tacticType!) ?? 0;
      return gAvg > 0 && (g._avg.solveTimeMs ?? 0) > 2 * gAvg;
    })
    .map((g) => ({
      tactic: g.tacticType as Tactic,
      userAvg: Math.round(g._avg.solveTimeMs ?? 0),
      globalAvg: Math.round(globalMap.get(g.tacticType!) ?? 0),
    }))
    .sort((a, b) => b.userAvg / b.globalAvg - a.userAvg / a.globalAvg);

  return slow.slice(0, 3);
}

/**
 * Returns the global average solve time (ms) for a given tacticType.
 * Returns null if there are fewer than 10 attempts (not enough signal).
 */
export async function getGlobalAvgForTactic(
  tacticType: string | null
): Promise<number | null> {
  if (!tacticType) return null;

  const result = await prisma.puzzleAttempt.aggregate({
    where: {
      tacticType,
      solveTimeMs: { not: null },
    },
    _avg: { solveTimeMs: true },
    _count: { _all: true },
  });

  if (result._count._all < 10) return null;
  return result._avg.solveTimeMs;
}
