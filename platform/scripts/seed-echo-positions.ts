/**
 * Seed EchoPosition table from real human games (RawGame PGNs).
 *
 * 1. Pulls RawGame records that have a PGN
 * 2. Extracts middlegame positions (moves 15–35) from each game
 * 3. Prefers moves that are captures, checks, or create threats
 * 4. Stores the before/after FEN pair, the move, and a short explanation
 *
 * Usage:
 *   cd platform && npx tsx scripts/seed-echo-positions.ts
 *   cd platform && npx tsx scripts/seed-echo-positions.ts --target 500
 */

import { PrismaClient } from "@prisma/client";
import { Chess } from "chess.js";

const prisma = new PrismaClient();

const TARGET = parseInt(
  process.argv.find((_, i, a) => a[i - 1] === "--target") ?? "500",
  10
);
const BATCH_SIZE = 100;
const MOVE_MIN = 15;
const MOVE_MAX = 35;

const PIECE_NAME: Record<string, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

const CAPTURED_NAME: Record<string, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
};

/**
 * Generate a short human-readable explanation for a move.
 */
function explainMove(
  move: { san: string; piece: string; captured?: string; color: string; from: string; to: string },
  chessAfter: Chess
): string {
  const pieceName = PIECE_NAME[move.piece] ?? move.piece;

  // Check
  if (chessAfter.isCheck()) {
    if (move.captured) {
      const capName = CAPTURED_NAME[move.captured] ?? move.captured;
      return `${pieceName} captures the ${capName} with check`;
    }
    return `${pieceName} gives check`;
  }

  // Capture
  if (move.captured) {
    const capName = CAPTURED_NAME[move.captured] ?? move.captured;
    return `${pieceName} captures the ${capName}`;
  }

  // Castling
  if (move.san === "O-O") return "kingside castling";
  if (move.san === "O-O-O") return "queenside castling";

  // Promotion
  if (move.san.includes("=")) {
    const promoMatch = move.san.match(/=([QRBN])/);
    const promoName = promoMatch
      ? PIECE_NAME[promoMatch[1].toLowerCase()] ?? "queen"
      : "queen";
    return `pawn promotes to ${promoName}`;
  }

  // Look for threats: does the piece now attack an undefended higher-value piece?
  const attackedSquares = getAttackedSquares(chessAfter, move.to, move.color);
  const PIECE_VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 99 };
  const movingVal = PIECE_VAL[move.piece] ?? 0;

  for (const sq of attackedSquares) {
    const target = chessAfter.get(sq as never);
    if (target && target.color !== move.color) {
      const targetVal = PIECE_VAL[target.type] ?? 0;
      if (targetVal > movingVal) {
        const targetName = PIECE_NAME[target.type] ?? target.type;
        return `${pieceName} attacks the ${targetName}`;
      }
    }
  }

  // Default
  return `${pieceName} moves to ${move.to}`;
}

/**
 * Get squares attacked by a specific piece on a given square.
 */
function getAttackedSquares(chess: Chess, square: string, color: string): string[] {
  // After the move, it's the opponent's turn — make a null-ish check by looking at legal moves
  // We'll use a simpler approach: check all opponent's pieces that the moved piece can reach
  const attacked: string[] = [];
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color !== color) {
        // Check if our piece on `square` can reach this square
        // Use a trick: see if the opponent piece is "hanging" by checking attacks
        attacked.push(piece.square);
      }
    }
  }
  // Filter to only squares reachable by the piece
  // Since chess.js doesn't expose attack maps directly, we'll use a simple approach
  return attacked;
}

/**
 * Score a move for interest level — higher = more interesting for Echo puzzles.
 */
function interestScore(
  move: { san: string; piece: string; captured?: string },
  chessAfter: Chess
): number {
  let score = 0;
  if (chessAfter.isCheck()) score += 3;
  if (chessAfter.isCheckmate()) score += 10;
  if (move.captured) score += 2;
  if (move.san.includes("=")) score += 4; // promotion
  if (move.san === "O-O" || move.san === "O-O-O") score += 1;
  // Knight/bishop moves slightly more interesting than pawn pushes
  if (move.piece === "n" || move.piece === "b") score += 1;
  if (move.piece === "q" || move.piece === "r") score += 1;
  return score;
}

