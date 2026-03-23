import "server-only";

/**
 * V2 Puzzle Extraction Pipeline
 *
 * Improvements over V1:
 *  1. Recursive forcing-move extension (checks, captures, threats) up to 10 ply
 *  2. Expanded tactic classification: pin, skewer, discovered attack/check,
 *     double check, deflection, zwischenzug, back rank weakness
 *  3. Same Puzzle schema + extractionVersion:"v2" marker
 */

import { Chess, type Square, type PieceSymbol, type Color } from "chess.js";
import { cuid } from "@/lib/cuid";
import { getBestMove, type EngineResult } from "./stockfish";

// ─── Constants ──────────────────────────────────────────────────────────────

const BLUNDER_THRESHOLD = 60; // centipawns
const MAX_PER_GAME = 5; // slightly higher cap for v2
const MAX_EXTENSION_PLY = 10;
const FORCING_ADVANTAGE_CP = 150; // minimum advantage to keep extending
const WINNING_THRESHOLD_CP = 300; // clearly winning = stop extending

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PuzzleCandidateV2 {
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
  extractionVersion: "v2";
}

export interface ExtractResultV2 {
  candidates: PuzzleCandidateV2[];
  stoppedAt: number;
  totalPositions: number;
  complete: boolean;
}

// ─── Rating estimation ──────────────────────────────────────────────────────

