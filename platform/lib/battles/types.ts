export type BattleStatus = "waiting" | "active" | "completed";

export type RoundResult = {
  puzzleId: string;
  player1SolveMs: number | null;
  player2SolveMs: number | null;
  player1Success: boolean | null;
  player2Success: boolean | null;
  /** player1Id, player2Id, or null for draw */
  roundWinnerId: string | null;
};

export type BattlePlayer = {
  id: string;
  lichessUsername: string | null;
  chessComUsername: string | null;
  battleRating: number;
};

export type BattleData = {
  id: string;
  player1Id: string;
  player2Id: string | null;
  winnerId: string | null;
  rounds: RoundResult[];
  status: BattleStatus;
  createdAt: Date;
  completedAt: Date | null;
  player1: BattlePlayer;
  player2: BattlePlayer | null;
};

export function playerDisplayName(
  player: Pick<BattlePlayer, "lichessUsername" | "chessComUsername">
): string {
  return player.lichessUsername ?? player.chessComUsername ?? "Anonymous";
}
