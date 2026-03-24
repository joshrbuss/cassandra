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
// Boundary-crossing thresholds for opponent_threat detection.
// A puzzle is generated when the user's move causes the eval to cross
// a meaningful boundary — winning→equal, equal→losing, or winning→losing.
const WINNING_BOUNDARY = 150;  // above this = "winning"
const EQUAL_BOUNDARY = 100;    // below this (and above -EQUAL_BOUNDARY) = "roughly equal"
const LOSING_BOUNDARY = -150;  // below this = "losing"
// Threat/bluff detection
const THREAT_BLUFF_MIN_SWING = 80;     // opponent's move must create ≥80cp "apparent" danger
const THREAT_BLUFF_BAIT_PENALTY = 60;  // taking bait must lose ≥60cp vs correct response to be a bluff
const MAX_THREAT_BLUFF_PER_GAME = 2;

// Retrograde detection
const RETROGRADE_MIN_EVAL_SHIFT = 50;  // previous move must have caused ≥50cp shift
const RETROGRADE_DECOY_COUNT = 3;      // number of wrong-answer decoy moves
const MAX_RETROGRADE_PER_GAME = 2;

// Position scoring: minimum score to keep a puzzle (0-100)
const MIN_PUZZLE_SCORE = 40;

// ─── Position classifier thresholds (configurable) ──────────────────────────
const CLASSIFIER_MULTIPV = 5;          // number of PV lines for entropy calc
const CLASSIFIER_DEPTH = ANALYSIS_DEPTH; // reuse pipeline depth
const ENTROPY_HIGH_THRESHOLD = 40;     // std dev of top N evals above this = "high entropy"
const ENTROPY_LOW_THRESHOLD = 15;      // below this = "low entropy"
const DELTA_HIGH_THRESHOLD = 80;       // best move advantage above this = "high delta"
const DELTA_LOW_THRESHOLD = 30;        // below this = "low delta"

const MAX_EXTENSION_PLY = 10;
const FORCING_ADVANTAGE_CP = 150;
const WINNING_THRESHOLD_CP = 300;

// ─── Types ──────────────────────────────────────────────────────────────────

export type PuzzleType = "standard" | "move_ranking" | "opponent_threat" | "threat_bluff" | "retrograde_v2";

export type PositionClassificationType = "forcing" | "quiet_best" | "positional" | "chaotic";

export interface PositionClassification {
  /** Standard deviation of Stockfish top-N move evals */
  moveEntropy: number;
  /** "forcing" | "quiet_best" | "positional" | "chaotic" */
  classification: PositionClassificationType;
  /** Game phase at this position */
  gamePhase: "opening" | "middlegame" | "endgame";
  /** Eval delta: best move cp minus second-best move cp */
  evalDelta: number;
}

export interface Variation {
  move: string;
  source: "engine" | "markov" | "behavioral";
  weight: number;
  continuation: string | null;
}

export interface PuzzleCandidateV2 {
  id: string;
  fen: string;
  solvingFen: string;
  lastMove: string;
  solutionMoves: string;
  rating: number;
  themes: string;
  type: PuzzleType;
  /** JSON stringified CandidateMove[] for move_ranking puzzles */
  candidateMoves?: string;
  /** Detailed theme descriptions for verification */
  themeDescriptions?: string[];
  /** True if the move deviated from opening database theory (move_ranking only) */
  outOfTheory?: boolean;
  /** ID of the parent move_ranking puzzle (opponent_threat only) */
  parentPuzzleId?: string;
  /** Opponent's best reply UCI (opponent_threat step 1 answer) */
  opponentBestMove?: string;
  /** User's best counter-response UCI (opponent_threat step 2 answer) */
  counterMove?: string;
  /** "real_threat" | "bluff" — for threat_bluff puzzles */
  threatBluffAnswer?: "real_threat" | "bluff";
  /** JSON stringified decoy moves for retrograde_v2 MCQ [{uci,san,resultFen}] */
  decoyMoves?: string;
  /** Extraction confidence score (0–100) */
  score?: number;

  // ── Position classification (computed at extraction time) ──
  /** Std dev of Stockfish top-5 move evals */
  moveEntropy?: number;
  /** "forcing" | "quiet_best" | "positional" | "chaotic" */
  classification?: PositionClassificationType;
  /** "opening" | "middlegame" | "endgame" */
  gamePhase?: "opening" | "middlegame" | "endgame";