function estimateRating(swingCp: number, solutionDepth: number): number {
  // Base rating from swing
  let rating: number;
  if (swingCp >= 600) rating = 1200;
  else if (swingCp >= 400) rating = 1000;
  else if (swingCp >= 250) rating = 900;
  else rating = 800;
  // Bonus for longer forcing sequences
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

/**
 * Recursively extend a solution through forcing moves.
 * At each ply:
 *  - Player move: must be forcing (check, capture, or checkmate)
 *  - Opponent response: engine's best reply
 * Stops when:
 *  - Checkmate reached
 *  - No more forcing continuations
 *  - Advantage drops below threshold
 *  - Max ply reached
 */
async function extendForcingSequence(
  startFen: string,
  firstMove: string,
): Promise<string> {
  const moves: string[] = [firstMove];

  try {
    const chess = new Chess(startFen);
    // Play the first move (player's best move)
    const m1 = chess.move({
      from: firstMove.slice(0, 2) as Square,
      to: firstMove.slice(2, 4) as Square,
      promotion: (firstMove[4] as PieceSymbol) || undefined,
    });
    if (!m1) return firstMove;

    // If checkmate immediately, done
    if (chess.isCheckmate()) return firstMove;

    let ply = 1; // already played 1 move

    while (ply < MAX_EXTENSION_PLY) {
      // Opponent's response (engine best move)
      const opponentResult = await getBestMove(chess.fen());
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

      // Player's next move (engine best)
      const playerResult = await getBestMove(chess.fen());
      if (!playerResult) break;

      // Check if player's next move is forcing
      if (!isForcingMove(chess, playerResult.move)) {
        // Not forcing — only include if we're clearly winning
        if (playerResult.cp >= WINNING_THRESHOLD_CP) {
          // Include one more quiet winning move and stop
          const pm = chess.move({
            from: playerResult.move.slice(0, 2) as Square,
            to: playerResult.move.slice(2, 4) as Square,
            promotion: (playerResult.move[4] as PieceSymbol) || undefined,
          });
          if (pm) {
            moves.push(playerResult.move);
          }
        }
        break;
      }

      // Still forcing — check advantage threshold
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
    // On any error, return what we have
  }

  return moves.join(" ");
}

// ─── Tactic classification ──────────────────────────────────────────────────

type BoardSquare = { type: PieceSymbol; color: Color; square: Square } | null;

function getBoard(chess: Chess): BoardSquare[][] {
  return chess.board() as BoardSquare[][];
}

function sqToCoords(sq: Square): [number, number] {
  const file = sq.charCodeAt(0) - 97; // a=0 ... h=7
  const rank = parseInt(sq[1], 10) - 1; // 1=0 ... 8=7
  return [rank, file];
}

function coordsToSq(rank: number, file: number): Square | null {
  if (rank < 0 || rank > 7 || file < 0 || file > 7) return null;
  return (String.fromCharCode(97 + file) + String(rank + 1)) as Square;
}

/**
 * Check if a piece at `from` attacks `target` square along sliding directions.
 * For bishops, rooks, queens.
 */
function slidingAttacks(
  board: BoardSquare[][],
  from: Square,
  target: Square,
  directions: [number, number][],
): boolean {
  const [fr, ff] = sqToCoords(from);
  const [tr, tf] = sqToCoords(target);

  for (const [dr, df] of directions) {
    let r = fr + dr;
    let f = ff + df;
    while (r >= 0 && r <= 7 && f >= 0 && f <= 7) {
      if (r === tr && f === tf) return true;
      // Blocked by another piece
      const rank8 = 7 - r; // board array is rank8=0
      if (board[rank8][f]) return false;
      r += dr;
      f += df;
    }
  }
  return false;
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

/**
 * Find pieces aligned on a line through two squares (for pin/skewer detection).
 * Returns pieces along the ray from `through` extending past `target`.
 */
function findAlignedPiece(
  board: BoardSquare[][],
  attackerSq: Square,
  throughSq: Square,
): Square | null {
  const [ar, af] = sqToCoords(attackerSq);
  const [tr, tf] = sqToCoords(throughSq);
  const dr = Math.sign(tr - ar);
  const df = Math.sign(tf - af);
  // Continue past throughSq
  let r = tr - (7 - tr); // wrong — let me redo
  let cr = tr + dr; // rank index (0-7)
  let cf = tf + df;
  // Actually use sqToCoords which returns [rank, file] in 0-7
  // tr, tf are already 0-7, just continue the ray
  let rr = cr; // use different var names
  let ff = cf;
  // Fix: sqToCoords returns rank 0-7 (1-based minus 1)
  // Let me redo properly
  rr = tr + dr;
  ff = tf + df;
  while (rr >= 0 && rr <= 7 && ff >= 0 && ff <= 7) {
    const rank8 = 7 - rr;
    const piece = board[rank8][ff];
    if (piece) {
      return coordsToSq(rr, ff);
    }
    rr += dr;
    ff += df;
  }
  return null;
}

function detectThemes(chess: Chess, bestMoveUci: string): string[] {
  const themes: string[] = [];
  const from = bestMoveUci.slice(0, 2) as Square;
  const to = bestMoveUci.slice(2, 4) as Square;
  const promo = bestMoveUci[4] as PieceSymbol | undefined;

  // Get board state BEFORE the move
  const boardBefore = getBoard(chess);
  const movingPiece = chess.get(from);
  if (!movingPiece) return ["tactics"];

  const myColor = movingPiece.color;
  const oppColor: Color = myColor === "w" ? "b" : "w";

  // Play the move
  const moveResult = chess.move({ from, to, promotion: promo });
  if (!moveResult) return ["tactics"];

  // ── After-move analysis ──
  const boardAfter = getBoard(chess);

  // Checkmate
  if (chess.isCheckmate()) {
    themes.push("mateIn1");
    // Back rank mate detection
    const kingRank = oppColor === "w" ? "1" : "8";
    const oppKingSq = findKing(boardAfter, oppColor);
    if (oppKingSq && oppKingSq[1] === kingRank) {
      themes.push("backRankMate");
    }
  } else if (chess.inCheck()) {
    themes.push("check");
  }

  if (moveResult.captured) themes.push("capture");

  // ── Fork detection (piece attacks 2+ enemy pieces after move) ──
  const attackedEnemies = getAttackedSquares(chess, to, myColor, boardAfter)
    .filter((sq) => {
      const p = chess.get(sq);
      return p && p.color === oppColor;
    });
  if (attackedEnemies.length >= 2) {
    themes.push("fork");
  }

  // ── Pin detection ──
  // A pin exists when: moving piece at `to` attacks an enemy piece,
  // and behind that enemy piece (on the same ray) is a more valuable piece or the king
  if (["b", "r", "q"].includes(movingPiece.type)) {
    const dirs = getSlidingDirs(movingPiece.type);
    for (const enemySq of attackedEnemies) {
      const behindSq = findAlignedPiece(boardAfter, to, enemySq);
      if (behindSq) {
        const behindPiece = chess.get(behindSq);
        if (behindPiece && behindPiece.color === oppColor) {
          const pinnedPiece = chess.get(enemySq);
          if (behindPiece.type === "k") {
            themes.push("pin"); // absolute pin
          } else if (
            pinnedPiece &&
            pieceValue(behindPiece.type) > pieceValue(pinnedPiece.type)
          ) {
            themes.push("pin"); // relative pin
          }
        }
      }
    }
  }

  // ── Skewer detection ──
  // Opposite of pin: attacking a valuable piece, which must move exposing a piece behind
  if (["b", "r", "q"].includes(movingPiece.type)) {
    for (const enemySq of attackedEnemies) {
      const targetPiece = chess.get(enemySq);
      if (!targetPiece) continue;
      const behindSq = findAlignedPiece(boardAfter, to, enemySq);
      if (behindSq) {
        const behindPiece = chess.get(behindSq);
        if (
          behindPiece &&
          behindPiece.color === oppColor &&
          pieceValue(targetPiece.type) > pieceValue(behindPiece.type)
        ) {
          themes.push("skewer");
        }
      }
    }
  }

  // ── Discovered attack / discovered check ──
  // The moved piece was blocking an attack from a friendly sliding piece
  // Check if any friendly sliding piece now attacks enemy pieces through `from`
  const friendlySlidingPieces = findFriendlySlidingPiecesThrough(
    boardBefore,
    from,
    myColor,
  );
  for (const { sq: sliderSq, type: sliderType } of friendlySlidingPieces) {
    const dirs = getSlidingDirs(sliderType);
    // After the move, check if the slider can now reach enemy pieces through `from`
    const nowAttacks = getAttackedSquares(chess, sliderSq, myColor, boardAfter)
      .filter((sq) => {
        const p = chess.get(sq);
        return p && p.color === oppColor;
      });
    if (nowAttacks.length > 0) {
      // Check if any attacked piece is the king → discovered check
      const attacksKing = nowAttacks.some((sq) => {
        const p = chess.get(sq);
        return p && p.type === "k";
      });
      if (attacksKing) {
        themes.push("discoveredCheck");
      } else {
        themes.push("discoveredAttack");
      }
    }
  }

  // ── Double check ──
  if (chess.inCheck()) {
    // Count number of pieces giving check
    const oppKingSq = findKing(boardAfter, oppColor);
    if (oppKingSq) {
      let checkCount = 0;
      // Check from the moved piece
      const movedPieceAttacks = getAttackedSquares(chess, to, myColor, boardAfter);
      if (movedPieceAttacks.some((sq) => sq === oppKingSq)) checkCount++;
      // Check from discovered piece
      for (const { sq: sliderSq } of friendlySlidingPieces) {
        const sliderAttacks = getAttackedSquares(chess, sliderSq, myColor, boardAfter);
        if (sliderAttacks.some((sq) => sq === oppKingSq)) checkCount++;
      }
      if (checkCount >= 2) themes.push("doubleCheck");
    }
  }

  // ── Back rank weakness (non-mate) ──
  if (!themes.includes("backRankMate")) {
    const oppKingSq = findKing(boardAfter, oppColor);
    if (oppKingSq) {
      const kingRank = oppColor === "w" ? "1" : "8";
      if (oppKingSq[1] === kingRank) {
        // King is on back rank — check if it's hemmed in by own pawns
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
            themes.push("backRankWeakness");
          }
        }
      }
    }
  }

  // ── Zwischenzug detection ──
  // If the previous move was a capture, and instead of recapturing we play a different
  // forcing move (check or bigger threat), that's a zwischenzug
  const history = chess.history({ verbose: true });
  if (history.length >= 2) {
    const prevMove = history[history.length - 2]; // opponent's last move
    if (prevMove?.captured && moveResult.to !== prevMove.to) {
      // We didn't recapture — if our move is a check, it's likely a zwischenzug
      if (chess.inCheck() || themes.includes("fork")) {
        themes.push("zwischenzug");
      }
    }
  }

  chess.undo();

  // Deduplicate
  return [...new Set(themes.length > 0 ? themes : ["tactics"])];
}

function pieceValue(type: PieceSymbol): number {
  const values: Record<PieceSymbol, number> = {
    p: 1, n: 3, b: 3, r: 5, q: 9, k: 100,
  };
  return values[type] ?? 0;
}

function findKing(board: BoardSquare[][], color: Color): string | null {
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (p && p.type === "k" && p.color === color) {
        return p.square;
      }
    }
  }
  return null;
}

