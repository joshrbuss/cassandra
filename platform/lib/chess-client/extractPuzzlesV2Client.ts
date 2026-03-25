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

// Counter puzzle detection
const COUNTER_THREAT_MIN_SHIFT = 50;   // opponent's move must create ≥50cp eval shift against player
const COUNTER_GAP_MIN = 60;            // counter-attack must be ≥60cp better than best defensive move
const MAX_COUNTER_PER_GAME = 2;

// Bad piece detection
const BAD_PIECE_STATIONARY_MIN = 5;   // piece must be on same square for ≥5 consecutive moves
const BAD_PIECE_MOBILITY_MAX = 3;     // piece must have ≤3 legal squares
const BAD_PIECE_DECIDED_EVAL = 300;   // skip positions where eval > ±300cp (decided game)
const MAX_BAD_PIECE_PER_GAME = 1;     // max 1 bad piece puzzle per game

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

export type PuzzleType = "standard" | "move_ranking" | "opponent_threat" | "threat_bluff" | "retrograde_v2" | "bad_piece" | "counter";

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

  // ── Counter puzzle fields ──
  /** The "natural" defensive move that the player would instinctively play (wrong answer) */
  defensiveMove?: string | null;

  // ── Bad piece puzzle fields ──
  /** Whether Stockfish's overall best move is the same as the piece activation move */
  engineAgrees?: boolean;
  /** Stockfish top move if different from the piece activation solution */
  engineMove?: string | null;
  /** How many consecutive moves the bad piece has been stationary */
  pieceStationary?: number;
  /** Number of legal squares available to the bad piece */
  mobilityScore?: number;

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
 * Counter puzzle extractor.
 *
 * Detects positions where the opponent just made a threatening move, but the
 * correct response is a counter-attack rather than defense. Trains the player
 * to ask "what if I ignore this threat and hit back?"
 *
 * Detection:
 * 1. Opponent's last move created a genuine threat (≥50cp eval shift against player)
 * 2. Stockfish best response is an offensive move (does not address the threat directly)
 * 3. The "natural" defensive move is ≥60cp worse than the counter-attack
 */