  // ── Variation tree (engine top 3, stub for markov/behavioral) ──
  /** JSON stringified Variation[] */
  variations?: string;

  // ── Annotation puzzle support (data layer only, no UI yet) ──
  annotationType?: "move_input" | "highlight_squares" | "identify_piece" | null;
  /** e.g. ["e5", "d6"] for highlight puzzles */
  targetSquares?: string[];
  /** e.g. "Bb3" for identify_piece puzzles */
  targetPiece?: string | null;

  // ── Context ──
  sourceGameId?: string;
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

// ─── Position classifier ────────────────────────────────────────────────────

/**
 * Classify a position by running MultiPV and computing move entropy
 * (std dev of top-N evals) and eval delta (best minus second-best).
 *
 * Returns classification, entropy, delta, and game phase.
 */
export async function classifyPosition(
  fen: string,
  moveNumber: number,
): Promise<PositionClassification> {
  const gamePhase = getPhase(moveNumber, fen);

  const pvs = await analyzePositionMultiPV(fen, CLASSIFIER_MULTIPV, CLASSIFIER_DEPTH);
  if (pvs.length < 2) {
    // Not enough data — default to forcing (only one legal move or engine failure)
    return { moveEntropy: 0, classification: "forcing", gamePhase, evalDelta: 9999 };
  }

  const evals = pvs.map((pv) => pv.cp);

  // Eval delta: gap between best and second-best move
  const evalDelta = Math.abs(evals[0] - evals[1]);

  // Move entropy: std dev of all top-N evals
  const mean = evals.reduce((s, v) => s + v, 0) / evals.length;
  const variance = evals.reduce((s, v) => s + (v - mean) ** 2, 0) / evals.length;
  const moveEntropy = Math.round(Math.sqrt(variance) * 10) / 10;

  // Classification matrix:
  //                  low delta          high delta
  // low entropy  → quiet_best         forcing
  // high entropy → positional         chaotic
  const highDelta = evalDelta >= DELTA_HIGH_THRESHOLD;
  const lowDelta = evalDelta < DELTA_LOW_THRESHOLD;
  const highEntropy = moveEntropy >= ENTROPY_HIGH_THRESHOLD;

  let classification: PositionClassificationType;
  if (highDelta && !highEntropy) classification = "forcing";
  else if (highDelta && highEntropy) classification = "chaotic";
  else if (!highDelta && highEntropy) classification = "positional";
  else if (lowDelta && !highEntropy) classification = "quiet_best";
  else classification = "quiet_best"; // middle ground defaults to quiet_best

  return { moveEntropy, classification, gamePhase, evalDelta };
}

/**
 * Build a variation tree stub from MultiPV engine results.
 * Source is always "engine" for now; markov/behavioral will be added later.
 */
function buildVariations(pvs: EngineResult[]): Variation[] {
  return pvs.slice(0, 3).map((pv) => ({
    move: pv.move,
    source: "engine" as const,
    weight: pv.cp,
    continuation: pv.pv ?? null,
  }));
}

// ─── Stub extractors (function signatures only, no logic yet) ───────────────

/**
 * Prophylaxis puzzle extractor (stub).
 *
 * Trigger: classification === "positional" AND the engine's best move
 * disagrees with the predicted player move (Markov model, future).
 *
 * The idea: positions where many moves look equal but one quiet move
 * is necessary to prevent the opponent's plan.
 */
export async function extractProphylaxisPuzzle(
  _fen: string,
  _classification: PositionClassification,
  _engineBestMove: string,
  _predictedPlayerMove?: string,
): Promise<PuzzleCandidateV2 | null> {
  // TODO: implement when Markov model is available
  // Trigger: classification.classification === "positional"
  //   && predictedPlayerMove !== engineBestMove
  return null;
}

/**
 * Bad-piece puzzle extractor (stub).
 *
 * Trigger: a piece has a mobility score below a threshold and has been
 * stationary (same square) for 5+ consecutive moves.
 *
 * The idea: identify the worst-placed piece and find the move that
 * improves it. Teaches piece activity awareness.
 */
export async function extractBadPiecePuzzle(
  _fen: string,
  _moveHistory: MoveEvalData[],
  _classification: PositionClassification,
): Promise<PuzzleCandidateV2 | null> {
  // TODO: implement piece mobility scoring
  // Trigger: piece on same square for 5+ moves with low mobility
  return null;
}

// ─── Accuracy calculation ───────────────────────────────────────────────────

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