/**
 * Get squares attacked by the piece at `sq`.
 * Uses chess.js moves() with the piece as source.
 */
function getAttackedSquares(
  chess: Chess,
  sq: Square,
  color: Color,
  _board: BoardSquare[][],
): Square[] {
  // chess.moves() only works for the side to move, so we use board geometry
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
    // Sliding pieces: b, r, q
    const dirs = getSlidingDirs(piece.type);
    const board = _board;
    for (const [dr, df] of dirs) {
      let r = rank + dr;
      let f = file + df;
      while (r >= 0 && r <= 7 && f >= 0 && f <= 7) {
        const target = coordsToSq(r, f)!;
        attacked.push(target);
        const rank8 = 7 - r;
        if (board[rank8][f]) break; // blocked
        r += dr;
        f += df;
      }
    }
  }

  return attacked;
}

/**
 * Find friendly sliding pieces that were aligned through `throughSq` before the move.
 */
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
        if (
          p.color === color &&
          ["b", "r", "q"].includes(p.type)
        ) {
          // Check if this piece type can slide along this direction
          const dirs = getSlidingDirs(p.type);
          if (dirs.some(([d1, d2]) => d1 === -dr && d2 === -df)) {
            result.push({ sq: p.square as Square, type: p.type });
          }
        }
        break; // blocked
      }
      r += dr;
      f += df;
    }
  }

  return result;
}

