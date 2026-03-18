import { prisma } from "@/lib/prisma";
import type { TrialData, TrialStatus, RoundResult } from "./types";

const TOTAL_ROUNDS = 5;
const K_FACTOR = 32;

const playerSelect = {
  id: true,
  lichessUsername: true,
  chessComUsername: true,
  trialRating: true,
} as const;

function eloUpdate(rating: number, opponentRating: number, won: boolean): number {
  const expected = 1 / (1 + Math.pow(10, (opponentRating - rating) / 400));
  return Math.round(rating + K_FACTOR * ((won ? 1 : 0) - expected));
}

function parseTrial(trial: {
  id: string;
  player1Id: string;
  player2Id: string | null;
  winnerId: string | null;
  rounds: string;
  status: string;
  createdAt: Date;
  completedAt: Date | null;
  player1: { id: string; lichessUsername: string | null; chessComUsername: string | null; trialRating: number };
  player2: { id: string; lichessUsername: string | null; chessComUsername: string | null; trialRating: number } | null;
}): TrialData {
  return {
    ...trial,
    rounds: JSON.parse(trial.rounds) as RoundResult[],
    status: trial.status as TrialStatus,
  };
}

async function pickPuzzleIds(count: number): Promise<string[]> {
  // Pick random public standard puzzles in a medium-difficulty range
  const total = await prisma.puzzle.count({
    where: { isPublic: true, type: "standard" },
  });
  const skip = Math.max(0, Math.floor(Math.random() * Math.max(1, total - count)));
  const puzzles = await prisma.puzzle.findMany({
    where: { isPublic: true, type: "standard" },
    select: { id: true },
    orderBy: { rating: "asc" },
    skip,
    take: count,
  });
  // Shuffle the selected slice
  return puzzles.map((p) => p.id).sort(() => Math.random() - 0.5);
}

export async function createTrial(player1Id: string): Promise<TrialData> {
  const puzzleIds = await pickPuzzleIds(TOTAL_ROUNDS);
  const rounds: RoundResult[] = puzzleIds.map((id) => ({
    puzzleId: id,
    player1SolveMs: null,
    player2SolveMs: null,
    player1Success: null,
    player2Success: null,
    roundWinnerId: null,
  }));

  const trial = await prisma.trial.create({
    data: { player1Id, rounds: JSON.stringify(rounds), status: "waiting" },
    include: { player1: { select: playerSelect }, player2: { select: playerSelect } },
  });

  return parseTrial(trial);
}

export async function getTrial(trialId: string): Promise<TrialData | null> {
  const trial = await prisma.trial.findUnique({
    where: { id: trialId },
    include: { player1: { select: playerSelect }, player2: { select: playerSelect } },
  });
  return trial ? parseTrial(trial) : null;
}

export async function listOpenTrials(): Promise<TrialData[]> {
  const trials = await prisma.trial.findMany({
    where: { status: "waiting" },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { player1: { select: playerSelect }, player2: { select: playerSelect } },
  });
  return trials.map(parseTrial);
}

export async function joinTrial(trialId: string, player2Id: string): Promise<TrialData> {
  const trial = await prisma.trial.update({
    where: { id: trialId, status: "waiting", player2Id: null },
    data: { player2Id, status: "active" },
    include: { player1: { select: playerSelect }, player2: { select: playerSelect } },
  });
  return parseTrial(trial);
}

export async function submitRound(
  trialId: string,
  playerId: string,
  puzzleId: string,
  solveTimeMs: number,
  success: boolean
): Promise<{ trial: TrialData; roundResolved: boolean; trialComplete: boolean }> {
  return prisma.$transaction(async (tx) => {
    const raw = await tx.trial.findUniqueOrThrow({
      where: { id: trialId, status: "active" },
      include: { player1: { select: playerSelect }, player2: { select: playerSelect } },
    });

    const isPlayer1 = raw.player1Id === playerId;
    const isPlayer2 = raw.player2Id === playerId;
    if (!isPlayer1 && !isPlayer2) throw new Error("Not a participant");

    const rounds = JSON.parse(raw.rounds) as RoundResult[];
    const roundIndex = rounds.findIndex((r) => r.puzzleId === puzzleId);
    if (roundIndex === -1) throw new Error("Puzzle not in this trial");

    const round = rounds[roundIndex];
    if (isPlayer1 && round.player1SolveMs !== null) throw new Error("Already submitted for this round");
    if (isPlayer2 && round.player2SolveMs !== null) throw new Error("Already submitted for this round");

    if (isPlayer1) {
      round.player1SolveMs = solveTimeMs;
      round.player1Success = success;
    } else {
      round.player2SolveMs = solveTimeMs;
      round.player2Success = success;
    }

    let roundResolved = false;
    let trialComplete = false;

    // Resolve round when both players have submitted
    if (round.player1SolveMs !== null && round.player2SolveMs !== null) {
      roundResolved = true;
      const p1ok = round.player1Success ?? false;
      const p2ok = round.player2Success ?? false;
      const p1ms = round.player1SolveMs;
      const p2ms = round.player2SolveMs;

      if (p1ok && (!p2ok || p1ms < p2ms)) {
        round.roundWinnerId = raw.player1Id;
      } else if (p2ok && (!p1ok || p2ms < p1ms)) {
        round.roundWinnerId = raw.player2Id;
      } else {
        round.roundWinnerId = null; // draw
      }

      // Check if all rounds complete
      const allDone = rounds.every(
        (r) => r.player1SolveMs !== null && r.player2SolveMs !== null
      );
      if (allDone) {
        trialComplete = true;
        const p1Wins = rounds.filter((r) => r.roundWinnerId === raw.player1Id).length;
        const p2Wins = rounds.filter((r) => r.roundWinnerId === raw.player2Id).length;
        const winnerId = p1Wins > p2Wins ? raw.player1Id : p2Wins > p1Wins ? raw.player2Id : null;

        // Update trial ratings
        if (winnerId) {
          const p1r = raw.player1.trialRating;
          const p2r = raw.player2!.trialRating;
          await tx.user.update({
            where: { id: raw.player1Id },
            data: { trialRating: eloUpdate(p1r, p2r, winnerId === raw.player1Id) },
          });
          await tx.user.update({
            where: { id: raw.player2Id! },
            data: { trialRating: eloUpdate(p2r, p1r, winnerId === raw.player2Id) },
          });
        }

        const updated = await tx.trial.update({
          where: { id: trialId },
          data: {
            rounds: JSON.stringify(rounds),
            status: "completed",
            winnerId,
            completedAt: new Date(),
          },
          include: { player1: { select: playerSelect }, player2: { select: playerSelect } },
        });
        return { trial: parseTrial(updated), roundResolved, trialComplete };
      }
    }

    const updated = await tx.trial.update({
      where: { id: trialId },
      data: { rounds: JSON.stringify(rounds) },
      include: { player1: { select: playerSelect }, player2: { select: playerSelect } },
    });
    return { trial: parseTrial(updated), roundResolved, trialComplete };
  });
}