    const moveRankingId = clientId();
    candidates.push({
      id: moveRankingId,
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

    // ── Opponent threat detection ──
    // Check if the user's suboptimal move created a concrete tactical opportunity.
    // Apply the user's played move, then check opponent's best reply vs what would
    // have happened after the user's best move.
    try {
      // Position after user's suboptimal move (opponent to move)
      const afterPlayed = new Chess(fen);
      const playedMoveResult = afterPlayed.move({
        from: me.movePlayed.slice(0, 2),
        to: me.movePlayed.slice(2, 4),
        promotion: me.movePlayed[4] || undefined,
      });
      if (playedMoveResult) {
        const threatFen = afterPlayed.fen(); // opponent is to move here

        // Opponent's best reply after our suboptimal move
        const opponentReply = await analyzePosition(threatFen, ANALYSIS_DEPTH);
        if (opponentReply) {
          // Get SAN of the best alternative for descriptions
          const bestAlt = topAlts[0];
          const bestSan = (() => {
            try {
              const c = new Chess(fen);
              const r = c.move({ from: bestAlt.move.slice(0, 2), to: bestAlt.move.slice(2, 4), promotion: bestAlt.move[4] || undefined });
              return r?.san ?? bestAlt.move;
            } catch { return bestAlt.move; }
          })();

          {
            // Eval before the user's move (from player's perspective) = bestCp from MultiPV.
            // Eval after opponent's best reply to our bad move (player's perspective):
            const playerEvalAfterThreat = -opponentReply.cp;
            const evalBefore = bestCp; // what we had if we played correctly

            // Boundary-crossing detection:
            // Winning→equal: was above +150, now below +100
            // Equal→losing:  was above -100, now below -150
            // Winning→losing: crossed zero (was positive, now negative)
            const winningToEqual = evalBefore > WINNING_BOUNDARY && playerEvalAfterThreat < EQUAL_BOUNDARY;
            const equalToLosing = evalBefore > -EQUAL_BOUNDARY && playerEvalAfterThreat < LOSING_BOUNDARY;
            const winningToLosing = evalBefore > 0 && playerEvalAfterThreat < 0;
            const crossedBoundary = winningToEqual || equalToLosing || winningToLosing;

            if (crossedBoundary) {
              // Apply opponent's threat move to find the counter-response position
              const afterThreat = new Chess(threatFen);
              const threatMoveResult = afterThreat.move({
                from: opponentReply.move.slice(0, 2),
                to: opponentReply.move.slice(2, 4),
                promotion: opponentReply.move[4] || undefined,
              });

              if (threatMoveResult) {
                const counterFen = afterThreat.fen(); // user must respond to the threat
                const counterReply = await analyzePosition(counterFen, ANALYSIS_DEPTH);

                if (counterReply) {
                  // Get SAN for readable descriptions
                  const playedSan = playedMoveResult.san;
                  const threatSan = threatMoveResult.san;
                  const counterSan = (() => {
                    try {
                      const c = new Chess(counterFen);
                      const r = c.move({
                        from: counterReply.move.slice(0, 2),
                        to: counterReply.move.slice(2, 4),
                        promotion: counterReply.move[4] || undefined,
                      });
                      return r?.san ?? counterReply.move;
                    } catch { return counterReply.move; }
                  })();

                  // solutionMoves: step 1 (find threat) + step 2 (counter it)
                  const solutionMoves = `${opponentReply.move} ${counterReply.move}`;

                  // Describe which boundary was crossed
                  const boundaryLabel =
                    winningToLosing ? "turned a winning position into a losing one"
                    : equalToLosing ? "let a holdable position slip into a loss"
                    : "gave away your advantage";

                  candidates.push({
                    id: clientId(),
                    fen: fen, // original position (before user's move)
                    solvingFen: threatFen, // position after user's suboptimal move
                    lastMove: me.movePlayed,
                    solutionMoves,
                    rating: Math.min(estimateRating(me.cpl, 2) + 100, 1800),
                    themes: "opponentThreat",
                    themeDescriptions: [
                      `you played ${playedSan} instead of ${bestSan} — ${boundaryLabel}. Your opponent can play ${threatSan}`,
                      `best response: ${counterSan}`,
                    ],
                    type: "opponent_threat",
                    parentPuzzleId: moveRankingId,
                    opponentBestMove: opponentReply.move,
                    counterMove: counterReply.move,
                    gameUrl,
                    ...gameContext,
                    moveNumber: me.moveNumber,
                    evalCp: playerEvalAfterThreat,
                  });
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[V2 Extract] opponent_threat detection failed for move ${me.moveNumber}:`, err);
    }
  }

  // ── Threat/bluff detection ──
  // Look for opponent moves that create apparent danger. Is it a real threat
  // or a trap/bluff that the player should ignore?
  const opponentSide: "white" | "black" = (gameContext.playerColor === "white" ? "black" : "white");
  const opponentMoveEvals = moveEvals.filter((e) => e.side === opponentSide);
  let threatBluffCount = 0;

  for (const oe of opponentMoveEvals) {
    if (threatBluffCount >= MAX_THREAT_BLUFF_PER_GAME) break;

    // We need the position AFTER the opponent's move (player to respond)
    // and the eval shift caused by the opponent's move
    const posIdx = positions.findIndex((_p, idx) => {
      if (idx === 0) return false;
      const side: "white" | "black" = positions[idx - 1].fen.split(" ")[1] === "w" ? "white" : "black";
      const mn = Math.floor((idx - 1) / 2) + 1;
      return side === oe.side && mn === oe.moveNumber;
    });
    if (posIdx < 1 || posIdx >= positions.length) continue;

    const fenBeforeOpMove = positions[posIdx - 1].fen;
    const fenAfterOpMove = positions[posIdx].fen;
    const opMoveUci = positions[posIdx - 1].uci;

    // The opponent's move must create "apparent danger" — a big eval swing from
    // the opponent's perspective, suggesting an aggressive/tactical move
    if (oe.cpl > 30) continue; // opponent played badly — not a threat
    const swing = Math.abs(oe.bestMoveCp - oe.evalCp);
    if (swing < THREAT_BLUFF_MIN_SWING) continue; // not dramatic enough

    // Check: what does the opponent's move look like?
    // Captures, checks, pieces moving toward king = "apparent threat"
    try {
      const checkChess = new Chess(fenBeforeOpMove);
      const moveResult = checkChess.move({
        from: opMoveUci.slice(0, 2), to: opMoveUci.slice(2, 4),
        promotion: opMoveUci[4] || undefined,
      });
      if (!moveResult) continue;

      const isCapture = !!moveResult.captured;
      const isCheck = checkChess.isCheck();
      const isSacrifice = isCapture && oe.evalCp > oe.bestMoveCp; // gave up material but position is fine

      if (!isCapture && !isCheck && !isSacrifice) continue; // not visually threatening

      // Now analyse: what happens if the player responds to the "threat" naively
      // vs correctly?
      const multiPv = await analyzePositionMultiPV(fenAfterOpMove, 3, ANALYSIS_DEPTH);
      if (multiPv.length < 2) continue;

      const bestResponse = multiPv[0]; // correct response
      // "Naive" response: the most tempting-looking bad move (usually recapture)
      const naiveResponses = multiPv.slice(1);
      const baitPenalty = bestResponse.cp - (naiveResponses[0]?.cp ?? bestResponse.cp);

      // Determine: bluff or real threat?
      let answer: "bluff" | "real_threat";
      let tags: string[] = [];
      let description: string;

      if (baitPenalty >= THREAT_BLUFF_BAIT_PENALTY) {
        // Taking the bait / panicking costs material → it's a bluff
        answer = "bluff";
        tags = isSacrifice ? ["sacrifice_lure"] : isCheck ? ["check_bluff"] : ["trap"];
        const bestSan = (() => {
          try { const c = new Chess(fenAfterOpMove); const r = c.move({ from: bestResponse.move.slice(0, 2), to: bestResponse.move.slice(2, 4), promotion: bestResponse.move[4] || undefined }); return r?.san ?? bestResponse.move; } catch { return bestResponse.move; }
        })();
        description = `opponent played ${moveResult.san} — looks dangerous but the correct response is ${bestSan}, not ${naiveResponses[0]?.move ?? "panicking"}`;
      } else if (bestResponse.cp <= -50) {
        // Even the best response leaves us worse — real threat
        answer = "real_threat";
        tags = isCheck ? ["real_threat", "check"] : isCapture ? ["real_threat", "fork_setup"] : ["real_threat"];
        const bestSan = (() => {
          try { const c = new Chess(fenAfterOpMove); const r = c.move({ from: bestResponse.move.slice(0, 2), to: bestResponse.move.slice(2, 4), promotion: bestResponse.move[4] || undefined }); return r?.san ?? bestResponse.move; } catch { return bestResponse.move; }
        })();
        description = `opponent played ${moveResult.san} — this is a genuine threat. Best defense: ${bestSan}`;
      } else {
        continue; // ambiguous — neither clearly bluff nor clearly dangerous
      }

      // Score: higher for clearer signals
      const signalStrength = answer === "bluff" ? baitPenalty : Math.abs(bestResponse.cp);
      const puzzleScore = Math.min(100, Math.round(40 + signalStrength / 3));
      if (puzzleScore < MIN_PUZZLE_SCORE) continue;

      candidates.push({
        id: clientId(),
        fen: fenBeforeOpMove,
        solvingFen: fenAfterOpMove,
        lastMove: opMoveUci,
        solutionMoves: bestResponse.move,
        rating: Math.min(1200 + Math.round(signalStrength / 2), 1800),
        themes: tags.join(" "),
        themeDescriptions: [description],
        type: "threat_bluff",
        threatBluffAnswer: answer,
        score: puzzleScore,
        gameUrl,
        ...gameContext,
        moveNumber: oe.moveNumber,
        evalCp: bestResponse.cp,
      });
      threatBluffCount++;
    } catch (err) {
      console.warn(`[V2 Extract] threat_bluff detection failed for move ${oe.moveNumber}:`, err);
    }
  }

  // ── Retrograde detection ──
  // Find positions where the previous move caused a significant eval shift or
  // structural change that isn't immediately obvious. The puzzle asks: "what
  // was the last move?"
  let retrogradeCount = 0;

  for (let i = 2; i < positions.length && retrogradeCount < MAX_RETROGRADE_PER_GAME; i++) {
    // We need at least 2 prior positions to have the move and a "before" position
    const fenBefore = positions[i - 1].fen; // position before the move
    const fenAfter = positions[i].fen;      // position after the move
    const moveUci = positions[i - 1].uci;   // the move itself

    // Only consider the player's moves (the lesson is about what happened to them)
    const moveSide: "white" | "black" = fenBefore.split(" ")[1] === "w" ? "white" : "black";
    const moveNum = Math.floor((i - 1) / 2) + 1;

    // Skip very early opening moves (boring) and very late endgame (limited pieces)
    if (moveNum < 5 || moveNum > 40) continue;

    // Find this move's eval data
    const meVal = moveEvals.find((e) => e.side === moveSide && e.moveNumber === moveNum);
    if (!meVal) continue;

    // The move must have caused a meaningful eval shift
    const evalShift = Math.abs(meVal.bestMoveCp - meVal.evalCp);
    if (evalShift < RETROGRADE_MIN_EVAL_SHIFT) continue;

    // Detect structural tags
    try {
      const beforeChess = new Chess(fenBefore);
      const moveResult = beforeChess.move({
        from: moveUci.slice(0, 2), to: moveUci.slice(2, 4),
        promotion: moveUci[4] || undefined,
      });
      if (!moveResult) continue;

      const retroTags: string[] = [];
      const isCheck = beforeChess.isCheck();
      const isCapture = !!moveResult.captured;
      const isPawnMove = moveResult.piece === "p";
      const movedToRank = parseInt(moveResult.to[1]);
      const isKingMove = moveResult.piece === "k";

      // Tag detection
      if (isPawnMove && (movedToRank === 4 || movedToRank === 5)) retroTags.push("pawn_break");
      if (moveResult.piece === "n" || moveResult.piece === "b" || moveResult.piece === "r" || moveResult.piece === "q") {
        // Piece activation: piece moves from back rank to active square
        const fromRank = parseInt(moveResult.from[1]);
        if ((moveSide === "white" && fromRank <= 2 && movedToRank >= 4) ||
            (moveSide === "black" && fromRank >= 7 && movedToRank <= 5)) {
          retroTags.push("piece_activation");
        }
      }
      if (isKingMove) retroTags.push("king_exposure");
      if (isCheck && !isCapture) retroTags.push("zwischenzug");
      if (!isCapture && !isCheck && evalShift >= 100) retroTags.push("quiet_move");

      if (retroTags.length === 0 && evalShift < 80) continue; // not interesting enough without tags

      // Generate decoy moves (plausible but wrong answers for MCQ)
      const allLegalMoves = new Chess(fenBefore).moves({ verbose: true });
      const excluded = new Set([moveUci]);
      const decoys: { uci: string; san: string; resultFen: string }[] = [];

      // Score decoys by plausibility (captures, checks, same-piece moves score higher)
      const decoyCandidates = allLegalMoves
        .filter((m) => {
          const uci = `${m.from}${m.to}${m.promotion ?? ""}`;
          return !excluded.has(uci);
        })
        .map((m) => {
          const uci = `${m.from}${m.to}${m.promotion ?? ""}`;
          let plausibility = Math.random();
          if (m.captured) plausibility += 2;
          if (m.san.includes("+") || m.san.includes("#")) plausibility += 1.5;
          if (m.piece === moveResult.piece) plausibility += 1;
          if (m.from === moveResult.from) plausibility += 0.5; // same piece
          return { uci, san: m.san, plausibility, move: m };
        })
        .sort((a, b) => b.plausibility - a.plausibility);

      for (const dc of decoyCandidates.slice(0, RETROGRADE_DECOY_COUNT)) {
        const preview = new Chess(fenBefore);
        preview.move({ from: dc.move.from, to: dc.move.to, promotion: dc.move.promotion });
        decoys.push({ uci: dc.uci, san: dc.san, resultFen: preview.fen() });
      }

      if (decoys.length < 2) continue; // need enough wrong answers

      // Score: structural tags + eval shift + not a simple recapture
      let puzzleScore = 30;
      puzzleScore += Math.min(30, evalShift / 5);
      puzzleScore += retroTags.length * 10;
      if (!isCapture) puzzleScore += 10; // non-captures are harder to spot
      if (retroTags.includes("quiet_move")) puzzleScore += 15;
      puzzleScore = Math.min(100, Math.round(puzzleScore));
      if (puzzleScore < MIN_PUZZLE_SCORE) continue;

      const lastMove = i >= 2 ? positions[i - 2].uci : "";
      const moveSan = moveResult.san;

      candidates.push({
        id: clientId(),
        fen: fenBefore,
        solvingFen: fenAfter, // show the position AFTER the mystery move
        lastMove,
        solutionMoves: moveUci, // the correct answer is "what was just played"
        rating: Math.min(1000 + retroTags.length * 100 + Math.round(evalShift / 3), 1600),
        themes: retroTags.join(" "),
        themeDescriptions: [
          `the key move was ${moveSan} (${retroTags.join(", ") || "eval shift " + evalShift + "cp"})`,
        ],
        type: "retrograde_v2",
        decoyMoves: JSON.stringify(decoys),
        score: puzzleScore,
        gameUrl,
        ...gameContext,
        moveNumber: moveNum,
        evalCp: meVal.evalCp,
      });
      retrogradeCount++;
    } catch (err) {
      console.warn(`[V2 Extract] retrograde detection failed for move ${moveNum}:`, err);
    }
  }

  // ── Classify each candidate position & enrich with metadata ──
  // Runs MultiPV on each puzzle's solvingFen to compute entropy,
  // classification, variation tree, and game phase.
  const sourceGameId = gameUrl ?? `game-${Date.now()}`;
  for (const c of candidates) {
    try {
      const cls = await classifyPosition(c.solvingFen, c.moveNumber ?? 1);
      c.moveEntropy = cls.moveEntropy;
      c.classification = cls.classification;
      c.gamePhase = cls.gamePhase;

      // Build variation tree from same MultiPV data
      const pvs = await analyzePositionMultiPV(c.solvingFen, 3, CLASSIFIER_DEPTH);
      c.variations = JSON.stringify(buildVariations(pvs));

      // Attach context
      c.sourceGameId = sourceGameId;
    } catch {
      // Non-fatal — puzzle is still valid without classification
    }
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
