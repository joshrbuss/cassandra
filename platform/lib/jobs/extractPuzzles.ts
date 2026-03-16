/**
 * Extracts tactical puzzles from a game PGN using Stockfish analysis.
 *
 * Algorithm:
 *  1. Parse PGN moves with chess.js
 *  2. For every move: evaluate the position BEFORE the move with Stockfish
 *  3. If the eval swings >= BLUNDER_THRESHOLD cp against the moving side → blunder
 *  4. The puzzle is: FEN BEFORE the blunder, solution = what the player SHOULD have played
 *     (the engine's best move from that position, saved from the previous Stockfish call)
 *  5. Deduplicate by solvingFen against the existing DB (caller's responsibility)
 */

import { Chess } from "chess.js";
import { cuid } from "@/lib/cuid";
import { getBestMove } from "./stockfish";

/** Centipawn swing that qualifies a move as a blunder → puzzle candidate */
const BLUNDER_THRESHOLD = 80;

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
  opponentUsername?: string;
  gameDate?: string;
  gameResult?: string;
  moveNumber?: number;
  evalCp?: number;
  playerColor?: string;
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
    // Only include extension if the follow-up is clearly winning
    if (!r3 || r3.cp < 200) return firstMove;

    return `${firstMove} ${r2.move} ${r3.move}`;
  } catch {
    return firstMove;
  }
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
 * Extracts puzzle candidates from one PGN game.
 * Uses Stockfish to identify blunder positions.
 */
export async function extractPuzzlesFromGame(
  pgn: string,
  userId: string,
  playerUsername?: string
): Promise<PuzzleCandidate[]> {
  const gameUrl = extractGameUrl(pgn);
  const gameContext = extractGameContext(pgn, playerUsername);
  const positions = getPositionSequence(pgn);
  if (positions.length < 5) return []; // Too short to be interesting

  // Determine which FEN turn corresponds to the player's moves
  const playerTurn: "w" | "b" | null =
    gameContext.playerColor === "white" ? "w"
    : gameContext.playerColor === "black" ? "b"
    : null;

  const candidates: PuzzleCandidate[] = [];
  let prevCp: number | null = null;
  let prevBestMove: string | null = null;

  for (let i = 0; i < positions.length; i++) {
    if (candidates.length >= MAX_PER_GAME) break;

    const { fen } = positions[i];

    // Evaluate the position BEFORE move i is played — this gives us the best move
    // the player SHOULD play from this position, saved for blunder detection next iteration.
    const result = await getBestMove(fen);
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
      // If the move played from positions[i-1] was a blunder, currentCp will be high
      // (the opponent is now winning), so the swing against the blunderer is large.
      const swing = prevCp - -currentCp;

      if (swing >= BLUNDER_THRESHOLD) {
        // positions[i-1].uci was the blunder move played from positions[i-1].fen.
        // Puzzle: show the player positions[i-1].fen and ask what they SHOULD have played.
        // Solution: prevBestMove — Stockfish's best move from positions[i-1].fen.
        const { fen: blunderFen } = positions[i - 1];
        // lastMove: the move that led INTO the blunder position (for board highlighting)
        const lastMove = i >= 2 ? positions[i - 2].uci : "";

        const solvingChess = new Chess(blunderFen);
        const themes = guessThemes(solvingChess, prevBestMove);

        // Attempt to extend to a 3-ply forcing sequence
        const solutionMoves = await tryExtendSequence(blunderFen, prevBestMove);

        // moveNumber: half-move index (i-1) → full move = floor((i-1)/2) + 1
        const moveNumber = Math.floor((i - 1) / 2) + 1;
        // evalCp: prevCp is already from the solver's (blunderer's) perspective at blunderFen
        const evalCp = prevCp;

        candidates.push({
          id: cuid(),
          fen: blunderFen,
          solvingFen: blunderFen,
          lastMove,
          solutionMoves,
          rating: estimateRating(swing),
          themes,
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
    }

    prevCp = currentCp;
    prevBestMove = result.move;
  }

  return candidates;
}
