/**
 * Client-side blunder extraction from Chess.com PGNs.
 *
 * Uses browser Stockfish (depth 8) to find positions where a player made a
 * move that swings the evaluation by ≥ BLUNDER_THRESHOLD centipawns.
 * The resulting puzzle asks the opponent to find the best response.
 *
 * Import this only from "use client" components.
 */

import { Chess } from "chess.js";
import { analyzePosition } from "./stockfishBrowser";

/** Centipawn swing that qualifies a move as a blunder */
const BLUNDER_THRESHOLD = 80;

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

  const candidates: ClientPuzzle[] = [];
  let prevCp: number | null = null;

  for (let i = SKIP_OPENING_PLIES; i < positions.length; i++) {
    if (candidates.length >= MAX_PER_GAME) break;

    const { fen } = positions[i];
    const result = await analyzePosition(fen);

    if (!result) {
      prevCp = null;
      continue;
    }

    const currentCp = result.cp;

    if (prevCp !== null) {
      // The previous position was evaluated at prevCp from the previous side's POV.
      // The current position is at currentCp from the current side's POV.
      // If the previous player blundered, the current eval should be high (opponent is winning).
      // Swing = how much the previous player lost: prevCp - (-currentCp)
      const swing = prevCp - -currentCp;

      if (swing >= BLUNDER_THRESHOLD) {
        const { fen: blunderFen, uci: blunderUci } = positions[i - 1];

        // Apply the blunder to get solvingFen
        const solvingChess = new Chess(blunderFen);
        try {
          solvingChess.move({
            from: blunderUci.slice(0, 2),
            to: blunderUci.slice(2, 4),
            promotion: (blunderUci[4] as "q" | "r" | "b" | "n") ?? undefined,
          });
        } catch {
          prevCp = currentCp;
          continue;
        }

        const moveNumber = Math.floor((i - 1) / 2) + 1;
        // currentCp is from the solver's perspective (side to move at position i)
        const evalCp = currentCp;

        candidates.push({
          id: clientId(),
          fen: blunderFen,
          solvingFen: solvingChess.fen(),
          lastMove: blunderUci,
          solutionMoves: result.move,
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
  }

  return candidates;
}
