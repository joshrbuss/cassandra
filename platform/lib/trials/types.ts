export type TrialStatus = "waiting" | "active" | "completed";

export type RoundResult = {
  puzzleId: string;
  player1SolveMs: number | null;
  player2SolveMs: number | null;
  player1Success: boolean | null;
  player2Success: boolean | null;
  /** player1Id, player2Id, or null for draw */
  roundWinnerId: string | null;
};

export type TrialPlayer = {
  id: string;
  lichessUsername: string | null;
  chessComUsername: string | null;
  trialRating: number;
};

export type TrialData = {
  id: string;
  player1Id: string;
  player2Id: string | null;
  winnerId: string | null;
  rounds: RoundResult[];
  status: TrialStatus;
  createdAt: Date;
  completedAt: Date | null;
  player1: TrialPlayer;
  player2: TrialPlayer | null;
};

export function playerDisplayName(
  player: Pick<TrialPlayer, "lichessUsername" | "chessComUsername">
): string {
  return player.lichessUsername ?? player.chessComUsername ?? "Anonymous";
}
