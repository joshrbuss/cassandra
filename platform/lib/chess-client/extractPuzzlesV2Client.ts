/**
 * Client-side V2 Puzzle Extraction Pipeline.
 *
 * Same logic as the server-side extractPuzzlesV2 but uses browser WASM
 * Stockfish (via Web Worker) instead of Node.js child_process.
 *
 * Import this only from "use client" components.
 */

import { Chess, type Square, type PieceSymbol, type Color } from "chess.js";
import { analyzePosition, analyzePositionMultiPV, type EngineResult } from "./stockfishBrowser";

// ─── Constants ──────────────────────────────────────────────────────────────

const ANALYSIS_DEPTH = 14; // deeper than default 8 for accurate CPL
const BLUNDER_THRESHOLD = 60; // centipawns
const MAX_PER_GAME = 5;
const MAX_STRONGER_MOVE_PER_GAME = 3;
const STRONGER_MOVE_MIN_CP_DIFF = 30; // minimum cp difference to count as "genuinely better"
const STRONGER_MOVE_MAX_CPL = 59; // must be below blunder threshold
const STRONGER_MOVE_MIN_CPL = 10; // don't flag near-perfect moves
const MAX_EXTENSION_PLY = 10;
const FORCING_ADVANTAGE_CP = 150;
const WINNING_THRESHOLD_CP = 300;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PuzzleCandidateV2 {
  id: string;
  fen: string;
  solvingFen: string;
  lastMove: string;
  solutionMoves: string;
  rating: number;
  themes: string;
  /** "standard" for missed tactics, "move_ranking" for stronger-move-available */
  type: "standard" | "move_ranking";
  /** JSON stringified CandidateMove[] for move_ranking puzzles */
  candidateMoves?: string;
  /** Detailed theme descriptions for verification, e.g. "pin — bishop pinning knight to king" */
  themeDescriptions?: string[];
  /** True if the move deviated from opening database theory (move_ranking only) */
  outOfTheory?: boolean;
  gameUrl?: string;
  opponentUsername?: string;
  gameDate?: string;
  gameResult?: string;
  moveNumber?: number;
  evalCp?: number;
  playerColor?: string;
}

export interface MoveEvalData {
  moveNumber: number;
  side: "white" | "black";
  evalCp: number;
  bestMoveCp: number;
  cpl: number;
  phase: "opening" | "middlegame" | "endgame";
  movePlayed: string;
  bestMove: string;
}

export interface GameAccuracy {
  overall: number;
  opening: number;
  middlegame: number;
  endgame: number;
  averageCpl: number;
  moveCount: number;
}

export interface ExtractResultV2 {
  candidates: PuzzleCandidateV2[];
  moveEvals: MoveEvalData[];
  accuracy: GameAccuracy;
  gameUrl?: string;
  playerColor?: "white" | "black";
  stoppedAt: number;
  totalPositions: number;
  complete: boolean;
  stockfishAvailable: boolean;
  stockfishError?: string;
}

/** Progress callback for UI updates */
export type ProgressCallback = (info: {
  gameIndex: number;
  totalGames: number;
  positionIndex: number;
  totalPositions: number;
  puzzlesFound: number;
  phase: string;
}) => void;

// ─── Opening theory check (embedded opening book) ───────────────────────────

import { isMoveInBook, fenKey } from "./openingBook";

const OPENING_THEORY_MOVE_LIMIT = 15; // only check moves 1–15

// ─── Helpers ────────────────────────────────────────────────────────────────

