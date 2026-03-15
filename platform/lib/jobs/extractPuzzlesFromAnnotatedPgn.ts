/**
 * Extracts tactical puzzles from a PGN that contains Lichess eval annotations.
 *
 * Algorithm (no Stockfish required — Vercel-compatible):
 *  1. Parse %eval annotations from PGN text (e.g. { [%eval 0.44] })
 *  2. Replay moves with chess.js to collect FENs
 *  3. Find blunders: eval swings ≥ BLUNDER_THRESHOLD_PAWNS against the moving side
 *  4. Puzzle = FEN before the blunder, solution = next move played in game
 *
 * Falls back to empty array if no eval annotations are found in the PGN.
 */

import { Chess } from "chess.js";
import { cuid } from "@/lib/cuid";
import type { PuzzleCandidate } from "./extractPuzzles";

/** 1.5 pawn swing qualifies a move as a blunder */
const BLUNDER_THRESHOLD_PAWNS = 1.5;

/** Maximum puzzles extracted per game */
const MAX_PER_GAME = 3;

/**
 * Parse a Lichess %eval annotation value.
 * Decimal pawns from white's perspective, e.g. "0.44", "-1.20".
 * Mate annotations like "#3" (white mates in 3) or "#-2" (black mates in 2).
 * Returns null if unparseable.
 */
function parseEvalValue(evalStr: string): number | null {
  const trimmed = evalStr.trim();
  if (trimmed.startsWith("#")) {
    const n = parseInt(trimmed.slice(1), 10);
    if (isNaN(n)) return null;
    // White mates = very good for white (+30 pawns), black mates = very good for black (-30)
    return n > 0 ? 30 : -30;
  }
  const v = parseFloat(trimmed);
  return isNaN(v) ? null : v;
}

/** Extract all %eval values from a PGN string, in move order. */
function extractEvals(pgn: string): (number | null)[] {
  const evals: (number | null)[] = [];
  const pattern = /\[%eval\s+([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(pgn)) !== null) {
    evals.push(parseEvalValue(m[1]));
  }
  return evals;
}

interface ParsedMove {
  uci: string;
  fenBefore: string;
  fenAfter: string;
  sideToMove: "w" | "b";
}

/** Replay PGN and return per-move data. Returns empty array on parse failure. */
function parseMoves(pgn: string): ParsedMove[] {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    return [];
  }

  const history = chess.history({ verbose: true });
  if (history.length === 0) return [];

  const replay = new Chess();
  const moves: ParsedMove[] = [];

  for (const move of history) {
    const fenBefore = replay.fen();
    const sideToMove = replay.turn() as "w" | "b";
    replay.move(move);
    moves.push({
      uci: `${move.from}${move.to}${move.promotion ?? ""}`,
      fenBefore,
      fenAfter: replay.fen(),
      sideToMove,
    });
  }

  return moves;
}

/**
 * Extracts puzzle candidates from an eval-annotated PGN.
 * Synchronous — no Stockfish required.
 * Returns [] if no eval annotations are present.
 */
export function extractPuzzlesFromAnnotatedPgn(
  pgn: string,
  userId: string
): PuzzleCandidate[] {
  const evals = extractEvals(pgn);
  if (evals.length === 0) return []; // no annotations → caller should try Stockfish fallback

  const moves = parseMoves(pgn);
  if (moves.length < 5) return [];

  const candidates: PuzzleCandidate[] = [];

  for (let i = 1; i < moves.length - 1; i++) {
    if (candidates.length >= MAX_PER_GAME) break;

    // evals[i-1] = eval AFTER move[i-1] = eval BEFORE move[i] (from white's perspective, in pawns)
    // evals[i]   = eval AFTER move[i]   (from white's perspective, in pawns)
    const evalBefore = evals[i - 1];
    const evalAfter = evals[i];
    if (evalBefore === null || evalAfter === null) continue;

    const { sideToMove, uci: blunderUci, fenBefore, fenAfter } = moves[i];

    // Swing against the side that made move[i]:
    //   White moved → white wants high eval → swing = evalBefore - evalAfter (positive = white lost)
    //   Black moved → black wants low eval → swing = evalAfter - evalBefore (positive = black lost)
    const swing =
      sideToMove === "w"
        ? evalBefore - evalAfter
        : evalAfter - evalBefore;

    if (swing < BLUNDER_THRESHOLD_PAWNS) continue;

    // The solution is the NEXT move played in the game (the winning response)
    const response = moves[i + 1];
    if (!response) continue;

    // Validate the response move is legal from fenAfter
    try {
      const tmp = new Chess(fenAfter);
      const promotion = response.uci[4] as "q" | "r" | "b" | "n" | undefined;
      const legal = tmp.move({
        from: response.uci.slice(0, 2),
        to: response.uci.slice(2, 4),
        ...(promotion ? { promotion } : {}),
      });
      if (!legal) continue;
    } catch {
      continue;
    }

    const swingCp = Math.round(swing * 100);
    const rating =
      swingCp >= 600 ? 1200 : swingCp >= 400 ? 1000 : swingCp >= 250 ? 900 : 800;

    candidates.push({
      id: cuid(),
      fen: fenBefore,
      solvingFen: fenAfter,
      lastMove: blunderUci,
      solutionMoves: response.uci,
      rating,
      themes: "tactics",
      type: "standard",
      source: "user_import",
      sourceUserId: userId,
      isPublic: false,
    });
  }

  return candidates;
}
