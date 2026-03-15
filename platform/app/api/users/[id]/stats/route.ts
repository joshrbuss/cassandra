import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TACTICS, type Tactic } from "@/lib/tactics";

export interface TacticStat {
  tactic: Tactic;
  attempted: number;
  correct: number;
  accuracy: number; // 0–100
  avg_time_ms: number;
}

export interface UserStatsResponse {
  overall_accuracy: number;
  by_tactic: TacticStat[];
  weakest_tactic: Tactic | null; // lowest accuracy with >= 5 attempts
}

/**
 * GET /api/users/[id]/stats
 * Returns per-tactic accuracy and timing breakdown for the given userId.
 * [id] is the anonymous user ID stored in localStorage.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params;

  if (!userId) {
    return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
  }

  const attempts = await prisma.puzzleAttempt.findMany({
    where: { userId },
    select: { tacticType: true, success: true, solveTimeMs: true },
  });

  if (attempts.length === 0) {
    const response: UserStatsResponse = {
      overall_accuracy: 0,
      by_tactic: [],
      weakest_tactic: null,
    };
    return NextResponse.json(response);
  }

  // Overall accuracy
  const totalCorrect = attempts.filter((a) => a.success).length;
  const overall_accuracy = Math.round((totalCorrect / attempts.length) * 100);

  // Per-tactic aggregation
  const map = new Map<
    string,
    { attempted: number; correct: number; totalMs: number; countWithTime: number }
  >();

  for (const a of attempts) {
    const tactic = a.tacticType ?? "other";
    const existing = map.get(tactic) ?? { attempted: 0, correct: 0, totalMs: 0, countWithTime: 0 };
    existing.attempted += 1;
    if (a.success) existing.correct += 1;
    if (a.solveTimeMs != null) {
      existing.totalMs += a.solveTimeMs;
      existing.countWithTime += 1;
    }
    map.set(tactic, existing);
  }

  const by_tactic: TacticStat[] = [];
  for (const tactic of TACTICS) {
    const entry = map.get(tactic);
    if (!entry) continue;
    by_tactic.push({
      tactic,
      attempted: entry.attempted,
      correct: entry.correct,
      accuracy: Math.round((entry.correct / entry.attempted) * 100),
      avg_time_ms:
        entry.countWithTime > 0 ? Math.round(entry.totalMs / entry.countWithTime) : 0,
    });
  }

  // Sort by attempted desc so most-practiced shows first
  by_tactic.sort((a, b) => b.attempted - a.attempted);

  // Weakest: lowest accuracy with >= 5 attempts
  const qualified = by_tactic.filter((t) => t.attempted >= 5);
  const weakest = qualified.reduce(
    (min, t) => (min === null || t.accuracy < min.accuracy ? t : min),
    null as TacticStat | null
  );

  const response: UserStatsResponse = {
    overall_accuracy,
    by_tactic,
    weakest_tactic: weakest?.tactic ?? null,
  };

  return NextResponse.json(response);
}
