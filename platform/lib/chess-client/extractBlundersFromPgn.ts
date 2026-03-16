/**
 * Client-side blunder extraction from Chess.com PGNs.
 *
 * Uses browser Stockfish (depth 8) to find positions where a player made a
 * move that swings the evaluation by ≥ BLUNDER_THRESHOLD centipawns.
 * The resulting puzzle shows the position BEFORE the blunder and asks the player
 * to find what they SHOULD have played (Stockfish's best move from that position).
 *
 * Import this only from "use client" components.
 */

import { Chess } from "chess.js";
import { analyzePosition } from "./stockfishBrowser";

/** Centipawn swing that qualifies a move as a blunder */
const BLUNDER_THRESHOLD = 60;

/** Max puzzles extracted per game */
const MAX_PER_GAME = 3;

/** Skip the opening (first N half-moves) — less interesting tactically */
const SKIP_OPENING_PLIES = 16;

export interface ClientPuzzle {
  id: string;
  fen: string;
  solvingFen: string;
  lastMove: string;
  solutionMoves: string;
  rating: number;
  themes: string;
  gameUrl?: string;
  opponentUsername?: string;
  gameDate?: string;
  gameResult?: string;
  moveNumber?: number;
  evalCp?: number;
}

/** Extract the game URL from PGN headers (Chess.com uses [Link], Lichess uses [Site]). */
function extractGameUrl(pgn: string): string | undefined {
  const link = pgn.match(/\[Link\s+"([^"]+)"\]/)?.[1];
  if (link) return link;
  const site = pgn.match(/\[Site\s+"([^"]+)"\]/)?.[1];
  if (site?.startsWith("http")) return site;
  return undefined;
}

function parsePgnHeader(pgn: string, tag: string): string | undefined {
  return pgn.match(new RegExp(`\\[${tag}\\s+"([^"]+)"\\]`))?.[1];
}

function extractGameContext(
  pgn: string,
  playerUsername?: string
): { opponentUsername?: string; gameResult?: string; gameDate?: string } {
  const white = parsePgnHeader(pgn, "White");
  const black = parsePgnHeader(pgn, "Black");
  const result = parsePgnHeader(pgn, "Result");
  const utcDate = parsePgnHeader(pgn, "UTCDate") ?? parsePgnHeader(pgn, "Date");
  const gameDate = utcDate?.replace(/\./g, "-");

  if (!playerUsername || !white || !black) return { gameDate };

  const lc = playerUsername.toLowerCase();
  let playerColor: "white" | "black" | undefined;
  if (white.toLowerCase() === lc) playerColor = "white";
  else if (black.toLowerCase() === lc) playerColor = "black";
  if (!playerColor) return { gameDate };

  const opponentUsername = playerColor === "white" ? black : white;

  let gameResult: string | undefined;
  if (result === "1-0") gameResult = playerColor === "white" ? "win" : "loss";
  else if (result === "0-1") gameResult = playerColor === "black" ? "win" : "loss";
  else if (result === "1/2-1/2") gameResult = "draw";

  return { opponentUsername, gameResult, gameDate };
}

function estimateRating(swingCp: number): number {
  if (swingCp >= 600) return 1200;
  if (swingCp >= 400) return 1000;
  if (swingCp >= 250) return 900;
  return 800;
}

/** Replay a PGN and return { fen, uci } for every half-move. */
function getPositionSequence(pgn: string): Array<{ fen: string; uci: string }> {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    const history = chess.history({ verbose: true });
    if (history.length === 0) return [];

    const replay = new Chess();
    return history.map((move) => {
      const fen = replay.fen();
      const uci = `${move.from}${move.to}${move.promotion ?? ""}`;
      replay.move(move);
      return { fen, uci };
    });
  } catch {
    return [];
  }
}

function clientId(): string {
  return `cc${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Analyses one PGN game with Stockfish and returns puzzle candidates.
 * Runs asynchronously — each position evaluation awaits the engine.
 */
export async function extractBlundersFromPgn(pgn: string, playerUsername?: string): Promise<ClientPuzzle[]> {
  const gameUrl = extractGameUrl(pgn);
  const gameContext = extractGameContext(pgn, playerUsername);
  const positions = getPositionSequence(pgn);
  if (positions.length < 10) return [];

  // Determine which color the player was — only extract THEIR blunders
  const white = parsePgnHeader(pgn, "White");
  const black = parsePgnHeader(pgn, "Black");
  let playerTurn: "w" | "b" | null = null;
  if (playerUsername && white && black) {
    const lc = playerUsername.toLowerCase();
    if (white.toLowerCase() === lc) playerTurn = "w";
    else if (black.toLowerCase() === lc) playerTurn = "b";
  }

  const candidates: ClientPuzzle[] = [];
  let prevCp: number | null = null;
  let prevBestMove: string | null = null;

  for (let i = SKIP_OPENING_PLIES; i < positions.length; i++) {
    if (candidates.length >= MAX_PER_GAME) break;

    const { fen } = positions[i];
    const result = await analyzePosition(fen);

    if (!result) {
      prevCp = null;
      prevBestMove = null;
      continue;
    }

    const currentCp = result.cp;

    if (prevCp !== null && prevBestMove !== null) {
      // The blunder was made from positions[i-1] — check whose turn it was there
      const blunderTurn = positions[i - 1].fen.split(" ")[1]; // "w" or "b"

      // Only extract blunders from the PLAYER's moves, not the opponent's
      if (playerTurn && blunderTurn !== playerTurn) {
        prevCp = currentCp;
        prevBestMove = result.move;
        continue;
      }

      // prevCp  = eval at positions[i-1].fen (from the side to move there)
      // currentCp = eval at positions[i].fen  (from the side to move there)
      // Swing = how much the previous player lost by making their move
      const swing = prevCp - -currentCp;

      if (swing >= BLUNDER_THRESHOLD) {
        const { fen: blunderFen } = positions[i - 1];
        // lastMove: the move that led INTO the blunder position (for board highlighting)
        const lastMove = i >= 2 ? positions[i - 2].uci : "";

        const moveNumber = Math.floor((i - 1) / 2) + 1;
        // prevCp is from the blunderer's (solver's) perspective at blunderFen
        const evalCp = prevCp;

        candidates.push({
          id: clientId(),
          fen: blunderFen,
          solvingFen: blunderFen,
          lastMove,
          solutionMoves: prevBestMove,
          rating: estimateRating(swing),
          themes: "tactics",
          gameUrl,
          ...gameContext,
          moveNumber,
          evalCp,
        });
      }
    }

    prevCp = currentCp;
    prevBestMove = result.move;
  }

  return candidates;
}