function clientId(): string {
  return `v2${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function estimateRating(swingCp: number, solutionDepth: number): number {
  let rating: number;
  if (swingCp >= 600) rating = 1200;
  else if (swingCp >= 400) rating = 1000;
  else if (swingCp >= 250) rating = 900;
  else rating = 800;
  if (solutionDepth >= 6) rating += 200;
  else if (solutionDepth >= 4) rating += 100;
  return Math.min(rating, 1600);
}

// ─── Forcing move detection ─────────────────────────────────────────────────

function isForcingMove(chess: Chess, moveUci: string): boolean {
  const from = moveUci.slice(0, 2) as Square;
  const to = moveUci.slice(2, 4) as Square;
  const promo = moveUci[4] as PieceSymbol | undefined;

  const result = chess.move({ from, to, promotion: promo });
  if (!result) return false;

  const isForcing =
    chess.isCheckmate() ||
    chess.inCheck() ||
    !!result.captured ||
    chess.isStalemate();

  chess.undo();
  return isForcing;
}

// ─── Recursive forcing sequence extension ───────────────────────────────────

async function extendForcingSequence(
  startFen: string,
  firstMove: string,
): Promise<string> {
  const moves: string[] = [firstMove];

  try {
    const chess = new Chess(startFen);
    const m1 = chess.move({
      from: firstMove.slice(0, 2) as Square,
      to: firstMove.slice(2, 4) as Square,
      promotion: (firstMove[4] as PieceSymbol) || undefined,
    });
    if (!m1) return firstMove;
    if (chess.isCheckmate()) return firstMove;

    let ply = 1;

    while (ply < MAX_EXTENSION_PLY) {
      // Opponent's response
      const opponentResult = await analyzePosition(chess.fen());
      if (!opponentResult) break;

      const om = chess.move({
        from: opponentResult.move.slice(0, 2) as Square,
        to: opponentResult.move.slice(2, 4) as Square,
        promotion: (opponentResult.move[4] as PieceSymbol) || undefined,
      });
      if (!om) break;
      moves.push(opponentResult.move);
      ply++;

      if (chess.isCheckmate() || chess.isStalemate()) break;

      // Player's next move
      const playerResult = await analyzePosition(chess.fen());
      if (!playerResult) break;

      if (!isForcingMove(chess, playerResult.move)) {
        if (playerResult.cp >= WINNING_THRESHOLD_CP) {
          const pm = chess.move({
            from: playerResult.move.slice(0, 2) as Square,
            to: playerResult.move.slice(2, 4) as Square,
            promotion: (playerResult.move[4] as PieceSymbol) || undefined,
          });
          if (pm) moves.push(playerResult.move);
        }
        break;
      }

      if (playerResult.cp < FORCING_ADVANTAGE_CP) break;

      const pm = chess.move({
        from: playerResult.move.slice(0, 2) as Square,
        to: playerResult.move.slice(2, 4) as Square,
        promotion: (playerResult.move[4] as PieceSymbol) || undefined,
      });
      if (!pm) break;
      moves.push(playerResult.move);
      ply++;

      if (chess.isCheckmate()) break;
    }
  } catch {
    // Return what we have
  }

  return moves.join(" ");
}

// ─── Tactic classification ──────────────────────────────────────────────────

type BoardSquare = { type: PieceSymbol; color: Color; square: Square } | null;

function getBoard(chess: Chess): BoardSquare[][] {
  return chess.board() as BoardSquare[][];
}

function sqToCoords(sq: Square): [number, number] {
  const file = sq.charCodeAt(0) - 97;
  const rank = parseInt(sq[1], 10) - 1;
  return [rank, file];
}

function coordsToSq(rank: number, file: number): Square | null {
  if (rank < 0 || rank > 7 || file < 0 || file > 7) return null;
  return (String.fromCharCode(97 + file) + String(rank + 1)) as Square;
}

const ROOK_DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_DIRS: [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ALL_DIRS: [number, number][] = [...ROOK_DIRS, ...BISHOP_DIRS];

function getSlidingDirs(pieceType: PieceSymbol): [number, number][] {
  if (pieceType === "r") return ROOK_DIRS;
  if (pieceType === "b") return BISHOP_DIRS;
  if (pieceType === "q") return ALL_DIRS;
  return [];
}

function findAlignedPiece(
  board: BoardSquare[][],
  attackerSq: Square,
  throughSq: Square,
): Square | null {
  const [ar, af] = sqToCoords(attackerSq);
  const [tr, tf] = sqToCoords(throughSq);
  const dr = Math.sign(tr - ar);
  const df = Math.sign(tf - af);
  let rr = tr + dr;
  let ff = tf + df;
  while (rr >= 0 && rr <= 7 && ff >= 0 && ff <= 7) {
    const rank8 = 7 - rr;
    const piece = board[rank8][ff];
    if (piece) return coordsToSq(rr, ff);
    rr += dr;
    ff += df;
  }
  return null;
}

function pieceValue(type: PieceSymbol): number {
  const values: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
  return values[type] ?? 0;
}

function pieceName(type: PieceSymbol): string {
  const names: Record<PieceSymbol, string> = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
  return names[type] ?? type;
}

function findKing(board: BoardSquare[][], color: Color): string | null {
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (p && p.type === "k" && p.color === color) return p.square;
    }
  }
  return null;
}

function getAttackedSquares(
  chess: Chess,
  sq: Square,
  color: Color,
  _board: BoardSquare[][],
): Square[] {
  const piece = chess.get(sq);
  if (!piece || piece.color !== color) return [];

  const [rank, file] = sqToCoords(sq);
  const attacked: Square[] = [];

  if (piece.type === "n") {
    const knightMoves: [number, number][] = [
      [2, 1], [2, -1], [-2, 1], [-2, -1],
      [1, 2], [1, -2], [-1, 2], [-1, -2],
    ];
    for (const [dr, df] of knightMoves) {
      const target = coordsToSq(rank + dr, file + df);
      if (target) attacked.push(target);
    }
  } else if (piece.type === "p") {
    const dir = color === "w" ? 1 : -1;
    for (const df of [-1, 1]) {
      const target = coordsToSq(rank + dir, file + df);
      if (target) attacked.push(target);
    }
  } else if (piece.type === "k") {
    for (const [dr, df] of ALL_DIRS) {
      const target = coordsToSq(rank + dr, file + df);
      if (target) attacked.push(target);
    }
  } else {
    const dirs = getSlidingDirs(piece.type);
    const board = _board;
    for (const [dr, df] of dirs) {
      let r = rank + dr;
      let f = file + df;
      while (r >= 0 && r <= 7 && f >= 0 && f <= 7) {
        const target = coordsToSq(r, f)!;
        attacked.push(target);
        const rank8 = 7 - r;
        if (board[rank8][f]) break;
        r += dr;
        f += df;
      }
    }
  }

  return attacked;
}

function findFriendlySlidingPiecesThrough(
  board: BoardSquare[][],
  throughSq: Square,
  color: Color,
): { sq: Square; type: PieceSymbol }[] {
  const [tr, tf] = sqToCoords(throughSq);
  const result: { sq: Square; type: PieceSymbol }[] = [];

  for (const [dr, df] of ALL_DIRS) {
    let r = tr + dr;
    let f = tf + df;
    while (r >= 0 && r <= 7 && f >= 0 && f <= 7) {
      const rank8 = 7 - r;
      const p = board[rank8][f];
      if (p) {
        if (p.color === color && ["b", "r", "q"].includes(p.type)) {
          const dirs = getSlidingDirs(p.type);
          if (dirs.some(([d1, d2]) => d1 === -dr && d2 === -df)) {
            result.push({ sq: p.square as Square, type: p.type });
          }
        }
        break;
      }
      r += dr;
      f += df;
    }
  }

  return result;
}

interface ThemeResult {
  tags: string[];
  descriptions: string[];
}

function detectThemes(chess: Chess, bestMoveUci: string): ThemeResult {
  const tags: string[] = [];
  const descriptions: string[] = [];
  const from = bestMoveUci.slice(0, 2) as Square;
  const to = bestMoveUci.slice(2, 4) as Square;
  const promo = bestMoveUci[4] as PieceSymbol | undefined;

  const boardBefore = getBoard(chess);
  const movingPiece = chess.get(from);
  if (!movingPiece) return { tags: ["tactics"], descriptions: [] };

  const mpName = pieceName(movingPiece.type);
  const myColor = movingPiece.color;
  const oppColor: Color = myColor === "w" ? "b" : "w";

  const moveResult = chess.move({ from, to, promotion: promo });
  if (!moveResult) return { tags: ["tactics"], descriptions: [] };

  const boardAfter = getBoard(chess);

  // Checkmate
  if (chess.isCheckmate()) {
    tags.push("mateIn1");
    descriptions.push(`mateIn1 — ${mpName} on ${to} delivers checkmate`);
    const kingRank = oppColor === "w" ? "1" : "8";
    const oppKingSq = findKing(boardAfter, oppColor);
    if (oppKingSq && oppKingSq[1] === kingRank) {
      tags.push("backRankMate");
      descriptions.push(`backRankMate — king trapped on back rank at ${oppKingSq}`);
    }
  } else if (chess.inCheck()) {
    tags.push("check");
    descriptions.push(`check — ${mpName} on ${to} gives check`);
  }

  if (moveResult.captured) {
    tags.push("capture");
    descriptions.push(`capture — ${mpName} captures ${pieceName(moveResult.captured as PieceSymbol)} on ${to}`);
  }

  // Fork
  const attackedEnemies = getAttackedSquares(chess, to, myColor, boardAfter)
    .filter((sq) => {
      const p = chess.get(sq);
      return p && p.color === oppColor;
    });
  if (attackedEnemies.length >= 2) {
    tags.push("fork");
    const targets = attackedEnemies.map((sq) => {
      const p = chess.get(sq);
      return p ? `${pieceName(p.type)} on ${sq}` : sq;
    });
    descriptions.push(`fork — ${mpName} on ${to} attacks ${targets.join(" and ")}`);
  }

  // Pin
  if (["b", "r", "q"].includes(movingPiece.type)) {
    for (const enemySq of attackedEnemies) {
      const behindSq = findAlignedPiece(boardAfter, to, enemySq);
      if (behindSq) {
        const behindPiece = chess.get(behindSq);
        if (behindPiece && behindPiece.color === oppColor) {
          const pinnedPiece = chess.get(enemySq);
          if (behindPiece.type === "k") {
            tags.push("pin");
            descriptions.push(`pin — ${mpName} on ${to} pinning ${pinnedPiece ? pieceName(pinnedPiece.type) : "piece"} on ${enemySq} to king on ${behindSq}`);
          } else if (pinnedPiece && pieceValue(behindPiece.type) > pieceValue(pinnedPiece.type)) {
            tags.push("pin");
            descriptions.push(`pin — ${mpName} on ${to} pinning ${pieceName(pinnedPiece.type)} on ${enemySq} to ${pieceName(behindPiece.type)} on ${behindSq}`);
          }
        }
      }
    }
  }

  // Skewer
  if (["b", "r", "q"].includes(movingPiece.type)) {
    for (const enemySq of attackedEnemies) {
      const targetPiece = chess.get(enemySq);
      if (!targetPiece) continue;
      const behindSq = findAlignedPiece(boardAfter, to, enemySq);
      if (behindSq) {
        const behindPiece = chess.get(behindSq);
        if (behindPiece && behindPiece.color === oppColor && pieceValue(targetPiece.type) > pieceValue(behindPiece.type)) {
          tags.push("skewer");
          descriptions.push(`skewer — ${mpName} on ${to} attacks ${pieceName(targetPiece.type)} on ${enemySq}, exposing ${pieceName(behindPiece.type)} on ${behindSq}`);
        }
      }
    }
  }

  // Discovered attack / discovered check
  const friendlySlidingPieces = findFriendlySlidingPiecesThrough(boardBefore, from, myColor);
  for (const { sq: sliderSq, type: sliderType } of friendlySlidingPieces) {
    const nowAttacks = getAttackedSquares(chess, sliderSq, myColor, boardAfter)
      .filter((sq) => {
        const p = chess.get(sq);
        return p && p.color === oppColor;
      });
    if (nowAttacks.length > 0) {
      const attacksKing = nowAttacks.some((sq) => {
        const p = chess.get(sq);
        return p && p.type === "k";
      });
      if (attacksKing) {
        tags.push("discoveredCheck");
        descriptions.push(`discoveredCheck — ${mpName} moves from ${from}, ${pieceName(sliderType)} on ${sliderSq} gives check`);
      } else {
        tags.push("discoveredAttack");
        const targets = nowAttacks.map((sq) => {
          const p = chess.get(sq);
          return p ? `${pieceName(p.type)} on ${sq}` : sq;
        });
        descriptions.push(`discoveredAttack — ${mpName} moves from ${from}, ${pieceName(sliderType)} on ${sliderSq} attacks ${targets.join(", ")}`);
      }
    }
  }

  // Double check
  if (chess.inCheck()) {
    const oppKingSq = findKing(boardAfter, oppColor);
    if (oppKingSq) {
      let checkCount = 0;
      const movedPieceAttacks = getAttackedSquares(chess, to, myColor, boardAfter);
      if (movedPieceAttacks.some((sq) => sq === oppKingSq)) checkCount++;
      for (const { sq: sliderSq } of friendlySlidingPieces) {
        const sliderAttacks = getAttackedSquares(chess, sliderSq, myColor, boardAfter);
        if (sliderAttacks.some((sq) => sq === oppKingSq)) checkCount++;
      }
      if (checkCount >= 2) {
        tags.push("doubleCheck");
        descriptions.push(`doubleCheck — ${mpName} on ${to} and discovered piece both give check`);
      }
    }
  }

  // Back rank weakness
  if (!tags.includes("backRankMate")) {
    const oppKingSq = findKing(boardAfter, oppColor);
    if (oppKingSq) {
      const kingRank = oppColor === "w" ? "1" : "8";
      if (oppKingSq[1] === kingRank) {
        const [kr, kf] = sqToCoords(oppKingSq as Square);
        const pawnRankDir = oppColor === "w" ? 1 : -1;
        const pawnRank = kr + pawnRankDir;
        if (pawnRank >= 0 && pawnRank <= 7) {
          let blockedSquares = 0;
          for (const df of [-1, 0, 1]) {
            const pf = kf + df;
            if (pf < 0 || pf > 7) continue;
            const rank8 = 7 - pawnRank;
            const p = boardAfter[rank8][pf];
            if (p && p.color === oppColor && p.type === "p") blockedSquares++;
          }
          if (blockedSquares >= 2 && chess.inCheck()) {
            tags.push("backRankWeakness");
            descriptions.push(`backRankWeakness — king hemmed in on ${oppKingSq} by own pawns`);
          }
        }
      }
    }
  }

  // Zwischenzug
  const history = chess.history({ verbose: true });
  if (history.length >= 2) {
    const prevMove = history[history.length - 2];
    if (prevMove?.captured && moveResult.to !== prevMove.to) {
      if (chess.inCheck() || tags.includes("fork")) {
        tags.push("zwischenzug");
        descriptions.push(`zwischenzug — ${mpName} to ${to} instead of recapturing on ${prevMove.to}`);
      }
    }
  }

  chess.undo();

  const dedupedTags = [...new Set(tags.length > 0 ? tags : ["tactics"])];
  return { tags: dedupedTags, descriptions };
}

// ─── Accuracy calculation ───────────────────────────────────────────────────

function getPhase(moveNumber: number, fen: string): "opening" | "middlegame" | "endgame" {
  const piecePart = fen.split(" ")[0];
  const majorMinor = (piecePart.match(/[qrbnQRBN]/g) || []).length;
  if (majorMinor <= 4 || moveNumber >= 30) return "endgame";
  if (moveNumber <= 10) return "opening";
  return "middlegame";
}

function cplToAccuracy(avgCpl: number): number {
  if (avgCpl <= 0) return 100;
  const acc = 103.1668 * Math.exp(-0.04354 * avgCpl) - 3.1668;
  return Math.round(Math.max(0, Math.min(100, acc)) * 10) / 10;
}

function computeAccuracy(evals: MoveEvalData[], side: "white" | "black"): GameAccuracy {
  const playerEvals = evals.filter((e) => e.side === side);
  if (playerEvals.length === 0) {
    return { overall: 0, opening: 0, middlegame: 0, endgame: 0, averageCpl: 0, moveCount: 0 };
  }

  const totalCpl = playerEvals.reduce((sum, e) => sum + e.cpl, 0);
  const avgCpl = totalCpl / playerEvals.length;

  // Chess.com-style: compute accuracy per move, then average.
  // This avoids Jensen's inequality distortion from averaging CPL first.
  const perMoveAccuracies = playerEvals.map((e) => cplToAccuracy(e.cpl));
  const avgAccuracy = perMoveAccuracies.reduce((s, a) => s + a, 0) / perMoveAccuracies.length;

  const byPhase = (phase: "opening" | "middlegame" | "endgame") => {
    const phaseEvals = playerEvals.filter((e) => e.phase === phase);
    if (phaseEvals.length === 0) return 0;
    const phaseAccuracies = phaseEvals.map((e) => cplToAccuracy(e.cpl));
    return Math.round(phaseAccuracies.reduce((s, a) => s + a, 0) / phaseAccuracies.length * 10) / 10;
  };

  return {
    overall: Math.round(avgAccuracy * 10) / 10,
    opening: byPhase("opening"),
    middlegame: byPhase("middlegame"),
    endgame: byPhase("endgame"),
    averageCpl: Math.round(avgCpl * 10) / 10,
    moveCount: playerEvals.length,
  };
}

const EMPTY_ACCURACY: GameAccuracy = { overall: 0, opening: 0, middlegame: 0, endgame: 0, averageCpl: 0, moveCount: 0 };

// ─── PGN helpers ────────────────────────────────────────────────────────────

function getPositionSequence(pgn: string): { fen: string; uci: string }[] {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    const history = chess.history({ verbose: true });
    const positions: { fen: string; uci: string }[] = [];
    const replay = new Chess();
    for (const move of history) {
      positions.push({
        fen: replay.fen(),
        uci: `${move.from}${move.to}${move.promotion ?? ""}`,
      });
      replay.move(move);
    }
    return positions;
  } catch {
    return [];
  }
}

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

function extractGameContext(pgn: string, playerUsername?: string) {
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

// ─── Main extraction (client-side) ──────────────────────────────────────────

export async function extractPuzzlesV2Client(
  pgn: string,
  playerUsername?: string,
  onProgress?: (posIndex: number, totalPos: number) => void,
): Promise<ExtractResultV2> {
  const gameUrl = extractGameUrl(pgn);
  const gameContext = extractGameContext(pgn, playerUsername);
  const positions = getPositionSequence(pgn);

  if (positions.length < 5) {
    return { candidates: [], moveEvals: [], accuracy: EMPTY_ACCURACY, gameUrl, stoppedAt: positions.length, totalPositions: positions.length, complete: true, stockfishAvailable: false, stockfishError: "Too few positions" };
  }

  const playerTurn: "w" | "b" | null =
    gameContext.playerColor === "white" ? "w"
    : gameContext.playerColor === "black" ? "b"
    : null;

  const candidates: PuzzleCandidateV2[] = [];
  const moveEvals: MoveEvalData[] = [];
  let prevCp: number | null = null;
  let prevBestMove: string | null = null;

  // Health check
  const healthCheck = await analyzePosition(positions[0].fen, ANALYSIS_DEPTH);
  if (!healthCheck) {
    return { candidates: [], moveEvals: [], accuracy: EMPTY_ACCURACY, gameUrl, stoppedAt: 0, totalPositions: positions.length, complete: false, stockfishAvailable: false, stockfishError: "Browser Stockfish WASM not available" };
  }

  for (let i = 0; i < positions.length; i++) {
    onProgress?.(i, positions.length);

    const { fen } = positions[i];
    const result = await analyzePosition(fen, ANALYSIS_DEPTH);
    if (!result) {
      prevCp = null;
      prevBestMove = null;
      continue;
    }

    const currentCp = result.cp;

    if (prevCp !== null && prevBestMove !== null) {
      const moveSide: "white" | "black" = positions[i - 1].fen.split(" ")[1] === "w" ? "white" : "black";
      const moveNum = Math.floor((i - 1) / 2) + 1;
      const phase = getPhase(moveNum, positions[i - 1].fen);

      const evalAfterMove = -currentCp;
      const cpl = Math.max(0, prevCp - evalAfterMove);

      moveEvals.push({
        moveNumber: moveNum,
        side: moveSide,
        evalCp: evalAfterMove,
        bestMoveCp: prevCp,
        cpl,
        phase,
        movePlayed: positions[i - 1].uci,
        bestMove: prevBestMove,
      });

      const blunderTurn = positions[i - 1].fen.split(" ")[1];
      if (playerTurn && blunderTurn !== playerTurn) {
        prevCp = currentCp;
        prevBestMove = result.move;
        continue;
      }

      const swing = prevCp - evalAfterMove;

      if (swing >= BLUNDER_THRESHOLD && candidates.length < MAX_PER_GAME) {
        const { fen: blunderFen } = positions[i - 1];
        const lastMove = i >= 2 ? positions[i - 2].uci : "";

        const solvingChess = new Chess(blunderFen);
        const themeResult = detectThemes(solvingChess, prevBestMove);

        const solutionMoves = await extendForcingSequence(blunderFen, prevBestMove);
        const solutionDepth = solutionMoves.split(" ").length;

        candidates.push({
          id: clientId(),
          fen: blunderFen,
          solvingFen: blunderFen,
          lastMove,
          solutionMoves,
          rating: estimateRating(swing, solutionDepth),
          themes: themeResult.tags.join(" "),
          themeDescriptions: themeResult.descriptions,
          type: "standard",
          gameUrl,
          ...gameContext,
          moveNumber: moveNum,
          evalCp: prevCp,
        });
      }
    }

    prevCp = currentCp;
    prevBestMove = result.move;
  }

  // ── Stronger-move-available detection (MultiPV) ──
  // Find positions where the player's move was OK (not a blunder) but
  // there were objectively better alternatives.
  // For moves 1–15, skip moves that are in known opening theory (Lichess explorer).
  const playerMoveEvals = moveEvals.filter((e) => e.side === ((gameContext.playerColor as "white" | "black") ?? "white"));
  let strongerMoveCount = 0;

  for (const me of playerMoveEvals) {
    if (strongerMoveCount >= MAX_STRONGER_MOVE_PER_GAME) break;
    // Only consider non-blunder moves that still lost some centipawns
    if (me.cpl < STRONGER_MOVE_MIN_CPL || me.cpl > STRONGER_MOVE_MAX_CPL) continue;

    // Find the position index for this move
    const posIdx = positions.findIndex((_p, idx) => {
      if (idx === 0) return false;
      const side: "white" | "black" = positions[idx - 1].fen.split(" ")[1] === "w" ? "white" : "black";
      const mn = Math.floor((idx - 1) / 2) + 1;
      return side === me.side && mn === me.moveNumber;
    });
    if (posIdx < 1) continue;
    const fen = positions[posIdx - 1].fen;
    const lastMove = posIdx >= 2 ? positions[posIdx - 2].uci : "";

    // Opening theory awareness: for moves 1–15, check embedded opening book.
    // If the played move is known theory, skip — don't flag it.
    let outOfTheory = false;
    if (me.moveNumber <= OPENING_THEORY_MOVE_LIMIT) {
      const inBook = isMoveInBook(fen, me.movePlayed);
      console.log(`[OpeningBook] Move ${me.moveNumber} (${me.side}): "${me.movePlayed}" fenKey="${fenKey(fen)}" → ${inBook ? "IN BOOK (skip)" : "OUT OF BOOK"}`);
      if (inBook) continue; // move is in known theory — don't flag
      outOfTheory = true; // deviated from opening book
    }

    // Get top 4 moves via MultiPV (need 4 to find up to 3 better than played)
    const multiPv = await analyzePositionMultiPV(fen, 4, ANALYSIS_DEPTH);
    if (multiPv.length < 2) continue;

    // Find the played move's eval from MultiPV (consistent source for threshold).
    // Fall back to me.evalCp if the played move isn't in the PV results.
    const playedPv = multiPv.find((pv) => pv.move === me.movePlayed);
    const playedCp = playedPv ? playedPv.cp : me.evalCp;
    const bestCp = multiPv[0].cp; // MultiPV[0] is always the best move

    // Use MultiPV-consistent threshold: best move must be ≥30cp better than played
    const multiPvDiff = bestCp - playedCp;
    if (multiPvDiff < STRONGER_MOVE_MIN_CP_DIFF) continue;

    // Collect alternatives that are genuinely better than the played move
    const alternatives: { move: string; cp: number }[] = [];

    for (const pv of multiPv) {
      if (pv.move === me.movePlayed) continue; // skip the move actually played
      if (pv.cp - playedCp >= STRONGER_MOVE_MIN_CP_DIFF) {
        alternatives.push({ move: pv.move, cp: pv.cp });
      }
    }

    if (alternatives.length === 0) continue;

    // Cap at 3 alternatives
    const topAlts = alternatives.slice(0, 3);

    // Build candidateMoves JSON: include played move + better alternatives
    const candidateMovesJson = JSON.stringify([
      { move: me.movePlayed, cp: playedCp, played: true },
      ...topAlts.map((a) => ({ move: a.move, cp: a.cp, played: false })),
    ]);

    candidates.push({
      id: clientId(),
      fen,
      solvingFen: fen,
      lastMove,
      solutionMoves: topAlts[0].move, // best alternative as the "solution"
      rating: estimateRating(me.cpl, 1),
      themes: "strongerMove",
      themeDescriptions: [`strongerMove — played ${me.movePlayed} (${playedCp}cp), better: ${topAlts.map((a) => `${a.move} (${a.cp}cp)`).join(", ")}`],
      type: "move_ranking",
      candidateMoves: candidateMovesJson,
      outOfTheory,
      gameUrl,
      ...gameContext,
      moveNumber: me.moveNumber,
      evalCp: playedCp,
    });
    strongerMoveCount++;
  }

  const playerSide = (gameContext.playerColor as "white" | "black") ?? "white";
  const accuracy = computeAccuracy(moveEvals, playerSide);

  return {
    candidates,
    moveEvals,
    accuracy,
    gameUrl,
    playerColor: playerSide,
    stoppedAt: positions.length,
    totalPositions: positions.length,
    complete: true,
    stockfishAvailable: true,
  };
}