export async function extractCounterPuzzle(
  fenBeforeOpMove: string,
  fenAfterOpMove: string,
  opMoveUci: string,
  evalShift: number,
  moveNumber: number,
  gameUrl: string | undefined,
  gameContext: Record<string, unknown>,
): Promise<PuzzleCandidateV2 | null> {
  // Must be a genuine threat
  if (evalShift < COUNTER_THREAT_MIN_SHIFT) return null;

  const chess = new Chess(fenAfterOpMove);

  // Determine what the opponent's move threatens:
  // - Which player pieces are now attacked by the piece on its new square?
  // - Is the player in check?
  const inCheck = chess.inCheck();
  const opTo = opMoveUci.slice(2, 4) as Square;
  const opFrom = opMoveUci.slice(0, 2) as Square;
  const attackingPiece = chess.get(opTo);

  // Identify threatened squares — the squares the opponent's piece attacks
  // that contain our pieces, plus discovered attacks from the vacated square.
  const playerColor = chess.turn(); // player to move
  const oppColor: Color = playerColor === "w" ? "b" : "w";
  const board = getBoard(chess);

  const threatenedSquares = new Set<string>();

  if (attackingPiece && attackingPiece.color === oppColor) {
    const attacked = getAttackedSquares(chess, opTo, oppColor, board);
    for (const sq of attacked) {
      const p = chess.get(sq);
      if (p && p.color === playerColor) {
        threatenedSquares.add(sq);
      }
    }
  }

  // Discovered attacks: pieces that can now attack through the vacated square
  // Check each opponent sliding piece that might have been unblocked
  const discoveredAttackers = findFriendlySlidingPiecesThrough(board, opFrom, oppColor);
  for (const { sq: sliderSq } of discoveredAttackers) {
    const attacked = getAttackedSquares(chess, sliderSq, oppColor, board);
    for (const sq of attacked) {
      const p = chess.get(sq);
      if (p && p.color === playerColor) {
        threatenedSquares.add(sq);
      }
    }
  }

  // Need at least one threatened piece (or check) to qualify
  if (threatenedSquares.size === 0 && !inCheck) return null;

  // Get MultiPV to find best move + alternatives
  const multiPv = await analyzePositionMultiPV(fenAfterOpMove, 5, ANALYSIS_DEPTH);
  if (multiPv.length < 2) return null;

  const bestMove = multiPv[0];

  // Classify each MultiPV move as "defensive" or "offensive"
  // Defensive: addresses the threat directly
  //   - Moves a threatened piece away
  //   - Captures the attacker on opTo
  //   - Interposes (blocks an attack line)
  //   - If in check: king moves to non-attacking square, simple blocks
  // Offensive: everything else (ignores the threat, plays elsewhere)

  function isDefensiveMove(moveUci: string): boolean {
    const from = moveUci.slice(0, 2);
    const to = moveUci.slice(2, 4);

    // Moving a threatened piece away from danger
    if (threatenedSquares.has(from)) return true;

    // Capturing the attacking piece
    if (to === opTo) return true;

    // Interposing: moving a piece to block the attack line between
    // attacker and threatened piece. For simplicity, check if the
    // destination square is between the attacker and any threatened piece.
    if (attackingPiece && ["b", "r", "q"].includes(attackingPiece.type)) {
      for (const tSq of threatenedSquares) {
        if (isOnLineBetween(opTo, tSq as Square, to as Square)) return true;
      }
    }

    // If in check, king moves are inherently defensive
    if (inCheck) {
      const piece = chess.get(from as Square);
      if (piece && piece.type === "k") return true;
    }

    return false;
  }

  // Check if the best move is offensive (the core requirement)
  if (isDefensiveMove(bestMove.move)) return null; // best move IS defensive — no counter puzzle

  // Find the best defensive move from the remaining PV lines
  let bestDefensive: EngineResult | null = null;
  for (const pv of multiPv) {
    if (isDefensiveMove(pv.move)) {
      bestDefensive = pv;
      break; // MultiPV is sorted by eval, first defensive = best defensive
    }
  }

  // If there's no defensive move in top 5, we can't show a meaningful wrong answer.
  // Expand search: look through all legal moves to find the most natural defensive move.
  if (!bestDefensive) {
    const allMoves = chess.moves({ verbose: true });
    const defensiveMoves = allMoves.filter((m) => {
      const uci = `${m.from}${m.to}${m.promotion ?? ""}`;
      return isDefensiveMove(uci);
    });
    if (defensiveMoves.length === 0) return null; // no defensive moves exist — position is too forcing

    // Pick the most "natural" defensive move (captures of attacker first, then
    // moves of high-value threatened pieces)
    defensiveMoves.sort((a, b) => {
      // Capturing the attacker is the most natural
      if (a.to === opTo && b.to !== opTo) return -1;
      if (b.to === opTo && a.to !== opTo) return 1;
      // Moving a more valuable piece is more natural
      const aVal = pieceValue(a.piece);
      const bVal = pieceValue(b.piece);
      return bVal - aVal;
    });

    // Evaluate the most natural defensive move
    const topDefensive = defensiveMoves[0];
    const defUci = `${topDefensive.from}${topDefensive.to}${topDefensive.promotion ?? ""}`;
    const testChess = new Chess(fenAfterOpMove);
    try {
      testChess.move({ from: topDefensive.from, to: topDefensive.to, promotion: topDefensive.promotion });
      const defEval = await analyzePosition(testChess.fen(), ANALYSIS_DEPTH);
      if (defEval) {
        bestDefensive = { move: defUci, cp: -defEval.cp }; // flip perspective
      }
    } catch {
      return null;
    }
  }

  if (!bestDefensive) return null;

  // The counter-attack must be significantly better than defense
  const counterGap = bestMove.cp - bestDefensive.cp;
  if (counterGap < COUNTER_GAP_MIN) return null;

  // Extend the counter-attack into a forcing sequence
  const solutionMoves = await extendForcingSequence(fenAfterOpMove, bestMove.move);

  // Get SANs for readable descriptions
  const counterSan = (() => {
    try {
      const c = new Chess(fenAfterOpMove);
      const r = c.move({ from: bestMove.move.slice(0, 2), to: bestMove.move.slice(2, 4), promotion: bestMove.move[4] || undefined });
      return r?.san ?? bestMove.move;
    } catch { return bestMove.move; }
  })();

  const defensiveSan = (() => {
    try {
      const c = new Chess(fenAfterOpMove);
      const r = c.move({ from: bestDefensive.move.slice(0, 2), to: bestDefensive.move.slice(2, 4), promotion: bestDefensive.move[4] || undefined });
      return r?.san ?? bestDefensive.move;
    } catch { return bestDefensive.move; }
  })();

  const opMoveSan = (() => {
    try {
      const c = new Chess(fenBeforeOpMove);
      const r = c.move({ from: opMoveUci.slice(0, 2), to: opMoveUci.slice(2, 4), promotion: opMoveUci[4] || undefined });
      return r?.san ?? opMoveUci;
    } catch { return opMoveUci; }
  })();

  // Determine tags
  const tags: string[] = [];
  // counter_sacrifice: our counter-attack gives up material
  const counterTo = bestMove.move.slice(2, 4) as Square;
  const capturedByCounter = chess.get(counterTo);
  const counterFrom = bestMove.move.slice(0, 2) as Square;
  const counterPiece = chess.get(counterFrom);
  if (capturedByCounter && counterPiece && pieceValue(counterPiece.type) > pieceValue(capturedByCounter.type)) {
    tags.push("counter_sacrifice");
  }
  // faster_attack: our counter creates check or checkmate
  try {
    const testChess2 = new Chess(fenAfterOpMove);
    testChess2.move({ from: counterFrom, to: counterTo, promotion: bestMove.move[4] as PieceSymbol || undefined });
    if (testChess2.isCheckmate()) tags.push("faster_attack");
    else if (testChess2.inCheck()) tags.push("faster_attack");
  } catch { /* ignore */ }
  // ignore_threat: we're leaving a piece en prise
  if (threatenedSquares.size > 0) tags.push("ignore_threat");
  // Default tag
  if (tags.length === 0) tags.push("counter_thrust");

  // Score: higher when defensive move is tempting and counter is non-obvious
  let score = 40;
  score += Math.min(30, counterGap / 4); // bigger gap = clearer lesson
  if (inCheck) score += 10; // counter-attacking while in check is surprising
  if (tags.includes("counter_sacrifice")) score += 10;
  if (evalShift >= 100) score += 5; // bigger threat = more tempting to defend
  score = Math.min(100, Math.round(score));
  if (score < MIN_PUZZLE_SCORE) return null;

  return {
    id: clientId(),
    fen: fenBeforeOpMove,
    solvingFen: fenAfterOpMove,
    lastMove: opMoveUci,
    solutionMoves,
    rating: Math.min(1200 + Math.round(counterGap / 2), 1800),
    themes: tags.join(" "),
    themeDescriptions: [
      `after ${opMoveSan}, the natural response is ${defensiveSan} — but ${counterSan} is ${counterGap}cp better`,
    ],
    type: "counter",
    annotationType: "move_input",
    defensiveMove: bestDefensive.move,
    score,
    gameUrl,
    ...gameContext,
    moveNumber,
    evalCp: bestMove.cp,
  };
}