// ─── PGN helpers (shared with v1) ───────────────────────────────────────────

function parsePgn(pgn: string): Chess | null {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    return chess;
  } catch {
    return null;
  }
}

function getPositionSequence(pgn: string): { fen: string; uci: string }[] {
  const chess = parsePgn(pgn);
  if (!chess) return [];
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

// ─── Main extraction ────────────────────────────────────────────────────────

export async function extractPuzzlesV2(
  pgn: string,
  userId: string,
  playerUsername?: string,
): Promise<ExtractResultV2> {
  const gameUrl = extractGameUrl(pgn);
  const gameContext = extractGameContext(pgn, playerUsername);
  const positions = getPositionSequence(pgn);

  console.log(`[extract-v2] Game: ${gameUrl ?? "unknown"} | positions=${positions.length} | player=${playerUsername ?? "?"} | color=${gameContext.playerColor ?? "unknown"}`);

  if (positions.length < 5) {
    console.log(`[extract-v2] Skipped — too few positions (${positions.length})`);
    return { candidates: [], stoppedAt: positions.length, totalPositions: positions.length, complete: true };
  }

  const playerTurn: "w" | "b" | null =
    gameContext.playerColor === "white" ? "w"
    : gameContext.playerColor === "black" ? "b"
    : null;

  const candidates: PuzzleCandidateV2[] = [];
  let prevCp: number | null = null;
  let prevBestMove: string | null = null;
  let positionsEvaluated = 0;

  for (let i = 0; i < positions.length; i++) {
    if (candidates.length >= MAX_PER_GAME) break;

    const { fen } = positions[i];
    const result = await getBestMove(fen);
    if (!result) {
      prevCp = null;
      prevBestMove = null;
      continue;
    }

    positionsEvaluated++;
    const currentCp = result.cp;

    if (prevCp !== null && prevBestMove !== null) {
      const blunderTurn = positions[i - 1].fen.split(" ")[1];

      if (playerTurn && blunderTurn !== playerTurn) {
        prevCp = currentCp;
        prevBestMove = result.move;
        continue;
      }

      const swing = prevCp - -currentCp;

      if (swing >= BLUNDER_THRESHOLD) {
        const { fen: blunderFen } = positions[i - 1];
        const lastMove = i >= 2 ? positions[i - 2].uci : "";

        // Detect themes on the solution move
        const solvingChess = new Chess(blunderFen);
        const themes = detectThemes(solvingChess, prevBestMove);

        // Recursive forcing extension
        const solutionMoves = await extendForcingSequence(blunderFen, prevBestMove);
        const solutionDepth = solutionMoves.split(" ").length;

        const moveNumber = Math.floor((i - 1) / 2) + 1;

        const candidate: PuzzleCandidateV2 = {
          id: cuid(),
          fen: blunderFen,
          solvingFen: blunderFen,
          lastMove,
          solutionMoves,
          rating: estimateRating(swing, solutionDepth),
          themes: themes.join(" "),
          type: "standard",
          source: "user_import",
          sourceUserId: userId,
          isPublic: false,
          gameUrl,
          ...gameContext,
          moveNumber,
          evalCp: prevCp,
          extractionVersion: "v2",
        };

        candidates.push(candidate);

        console.log(
          `[extract-v2] PUZZLE #${candidates.length}: ` +
          `move ${moveNumber} | swing=${swing}cp | ` +
          `solution="${solutionMoves}" (${solutionDepth} ply) | ` +
          `themes=[${themes.join(", ")}] | ` +
          `rating=${candidate.rating} | ` +
          `evalCp=${prevCp}`
        );
      }
    }

    prevCp = currentCp;
    prevBestMove = result.move;
  }

  console.log(`[extract-v2] Summary: evaluated=${positionsEvaluated} puzzlesFound=${candidates.length}`);

  return {
    candidates,
    stoppedAt: positions.length,
    totalPositions: positions.length,
    complete: true,
  };
}
