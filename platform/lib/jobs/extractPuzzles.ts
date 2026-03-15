/**
 * Extracts tactical puzzles from a game PGN using Stockfish analysis.
 *
 * Algorithm:
 *  1. Parse PGN moves with chess.js
 *  2. For every move: evaluate the position BEFORE the move and AFTER it
 *  3. If the eval swings >= BLUNDER_THRESHOLD cp against the moving side → blunder
 *  4. The puzzle is: FEN before blunder, find the winning response the opponent can play
 *  5. Deduplicate by solvingFen against the existing DB (caller's responsibility)
 */

import { Chess } from "chess.js";
import { cuid } from "@/lib/cuid";
import { getBestMove } from "./stockfish";

/** Centipawn swing that qualifies a move as a blunder → puzzle candidate */
const BLUNDER_THRESHOLD = 150;

/** Maximum puzzles extracted per game (avoid flooding from one bad game) */
const MAX_PER_GAME = 3;

export interface PuzzleCandidate {
  id: string;
  fen: string;
  solvingFen: string;
  lastMove: string;
  solutionMoves: string;
  rating: number;
  themes: string;
  type: "standard";
  source: "user_import";
  sourceUserId: string;
  isPublic: false;
  gameUrl?: string;
}

/** Rough puzzle rating derived from engine score after the blunder */
function estimateRating(swingCp: number): number {
  if (swingCp >= 600) return 1200;
  if (swingCp >= 400) return 1000;
  if (swingCp >= 250) return 900;
  return 800;
}

/** Guess themes from the best move (simple heuristics) */
function guessThemes(chess: Chess, bestMoveUci: string): string {
  const from = bestMoveUci.slice(0, 2);
  const to = bestMoveUci.slice(2, 4);

  const moveResult = chess.move({ from, to, promotion: "q" });
  if (!moveResult) return "tactics";

  const themes: string[] = [];
  if (chess.isCheckmate()) themes.push("mateIn1");
  else if (chess.inCheck()) themes.push("check");

  if (moveResult.captured) themes.push("capture");

  // Check if the moving piece attacks multiple pieces after the move (fork heuristic)
  const board = chess.board();
  const toRank = 8 - parseInt(to[1], 10);
  const toFile = to.charCodeAt(0) - "a".charCodeAt(0);
  const piece = board[toRank][toFile];
  if (piece) {
    const attackedValues = countAttackedPieceValues(chess, toRank, toFile, piece.color);
    if (attackedValues >= 2) themes.push("fork");
  }

  chess.undo();

  return themes.length > 0 ? themes.join(" ") : "tactics";
}

function countAttackedPieceValues(
  chess: Chess,
  fromRank: number,
  fromFile: number,
  myColor: "w" | "b"
): number {
  const opponentColor = myColor === "w" ? "b" : "w";
  const board = chess.board();
  let count = 0;

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const target = board[r][f];
      if (!target || target.color !== opponentColor) continue;
      const targetSq = String.fromCharCode("a".charCodeAt(0) + f) + String(8 - r);
      const fromSq = String.fromCharCode("a".charCodeAt(0) + fromFile) + String(8 - fromRank);
      // chess.js doesn't expose attack tables directly, so we check via a temp move
      // This is an approximation: any opponent piece near the moved piece
      const dr = Math.abs(r - fromRank);
      const df = Math.abs(f - fromFile);
      const pieceType = board[fromRank][fromFile]?.type;
      if (
        pieceType === "n" &&
        ((dr === 2 && df === 1) || (dr === 1 && df === 2))
      ) {
        count++;
      }
      // Suppress unused variable warning
      void targetSq;
      void fromSq;
    }
  }
  return count;
}

/**
 * Parses PGN headers and moves, returning positions to analyse.
 * Returns null if the PGN is unreadable.
 */
function parsePgn(pgn: string): Chess | null {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    return chess;
  } catch {
    return null;
  }
}

/** Convert a chess.js history to a list of FENs (before each move). */
function getPositionSequence(pgn: string): { fen: string; uci: string }[] {
  const chess = parsePgn(pgn);
  if (!chess) return [];

  const history = chess.history({ verbose: true });
  const positions: { fen: string; uci: string }[] = [];

  // Replay from scratch to capture FENs
  const replay = new Chess();
  for (const move of history) {
    const fen = replay.fen();
    const uci = `${move.from}${move.to}${move.promotion ?? ""}`;
    positions.push({ fen, uci });
    replay.move(move);
  }

  return positions;
}

/** Extract the game URL from PGN headers (Lichess or Chess.com). */
function extractGameUrl(pgn: string): string | undefined {
  const link = pgn.match(/\[Link\s+"([^"]+)"\]/)?.[1];
  if (link) return link;
  const site = pgn.match(/\[Site\s+"([^"]+)"\]/)?.[1];
  if (site?.startsWith("http")) return site;
  return undefined;
}

/**
 * Extracts puzzle candidates from one PGN game.
 * Uses Stockfish to identify blunder positions.
 */
export async function extractPuzzlesFromGame(
  pgn: string,
  userId: string
): Promise<PuzzleCandidate[]> {
  const gameUrl = extractGameUrl(pgn);
  const positions = getPositionSequence(pgn);
  if (positions.length < 5) return []; // Too short to be interesting

  const candidates: PuzzleCandidate[] = [];
  let prevCp: number | null = null;

  for (let i = 0; i < positions.length; i++) {
    if (candidates.length >= MAX_PER_GAME) break;

    const { fen, uci } = positions[i];
    const chess = new Chess(fen);
    const sideToMove = chess.turn(); // "w" | "b"

    // Evaluate the position before the move
    const result = await getBestMove(fen);
    if (!result) {
      prevCp = null;
      continue;
    }

    // cp is from the perspective of the side to move
    // After the move, the position flips — so if the side to move had +200 before,
    // and the next eval (from opponent's perspective) is also +200, then the
    // played move was fine. But if the eval swings to -200, that's a 400cp swing.
    const currentCp = result.cp;

    if (prevCp !== null) {
      // The previous position was evaluated at prevCp (from previous side's POV)
      // The current position is evaluated at currentCp (from current side's POV)
      // A blunder by the previous side means currentCp is high (opponent is now up)
      // Swing from previous side's perspective = -(currentCp) vs prevCp
      // If -(currentCp) << prevCp → previous move was bad
      const swing = prevCp - -currentCp; // how much the previous player lost

      if (swing >= BLUNDER_THRESHOLD) {
        // The move at positions[i-1] was a blunder.
        // Puzzle: position at positions[i-1].fen, last_move = positions[i-1].uci
        // Solution: best response from current position (result.move)
        const { fen: blunderFen, uci: blunderUci } = positions[i - 1];

        // Apply the blunder to get solvingFen
        const solvingChess = new Chess(blunderFen);
        solvingChess.move({
          from: blunderUci.slice(0, 2),
          to: blunderUci.slice(2, 4),
          promotion: blunderUci[4] ?? undefined,
        });
        const solvingFen = solvingChess.fen();

        // Get the best response move
        const bestResponse = result.move;
        const themes = guessThemes(solvingChess, bestResponse);

        candidates.push({
          id: cuid(),
          fen: blunderFen,
          solvingFen,
          lastMove: blunderUci,
          solutionMoves: bestResponse,
          rating: estimateRating(swing),
          themes,
          type: "standard",
          source: "user_import",
          sourceUserId: userId,
          isPublic: false,
          gameUrl,
        });
      }
    }

    prevCp = currentCp;
    // Negate for next iteration (the next evaluation will be from the other side)
    // But we already account for perspective in the swing calculation above
  }

  return candidates;
}