/**
 * Check if square `mid` lies on the line between `from` and `to`.
 * Used for interposition detection.
 */
function isOnLineBetween(from: Square, to: Square, mid: Square): boolean {
  const [fr, ff] = sqToCoords(from);
  const [tr, tf] = sqToCoords(to);
  const [mr, mf] = sqToCoords(mid);

  // Must be on the same line (rank, file, or diagonal)
  const dr = Math.sign(tr - fr);
  const df = Math.sign(tf - ff);
  if (dr === 0 && df === 0) return false;

  // Check mid is on the ray from→to
  const dmr = mr - fr;
  const dmf = mf - ff;
  if (dr === 0 && dmr !== 0) return false;
  if (df === 0 && dmf !== 0) return false;
  if (dr !== 0 && df !== 0) {
    if (Math.abs(dmr) !== Math.abs(dmf)) return false;
    if (Math.sign(dmr) !== dr || Math.sign(dmf) !== df) return false;
  } else if (dr !== 0) {
    if (Math.sign(dmr) !== dr) return false;
    if (dmf !== 0) return false;
  } else {
    if (Math.sign(dmf) !== df) return false;
    if (dmr !== 0) return false;
  }

  // Must be strictly between (not on from or to)
  const distFromTo = Math.max(Math.abs(tr - fr), Math.abs(tf - ff));
  const distFromMid = Math.max(Math.abs(mr - fr), Math.abs(mf - ff));
  return distFromMid > 0 && distFromMid < distFromTo;
}

/**
 * Compute mobility for a single piece: count legal moves from its square,
 * excluding captures into defended squares (losing exchanges).
 */