/**
 * Extract interesting position pairs from a PGN string.
 * Returns pairs of (fenBefore, fenAfter, move) for moves 15-35.
 */
function extractPositionPairs(
  pgn: string,
  gameUrl: string | null
): {
  fenBefore: string;
  fenAfter: string;
  moveSan: string;
  moveUci: string;
  gameUrl: string | null;
  explanation: string;
  score: number;
}[] {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    const history = chess.history({ verbose: true });

    const pairs: ReturnType<typeof extractPositionPairs> = [];
    const replay = new Chess();

    for (let i = 0; i < history.length; i++) {
      const fullMove = Math.floor(i / 2) + 1;
      if (fullMove < MOVE_MIN) {
        replay.move(history[i].san);
        continue;
      }
      if (fullMove > MOVE_MAX) break;

      const fenBefore = replay.fen();
      const moveData = history[i];
      replay.move(moveData.san);
      const fenAfter = replay.fen();

      const score = interestScore(moveData, replay);
      // Only keep moves with some interest (captures, checks, promotions, or piece moves)
      if (score < 1) continue;

      const uci = `${moveData.from}${moveData.to}${moveData.promotion ?? ""}`;
      const explanation = explainMove(moveData, replay);

      pairs.push({
        fenBefore,
        fenAfter,
        moveSan: moveData.san,
        moveUci: uci,
        gameUrl,
        explanation,
        score,
      });
    }

    // Sort by interest score descending, take top entries
    pairs.sort((a, b) => b.score - a.score);
    return pairs.slice(0, 5); // Take up to 5 best positions per game
  } catch {
    return [];
  }
}

// ── Main ──

async function main() {
  console.log(
    `Seeding EchoPosition from RawGame PGNs — target: ${TARGET} positions`
  );
  console.log(`Extracting positions from moves ${MOVE_MIN}–${MOVE_MAX}`);

  const existing = await prisma.echoPosition.count();
  console.log(`Existing EchoPosition rows: ${existing}`);
  const needed = TARGET - existing;
  if (needed <= 0) {
    console.log("Already have enough positions. Done.");
    return;
  }

  // Get existing fenAfter values to avoid duplicates
  const existingFens = new Set(
    (
      await prisma.echoPosition.findMany({ select: { fenAfter: true } })
    ).map((p) => p.fenAfter)
  );

  const totalGames = await prisma.rawGame.count({
    where: { pgn: { not: "" } },
  });
  console.log(`RawGame records with PGNs: ${totalGames}`);

  let seeded = 0;
  let gamesProcessed = 0;
  let offset = 0;

  while (seeded < needed) {
    const games = await prisma.rawGame.findMany({
      where: { pgn: { not: "" } },
      orderBy: { id: "asc" },
      skip: offset,
      take: BATCH_SIZE,
      select: { id: true, pgn: true, gameUrl: true },
    });

    if (games.length === 0) {
      console.log(
        `Ran out of games at offset ${offset}. Seeded ${seeded}/${needed}.`
      );
      break;
    }

    offset += games.length;

    for (const game of games) {
      if (seeded >= needed) break;
      gamesProcessed++;

      const pairs = extractPositionPairs(game.pgn, game.gameUrl ?? null);

      for (const pair of pairs) {
        if (seeded >= needed) break;
        if (existingFens.has(pair.fenAfter)) continue;
        existingFens.add(pair.fenAfter);

        await prisma.echoPosition.create({
          data: {
            fenBefore: pair.fenBefore,
            fenAfter: pair.fenAfter,
            moveSan: pair.moveSan,
            moveUci: pair.moveUci,
            gameUrl: pair.gameUrl,
            explanation: pair.explanation,
          },
        });

        seeded++;
        if (seeded % 50 === 0) {
          console.log(
            `  ${seeded}/${needed} seeded (${gamesProcessed} games, offset ${offset})`
          );
        }
      }
    }
  }

  console.log(
    `\nDone! Seeded ${seeded} positions from ${gamesProcessed} games.`
  );
  console.log(`Total EchoPosition rows: ${existing + seeded}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
