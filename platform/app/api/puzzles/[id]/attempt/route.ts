import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { percentileToBucket, type PercentileBucket } from "@/lib/benchmarks";
import { primaryTactic } from "@/lib/tactics";
import { getGlobalAvgForTactic } from "@/lib/queries/weakTimeTactics";

export interface AttemptRequest {
  solveTimeMs: number;
  success: boolean;
}

export interface AttemptResponse {
  recorded: true;
  solveTimeMs: number;
  percentile: number; // 0–100, where 100 = faster than everyone
  bucket: PercentileBucket;
  avgSolveMs: number | null; // null if fewer than 3 prior attempts
  top10PctMs: number | null; // threshold to be in top 10%
  totalAttempts: number;
  /** The resolved userId from the session */
  userId: string | null;
  /** True when solve time exceeded 2× the global average for this tactic */
  timeout_blunder?: boolean;
}

/**
 * POST /api/puzzles/[id]/attempt
 *
 * Records a puzzle attempt and returns percentile stats.
 * Uses the auth() wrapper pattern so the session is reliably available
 * via req.auth — this works on Vercel where bare auth() can miss cookies.
 *
 * Body: { solveTimeMs: number; success: boolean }
 */
export const POST = auth(async function POST(req, ctx) {
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const body: AttemptRequest = await req.json().catch(() => null);
  if (!body || typeof body.solveTimeMs !== "number" || typeof body.success !== "boolean") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Session is populated by the auth() wrapper — reliable on Vercel
  const session = req.auth;
  const resolvedUserId = session?.userId ?? null;

  // Debug logging — helps diagnose auth issues on Vercel
  console.log(
    `[attempt:auth] hasSession=${!!session} userId=${resolvedUserId} cookie=${req.headers.get("cookie")?.slice(0, 120) ?? "none"}`
  );

  // Look up puzzle — check both personal Puzzle and LibraryPuzzle tables
  let themes = "tactics";
  const puzzle = await prisma.puzzle.findUnique({ where: { id }, select: { id: true, themes: true } });
  if (puzzle) {
    themes = puzzle.themes;
  } else {
    const libPuzzle = await prisma.libraryPuzzle.findUnique({ where: { id }, select: { id: true, themes: true } });
    if (!libPuzzle) {
      console.warn(`[attempt] puzzle not found: ${id}`);
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }
    themes = libPuzzle.themes;
  }

  const tacticType = primaryTactic(themes);

  // Timeout blunder: if solve time > 2× global avg for this tactic, mark as failure
  const globalAvg = await getGlobalAvgForTactic(tacticType);
  const isTimeoutBlunder =
    globalAvg !== null && body.solveTimeMs > 2 * globalAvg && body.success;
  const recordedSuccess = isTimeoutBlunder ? false : body.success;

  // Record the attempt
  console.log(`[attempt] puzzleId=${id} userId=${resolvedUserId} success=${recordedSuccess} solveTimeMs=${body.solveTimeMs} tactic=${tacticType}`);
  let attempt;
  try {
    attempt = await prisma.puzzleAttempt.create({
      data: {
        puzzleId: id,
        userId: resolvedUserId,
        solveTimeMs: body.solveTimeMs,
        success: recordedSuccess,
        tacticType,
      },
    });
    console.log(`[attempt] ✓ saved id=${attempt.id}`);
  } catch (err) {
    console.error(`[attempt] ✗ failed to save:`, err);
    return NextResponse.json({ error: "Failed to record attempt" }, { status: 500 });
  }

  // Update streak for authenticated users on successful solve
  if (recordedSuccess && resolvedUserId) {
    console.log(`[streak] updating for userId=${resolvedUserId}`);
    await updateStreak(resolvedUserId);
  }

  // Increment site-wide counter on recorded success
  if (recordedSuccess) {
    await prisma.siteStats.upsert({
      where: { id: 1 },
      create: { id: 1, totalPuzzlesSolved: BigInt(1) },
      update: { totalPuzzlesSolved: { increment: BigInt(1) } },
    });
  }

  // Compute percentile from all successful attempts for this puzzle
  const priorAttempts = await prisma.puzzleAttempt.findMany({
    where: {
      puzzleId: id,
      success: true,
      solveTimeMs: { not: null },
    },
    select: { solveTimeMs: true },
    orderBy: { solveTimeMs: "asc" },
  });

  const times = priorAttempts
    .map((a) => a.solveTimeMs as number)
    .filter((t) => t > 0)
    .sort((a, b) => a - b);

  const totalAttempts = times.length;

  let percentile = 50;
  let avgSolveMs: number | null = null;
  let top10PctMs: number | null = null;

  if (totalAttempts >= 3) {
    // Percentile = fraction of times that are WORSE (slower) than the user's
    const betterThan = times.filter((t) => t > body.solveTimeMs).length;
    percentile = Math.round((betterThan / totalAttempts) * 100);

    avgSolveMs = Math.round(times.reduce((a, b) => a + b, 0) / totalAttempts);

    // Top 10% threshold = the time at the 10th percentile (fastest 10%)
    const top10Idx = Math.max(0, Math.floor(totalAttempts * 0.1) - 1);
    top10PctMs = times[top10Idx] ?? times[0];
  }

  const response: AttemptResponse = {
    recorded: true,
    solveTimeMs: body.solveTimeMs,
    percentile,
    bucket: percentileToBucket(percentile),
    avgSolveMs,
    top10PctMs,
    totalAttempts,
    userId: resolvedUserId,
    ...(isTimeoutBlunder ? { timeout_blunder: true } : {}),
  };

  return NextResponse.json(response);
}) as unknown as (
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) => Promise<Response>;

async function updateStreak(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, longestStreak: true, lastPuzzleDate: true },
    });
    if (!user) {
      console.log(`[streak] user not found: ${userId}`);
      return;
    }

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD UTC
    if (user.lastPuzzleDate === today) {
      console.log(`[streak] already solved today (${today}), skipping`);
      return;
    }

    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
    const isConsecutive = user.lastPuzzleDate === yesterday;

    const newStreak = isConsecutive ? user.currentStreak + 1 : 1;
    const newLongest = Math.max(newStreak, user.longestStreak);

    console.log(`[streak] userId=${userId} lastPuzzleDate=${user.lastPuzzleDate} today=${today} consecutive=${isConsecutive} ${user.currentStreak}→${newStreak} longest=${newLongest}`);
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastPuzzleDate: today,
      },
    });
    console.log(`[streak] ✓ updated`);
  } catch (e: unknown) {
    // P2025 = record not found — stale session cookie after user deletion, ignore
    if ((e as { code?: string })?.code === "P2025") return;
    throw e;
  }
}