function computePieceMobility(chess: Chess, sq: Square): number {
  const piece = chess.get(sq);
  if (!piece) return 0;

  const myColor = piece.color;

  // Get all legal moves for this piece
  const legalMoves = chess.moves({ square: sq, verbose: true });

  let mobility = 0;
  for (const m of legalMoves) {
    if (!m.captured) {
      // Non-capture move — always counts
      mobility++;
    } else {
      // Capture — only count if it's not a losing exchange.
      // Check if the target square is defended by the opponent.
      const capturedValue = pieceValue(m.captured as PieceSymbol);
      const attackerValue = pieceValue(piece.type);

      // If we capture something worth more or equal, it's real mobility.
      // If we capture something worth less AND the square is defended, skip it.
      if (capturedValue >= attackerValue) {
        mobility++;
      } else {
        // Check if the square is defended: temporarily make the capture
        // and see if the opponent can recapture
        const testChess = new Chess(chess.fen());
        try {
          testChess.move({ from: m.from, to: m.to, promotion: m.promotion });
          const recaptures = testChess.moves({ verbose: true })
            .filter((rm) => rm.to === m.to && rm.captured);
          if (recaptures.length === 0) {
            mobility++; // undefended — real mobility
          }
          // else: defended capture into losing exchange — not real mobility
        } catch {
          // move failed — don't count
        }
      }
    }
  }

  return mobility;
}

/** Track which square each piece sits on across consecutive player moves. */
interface PieceTracker {
  /** Map from current square → number of consecutive player-moves it's been stationary */
  stationary: Map<string, number>;
}

function initPieceTracker(): PieceTracker {
  return { stationary: new Map() };
}

/**
 * Update piece tracker after a move. Call this for every move in the game,
 * but only increment stationary counters on the player's moves.
 *
 * Returns a map of non-pawn, non-king pieces → stationary count for the
 * player's side at this position.
 */
function updatePieceTracker(
  tracker: PieceTracker,
  fenBefore: string,
  moveUci: string,
  isPlayerMove: boolean,
): void {
  if (!isPlayerMove) return;

  const chess = new Chess(fenBefore);
  const playerColor = chess.turn(); // side to move = the player making this move

  // Snapshot: which squares have our non-pawn, non-king pieces?
  const currentPieceSquares = new Set<string>();
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (p && p.color === playerColor && p.type !== "p" && p.type !== "k") {
        currentPieceSquares.add(p.square);
      }
    }
  }

  // The moved piece resets its counter
  const fromSq = moveUci.slice(0, 2);

  // Increment stationary count for pieces that didn't move
  const newMap = new Map<string, number>();
  for (const sq of currentPieceSquares) {
    if (sq === fromSq) {
      // This piece just moved — it'll be on a new square, don't track old square
      continue;
    }
    const prev = tracker.stationary.get(sq) ?? 0;
    newMap.set(sq, prev + 1);
  }

  // The piece that moved lands on a new square — start at 0
  const toSq = moveUci.slice(2, 4);
  const movedPiece = chess.get(fromSq as Square);
  if (movedPiece && movedPiece.type !== "p" && movedPiece.type !== "k") {
    newMap.set(toSq, 0);
  }

  tracker.stationary = newMap;
}

/**
 * Bad-piece puzzle extractor.
 *
 * Trigger: a non-pawn piece has been stationary for 5+ consecutive player
 * moves AND has mobility ≤ 3 legal squares. Must be middlegame or endgame.
 *
 * Puzzle type: "identify_piece" annotation — player identifies the bad piece,
 * solution is the best move to activate it.
 */
