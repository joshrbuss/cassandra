/**
 * Extracts tactical puzzles from a PGN that contains Lichess eval annotations.
 *
 * Algorithm:
 *  1. Parse %eval annotations from PGN text (e.g. { [%eval 0.44] })
 *  2. Replay moves with chess.js to collect FENs
 *  3. Find blunders: eval swings ≥ BLUNDER_THRESHOLD_PAWNS against the moving side
 *  4. Puzzle = FEN BEFORE the blunder, solution = Stockfish's best move from that position
 *     (uses %eval annotations for fast blunder detection; Stockfish only for the solution move)
 *
 * Falls back to empty array if no eval annotations are found in the PGN.
 */

import { Chess } from "chess.js";
import { cuid } from "@/lib/cuid";
import { getBestMove } from "./stockfish";
import type { PuzzleCandidate } from "./extractPuzzles";

/** 0.6 pawn swing (60 centipawns) qualifies a move as a blunder */
const BLUNDER_THRESHOLD_PAWNS = 0.6;

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

/** Extract the game URL from PGN headers (Lichess or Chess.com). */
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
): { opponentUsername?: string; gameResult?: string; gameDate?: string; playerColor?: string } {
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

  return { opponentUsername, gameResult, gameDate, playerColor };
}

/**
 * Attempts to extend a 1-move solution into a 3-ply sequence:
 *   M1 (player best) → M2 (opponent forced response) → M3 (player follow-up).
 * Only extends if the follow-up is clearly winning (≥ 200 cp advantage).
 * Returns the original single move on any failure.
 */
async function tryExtendSequence(startFen: string, firstMove: string): Promise<string> {
  try {
    const chess = new Chess(startFen);
    const m1 = chess.move({
      from: firstMove.slice(0, 2),
      to: firstMove.slice(2, 4),
      promotion: firstMove[4] || undefined,
    });
    if (!m1) return firstMove;

    const r2 = await getBestMove(chess.fen());
    if (!r2) return firstMove;
    const m2 = chess.move({
      from: r2.move.slice(0, 2),
      to: r2.move.slice(2, 4),
      promotion: r2.move[4] || undefined,
    });
    if (!m2) return firstMove;

    const r3 = await getBestMove(chess.fen());
    if (!r3 || r3.cp < 200) return firstMove;

    return `${firstMove} ${r2.move} ${r3.move}`;
  } catch {
    return firstMove;
  }
}

/**
 * Extracts puzzle candidates from an eval-annotated PGN.
 * Uses %eval annotations to detect blunders, Stockfish to find the correct solution move.
 * Returns [] if no eval annotations are present.
 */
export async function extractPuzzlesFromAnnotatedPgn(
  pgn: string,
  userId: string,
  playerUsername?: string
): Promise<PuzzleCandidate[]> {
  const gameUrl = extractGameUrl(pgn);
  const gameContext = extractGameContext(pgn, playerUsername);
  const evals = extractEvals(pgn);
  if (evals.length === 0) return []; // no annotations → caller should try Stockfish fallback

  const moves = parseMoves(pgn);
  if (moves.length < 5) return [];

  // Determine which FEN turn corresponds to the player's moves
  const playerTurn: "w" | "b" | null =
    gameContext.playerColor === "white" ? "w"
    : gameContext.playerColor === "black" ? "b"
    : null;

  const candidates: PuzzleCandidate[] = [];

  for (let i = 1; i < moves.length; i++) {
    if (candidates.length >= MAX_PER_GAME) break;

    // evals[i-1] = eval AFTER move[i-1] = eval BEFORE move[i] (from white's perspective, in pawns)
    // evals[i]   = eval AFTER move[i]   (from white's perspective, in pawns)
    const evalBefore = evals[i - 1];
    const evalAfter = evals[i];
    if (evalBefore === null || evalAfter === null) continue;

    const { sideToMove, uci: blunderUci, fenBefore } = moves[i];

    // Only extract blunders from the PLAYER's moves, not the opponent's
    if (playerTurn && sideToMove !== playerTurn) continue;

    // Swing against the side that made move[i]:
    //   White moved → white wants high eval → swing = evalBefore - evalAfter (positive = white lost)
    //   Black moved → black wants low eval → swing = evalAfter - evalBefore (positive = black lost)
    const swing =
      sideToMove === "w"
        ? evalBefore - evalAfter
        : evalAfter - evalBefore;

    if (swing < BLUNDER_THRESHOLD_PAWNS) continue;

    // Ask Stockfish for the best move from fenBefore — what the player SHOULD have played.
    const engineResult = await getBestMove(fenBefore);
    if (!engineResult) continue;

    // Skip if Stockfish agrees the played move was fine (shouldn't happen given swing, but guard)
    if (engineResult.move === blunderUci) continue;

    // Attempt to extend to a 3-ply forcing sequence
    const solutionMoves = await tryExtendSequence(fenBefore, engineResult.move);

    const swingCp = Math.round(swing * 100);
    const rating =
      swingCp >= 600 ? 1200 : swingCp >= 400 ? 1000 : swingCp >= 250 ? 900 : 800;

    // moveNumber: half-move index i (0-based) → full move = floor(i/2) + 1
    const moveNumber = Math.floor(i / 2) + 1;
    // evalCp from the blunderer's (solver's) perspective at fenBefore
    // evalBefore is from white's perspective (in pawns)
    const evalCp = sideToMove === "w"
      ? Math.round(evalBefore * 100)   // white is the solver, positive = white is up
      : Math.round(-evalBefore * 100); // black is the solver, flip sign

    // lastMove: the move that led INTO fenBefore (for board highlighting)
    const lastMove = i >= 1 ? moves[i - 1].uci : "";

    candidates.push({
      id: cuid(),
      fen: fenBefore,
      solvingFen: fenBefore,
      lastMove,
      solutionMoves,
      rating,
      themes: "tactics",
      type: "standard",
      source: "user_import",
      sourceUserId: userId,
      isPublic: false,
      gameUrl,
      ...gameContext,
      moveNumber,
      evalCp,
    });
  }

  return candidates;
}