export async function extractBadPiecePuzzle(
  fen: string,
  tracker: PieceTracker,
  moveNumber: number,
  evalCp: number,
  lastMove: string,
  gameUrl: string | undefined,
  gameContext: Record<string, unknown>,
): Promise<PuzzleCandidateV2 | null> {
  const chess = new Chess(fen);
  const phase = getPhase(moveNumber, fen);

  // Skip opening — pieces are naturally undeveloped
  if (phase === "opening") return null;

  // Skip decided positions — bad piece puzzles in won/lost games aren't instructive
  if (Math.abs(evalCp) > BAD_PIECE_DECIDED_EVAL) return null;

  const playerColor = chess.turn();

  // Find all candidate bad pieces: stationary ≥5 moves, mobility ≤3, non-pawn non-king
  interface BadPieceCandidate {
    square: Square;
    pieceType: PieceSymbol;
    stationary: number;
    mobility: number;
  }

  const badCandidates: BadPieceCandidate[] = [];

  for (const [sq, stationaryCount] of tracker.stationary.entries()) {
    if (stationaryCount < BAD_PIECE_STATIONARY_MIN) continue;

    const piece = chess.get(sq as Square);
    if (!piece || piece.color !== playerColor) continue;
    if (piece.type === "p" || piece.type === "k") continue;

    const mobility = computePieceMobility(chess, sq as Square);
    if (mobility > BAD_PIECE_MOBILITY_MAX) continue;

    badCandidates.push({
      square: sq as Square,
      pieceType: piece.type,
      stationary: stationaryCount,
      mobility,
    });
  }

  if (badCandidates.length === 0) return null;

  // Pick the worst piece: lowest mobility, then longest stationary streak
  badCandidates.sort((a, b) => {
    if (a.mobility !== b.mobility) return a.mobility - b.mobility;
    return b.stationary - a.stationary;
  });

  const worst = badCandidates[0];

  // Use Stockfish MultiPV to find the best move for this specific piece
  const multiPv = await analyzePositionMultiPV(fen, 5, ANALYSIS_DEPTH);
  if (multiPv.length === 0) return null;

  const overallBestMove = multiPv[0].move;

  // Filter MultiPV results to moves that move the identified bad piece
  const pieceMoves = multiPv.filter((pv) => pv.move.slice(0, 2) === worst.square);
  if (pieceMoves.length === 0) {
    // Stockfish doesn't think moving this piece is in the top 5 — still valid puzzle
    // but we need to find the best move for this piece ourselves
    const allMoves = chess.moves({ square: worst.square, verbose: true });
    if (allMoves.length === 0) return null;

    // Analyse each legal move for this piece to find the best one
    let bestPieceMove: string | null = null;
    let bestPieceEval = -Infinity;

    for (const m of allMoves) {
      const uci = `${m.from}${m.to}${m.promotion ?? ""}`;
      const testChess = new Chess(fen);
      try {
        testChess.move({ from: m.from, to: m.to, promotion: m.promotion });
        const evalResult = await analyzePosition(testChess.fen(), ANALYSIS_DEPTH);
        if (evalResult) {
          const evalFromPlayer = -evalResult.cp; // flip perspective
          if (evalFromPlayer > bestPieceEval) {
            bestPieceEval = evalFromPlayer;
            bestPieceMove = uci;
          }
        }
      } catch {
        continue;
      }
    }

    if (!bestPieceMove) return null;

    const engineAgrees = overallBestMove === bestPieceMove;

    // Score the puzzle
    let score = 40;
    if (!engineAgrees) score += 20; // more instructive tension
    if (worst.stationary >= 8) score += 10;
    else if (worst.stationary >= 6) score += 5;
    if (worst.mobility <= 1) score += 15;
    else if (worst.mobility === 0) score += 20;
    if (Math.abs(evalCp) > 200) score -= 10; // less instructive in lopsided positions
    score = Math.min(100, Math.max(0, Math.round(score)));
    if (score < MIN_PUZZLE_SCORE) return null;

    return {
      id: clientId(),
      fen,
      solvingFen: fen,
      lastMove,
      solutionMoves: bestPieceMove,
      rating: Math.min(1000 + worst.stationary * 50 + (3 - worst.mobility) * 50, 1600),
      themes: "badPiece",
      themeDescriptions: [
        `${pieceName(worst.pieceType)} on ${worst.square} has been stationary for ${worst.stationary} moves with only ${worst.mobility} legal squares`,
      ],
      type: "bad_piece",
      annotationType: "identify_piece",
      targetPiece: worst.square,
      engineAgrees,
      engineMove: engineAgrees ? null : overallBestMove,
      pieceStationary: worst.stationary,
      mobilityScore: worst.mobility,
      score,
      gameUrl,
      ...gameContext,
      moveNumber,
      evalCp,
    };
  }

  // Best activation move for this piece from MultiPV
  const bestPieceMove = pieceMoves[0];
  const engineAgrees = overallBestMove === bestPieceMove.move;

  // Score the puzzle
  let score = 40;
  if (!engineAgrees) score += 20; // more instructive tension
  if (worst.stationary >= 8) score += 10;
  else if (worst.stationary >= 6) score += 5;
  if (worst.mobility <= 1) score += 15;
  else if (worst.mobility === 0) score += 20;
  if (Math.abs(evalCp) > 200) score -= 10;
  score = Math.min(100, Math.max(0, Math.round(score)));
  if (score < MIN_PUZZLE_SCORE) return null;

  return {
    id: clientId(),
    fen,
    solvingFen: fen,
    lastMove,
    solutionMoves: bestPieceMove.move,
    rating: Math.min(1000 + worst.stationary * 50 + (3 - worst.mobility) * 50, 1600),
    themes: "badPiece",
    themeDescriptions: [
      `${pieceName(worst.pieceType)} on ${worst.square} has been stationary for ${worst.stationary} moves with only ${worst.mobility} legal squares`,
    ],
    type: "bad_piece",
    annotationType: "identify_piece",
    targetPiece: worst.square,
    engineAgrees,
    engineMove: engineAgrees ? null : overallBestMove,
    pieceStationary: worst.stationary,
    mobilityScore: worst.mobility,
    score,
    gameUrl,
    ...gameContext,
    moveNumber,
    evalCp,
  };
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

  // Piece position tracker for bad_piece detection
  const pieceTracker = initPieceTracker();

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

      // Update piece tracker for bad_piece detection
      const isPlayerMoveForTracker = playerTurn ? positions[i - 1].fen.split(" ")[1] === playerTurn : false;
      updatePieceTracker(pieceTracker, positions[i - 1].fen, positions[i - 1].uci, isPlayerMoveForTracker);

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

  // ── Counter puzzle detection ──
  // Find positions where the opponent just made a threatening move, but the
  // correct response is a counter-attack rather than defense.
  let counterCount = 0;
  for (const oe of opponentMoveEvals) {
    if (counterCount >= MAX_COUNTER_PER_GAME) break;

    // Find the position before and after the opponent's move
    const posIdx = positions.findIndex((_p, idx) => {
      if (idx === 0) return false;
      const side: "white" | "black" = positions[idx - 1].fen.split(" ")[1] === "w" ? "white" : "black";
      const mn = Math.floor((idx - 1) / 2) + 1;
      return side === oe.side && mn === oe.moveNumber;
    });
    if (posIdx < 1 || posIdx >= positions.length) continue;

    const fenBeforeOp = positions[posIdx - 1].fen;
    const fenAfterOp = positions[posIdx].fen;
    const opMoveUci = positions[posIdx - 1].uci;

    // Eval shift from the player's perspective: how much worse did it get?
    // oe.evalCp is from side-to-move perspective (opponent), so flip it
    const evalShift = Math.abs(oe.bestMoveCp - oe.evalCp);

    // Skip positions where opponent played badly (we want genuine threats)
    if (oe.cpl > 20) continue;

    // Skip opening (counter puzzles need tactical tension)
    const mn = oe.moveNumber;
    if (mn < 8) continue;

    try {
      const counterPuzzle = await extractCounterPuzzle(
        fenBeforeOp,
        fenAfterOp,
        opMoveUci,
        evalShift,
        mn,
        gameUrl,
        gameContext,
      );
      if (counterPuzzle) {
        candidates.push(counterPuzzle);
        counterCount++;
      }
    } catch (err) {
      console.warn(`[V2 Extract] counter detection failed for move ${mn}:`, err);
    }
  }

  // ── Bad piece detection ──
  // Scan positions where the player is to move, looking for pieces that
  // have been stationary for 5+ moves with low mobility.
  let badPieceCount = 0;
  if (playerTurn) {
    // We need to re-walk the positions to find the right spots to check,
    // but we already have the tracker populated from the main loop.
    // Check each player-move position using the move evals we collected.
    for (const me of playerMoveEvals) {
      if (badPieceCount >= MAX_BAD_PIECE_PER_GAME) break;

      const posIdx = positions.findIndex((_p, idx) => {
        if (idx === 0) return false;
        const side: "white" | "black" = positions[idx - 1].fen.split(" ")[1] === "w" ? "white" : "black";
        const mn = Math.floor((idx - 1) / 2) + 1;
        return side === me.side && mn === me.moveNumber;
      });
      if (posIdx < 1) continue;

      const positionFen = positions[posIdx - 1].fen;
      const lastMoveForBadPiece = posIdx >= 2 ? positions[posIdx - 2].uci : "";

      try {
        const badPiece = await extractBadPiecePuzzle(
          positionFen,
          pieceTracker,
          me.moveNumber,
          me.evalCp,
          lastMoveForBadPiece,
          gameUrl,
          gameContext,
        );
        if (badPiece) {
          candidates.push(badPiece);
          badPieceCount++;
        }
      } catch (err) {
        console.warn(`[V2 Extract] bad_piece detection failed for move ${me.moveNumber}:`, err);
      }
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
