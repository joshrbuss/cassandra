/**
 * Seed script: loads a sample of Lichess puzzles into the DB.
 *
 * Usage:
 *   npx tsx prisma/seed.ts
 *
 * To load from the Lichess puzzle CSV (https://database.lichess.org/#puzzles):
 *   npx tsx prisma/seed.ts --csv /path/to/lichess_db_puzzle.csv.zst
 *
 * Without --csv, a set of hand-picked puzzles is used so the app works immediately.
 *
 * Tagging logic (from the spec):
 *   A puzzle is tagged "retrograde" when Moves[0] (the last move) is a
 *   capture or check — i.e. the SAN contains 'x', '+', or '#'.
 *   We detect captures/checks by applying the move with chess.js.
 */

import { PrismaClient } from "@prisma/client";
import { Chess } from "chess.js";
import * as fs from "fs";
import * as readline from "readline";
import * as path from "path";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Bundled sample puzzles (Lichess format: PuzzleId,FEN,Moves,Rating,…,Themes)
// These are real puzzles from the Lichess open database.
// ---------------------------------------------------------------------------
// Themes that indicate an opponent_prediction puzzle (spec §Phase 2)
const OPPONENT_PREDICTION_THEMES = new Set([
  "deflection",
  "backRankMate",
  "zwischenzug",
  "pin",
  "fork",
  "skewer",
  "discoveredAttack",
  "attraction",
  "interference",
  "mateIn1",
  "mateIn2",
]);

// ---------------------------------------------------------------------------
// Hand-curated opponent-prediction puzzles
// FEN = position BEFORE opponent's thematic move; Moves[0] = opponent's move.
// ---------------------------------------------------------------------------
const OPPONENT_PREDICTION_PUZZLES = [
  {
    id: "OP001",
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
    moves: "h5f7 e8f7",
    rating: 1100,
    themes: "fork mateIn1 short",
  },
  {
    id: "OP002",
    fen: "r2q1rk1/ppp2ppp/2n1pn2/3p4/1bPP4/2NBPN2/PP3PPP/R1BQ1RK1 b - - 0 9",
    moves: "b4c3 b2c3",
    rating: 1350,
    themes: "pin middlegame",
  },
  {
    id: "OP003",
    fen: "6k1/5ppp/p7/1p6/1P6/P4PPP/5K2/8 w - - 0 30",
    moves: "f3f4 g7g5 f4g5",
    rating: 1500,
    themes: "zwischenzug endgame",
  },
  {
    id: "OP004",
    fen: "r1bq1rk1/pp3ppp/2nbpn2/3p4/2PP4/2NBPN2/PP3PPP/R1BQ1RK1 b - - 0 10",
    moves: "d5c4 d3c4 d6b4",
    rating: 1650,
    themes: "deflection middlegame",
  },
  {
    id: "OP005",
    fen: "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1",
    moves: "d1d8 g8f7 d8f8",
    rating: 1200,
    themes: "backRankMate mateIn2 endgame",
  },
  {
    id: "OP006",
    fen: "r3k2r/ppp2ppp/2n1bn2/3qp3/3P4/2N1BN2/PPP1QPPP/R3K2R w KQkq - 4 10",
    moves: "e3b6 d5d1 e1d1",
    rating: 1800,
    themes: "deflection skewer middlegame",
  },
  {
    id: "OP007",
    fen: "r1bqkb1r/pppp1ppp/2n5/4p3/2BnP3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    moves: "f3d4 d8h4 e1e2 h4e4",
    rating: 1400,
    themes: "fork discoveredAttack middlegame",
  },
  {
    id: "OP008",
    fen: "2r3k1/pp3ppp/2b5/3p4/3P4/2P2N2/PP3PPP/4R1K1 w - - 0 20",
    moves: "e1e8 g8e8 f3d2",
    rating: 1550,
    themes: "deflection endgame",
  },
];

const SAMPLE_PUZZLES = [
  {
    id: "00008",
    fen: "r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24",
    moves: "f2g3 e6e7 b2b1 b3c1 b1c1 h6c1",
    rating: 1852,
    themes: "crushing hangingPiece long middlegame",
  },
  {
    id: "0009K",
    fen: "r1b1r1k1/1pqn1pbp/p2pp1p1/P7/2PNP3/2N1BP2/1P1QB1PP/R3R1K1 b - - 0 16",
    moves: "d6d5 e4d5 e6e1 e3c1 e8e1",
    rating: 2119,
    themes: "advantage endgame",
  },
  {
    id: "000Br",
    fen: "1r4k1/p5pp/1b1p4/3Pp3/1Pn1N3/P4PP1/3r2BP/R3R1K1 b - - 2 26",
    moves: "c4e3 g2e4 e3f1 e1f1",
    rating: 1711,
    themes: "advantage endgame",
  },
  {
    id: "000Bv",
    fen: "5r1k/pp4pp/4p3/3pP1Qb/3P3q/P3P3/1P3PP1/3R2K1 w - - 2 27",
    moves: "g5h5 f8f2 h5h4",
    rating: 1742,
    themes: "endgame short",
  },
  {
    id: "000Db",
    fen: "r4rk1/1p1bppbp/p2p1np1/q7/3BPPP1/2N2B2/PPP4P/R2Q1RK1 b - - 0 14",
    moves: "g6e4 c3e4 d7b5 d4b6 a5b6",
    rating: 1605,
    themes: "advantage middlegame",
  },
  {
    id: "000Do",
    fen: "2r2rk1/pp3pp1/4p2p/3pP2q/2pP2bP/2P1NR2/PP3QP1/R5K1 b - - 0 23",
    moves: "g4h3 f3f7 h3g2 f7g7 g8h8 f2f8",
    rating: 2531,
    themes: "crushing endgame long",
  },
  {
    id: "000DQ",
    fen: "1r2kb1r/pb3ppp/4pq2/1p1p1N2/2pP4/2P3Pn/PP1NQP1P/R1B1K2R b KQk - 3 15",
    moves: "h3f2 e2f2 b8b2 a1b1 b2f2",
    rating: 1882,
    themes: "crushing endgame long",
  },
  {
    id: "000DV",
    fen: "r3k2r/2p2p2/p1pb1qp1/2N1p3/4P1b1/2NP2P1/PPP2P1P/R2QKB1R b KQkq - 0 14",
    moves: "d6c5 d1d8 e8d8",
    rating: 1520,
    themes: "crushing endgame short",
  },
  {
    id: "000eU",
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    moves: "f3e5 c6e5 c4f7 e8f7",
    rating: 1284,
    themes: "crushing middlegame short",
  },
  {
    id: "000hC",
    fen: "1r1r2k1/5pp1/p2b2qp/3P4/2pQ4/5P2/Pb2NBPP/R3R1K1 w - - 0 28",
    moves: "e2c3 b2c3 d4c3 b8b1",
    rating: 1819,
    themes: "advantage endgame",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Determine puzzle type from the first move in the sequence.
 * We apply the first move to the puzzle FEN to check if it was a
 * capture or check — these are "tactically meaningful" last moves.
 */
function classifyType(
  fen: string,
  firstMoveUci: string,
  themes: string,
  forceType?: "opponent_prediction"
): "retrograde" | "opponent_prediction" | "standard" {
  // Explicit override (used for curated opponent-prediction puzzles)
  if (forceType) return forceType;

  // If themes match opponent-prediction tags, prefer that classification
  if (themes.split(" ").some((t) => OPPONENT_PREDICTION_THEMES.has(t))) {
    // Still must be a tactically meaningful last move (capture or check)
    try {
      const chess = new Chess(fen);
      const result = chess.move({ from: firstMoveUci.slice(0, 2), to: firstMoveUci.slice(2, 4), promotion: firstMoveUci[4] });
      if (result && (result.captured || result.san.includes("+") || result.san.includes("#"))) {
        return "opponent_prediction";
      }
    } catch { /* fall through */ }
  }

  return classifyTypeBasic(fen, firstMoveUci);
}

function classifyTypeBasic(fen: string, firstMoveUci: string): "retrograde" | "standard" {
  try {
    const chess = new Chess(fen);
    const from = firstMoveUci.slice(0, 2);
    const to = firstMoveUci.slice(2, 4);
    const promotion = firstMoveUci.length > 4 ? firstMoveUci[4] : undefined;
    const result = chess.move({ from, to, promotion });
    if (!result) return "standard";
    // Capture: result.captured is set; Check: SAN contains + or #
    if (result.captured || result.san.includes("+") || result.san.includes("#")) {
      return "retrograde";
    }
    return "standard";
  } catch {
    return "standard";
  }
}


/**
 * Build the solvingFen by applying the first move (the opponent's last move)
 * to the puzzle FEN.
 */
function buildSolvingFen(fen: string, firstMoveUci: string): string | null {
  try {
    const chess = new Chess(fen);
    const from = firstMoveUci.slice(0, 2);
    const to = firstMoveUci.slice(2, 4);
    const promotion = firstMoveUci.length > 4 ? firstMoveUci[4] : undefined;
    const result = chess.move({ from, to, promotion });
    if (!result) return null;
    return chess.fen();
  } catch {
    return null;
  }
}

interface LichessPuzzle {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  themes: string;
}

async function upsertPuzzle(p: LichessPuzzle) {
  const moveList = p.moves.trim().split(/\s+/);
  if (moveList.length < 2) return; // Need at least the last move + one solution move

  const lastMove = moveList[0];
  const solutionMoves = moveList.slice(1).join(" ");

  const solvingFen = buildSolvingFen(p.fen, lastMove);
  if (!solvingFen) return;

  const type = classifyType(p.fen, lastMove, p.themes);

  await prisma.puzzle.upsert({
    where: { id: p.id },
    update: {},
    create: {
      id: p.id,
      fen: p.fen,
      solvingFen,
      lastMove,
      solutionMoves,
      rating: p.rating,
      themes: p.themes,
      type,
    },
  });
}

// ---------------------------------------------------------------------------
// CSV loader (for bulk import from Lichess DB)
// ---------------------------------------------------------------------------

const BATCH_SIZE = 500;

async function loadFromCsv(csvPath: string, limit = 50_000) {
  console.log(`Loading puzzles from CSV: ${csvPath}`);

  const stream = csvPath.endsWith(".zst")
    ? (() => { throw new Error("Use zstd to decompress first: zstd -d file.csv.zst"); })()
    : fs.createReadStream(csvPath);

  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let lineNum = 0;
  let imported = 0;
  let batch: Parameters<typeof prisma.puzzle.createMany>[0]["data"] = [];

  async function flushBatch() {
    if (batch.length === 0) return;
    const result = await prisma.puzzle.createMany({ data: batch, skipDuplicates: true });
    imported += result.count;
    batch = [];
    console.log(`  ${imported} puzzles loaded...`);
  }

  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) continue; // Skip header
    if (imported + batch.length >= limit) break;

    const cols = line.split(",");
    if (cols.length < 8) continue;

    const [id, fen, moves, rating, , , , themes, gameUrl] = cols;
    if (!id || !fen || !moves) continue;

    const moveList = moves.trim().split(/\s+/);
    if (moveList.length < 2) continue;

    const lastMove = moveList[0];
    const solutionMoves = moveList.slice(1).join(" ");
    const solvingFen = buildSolvingFen(fen, lastMove);
    if (!solvingFen) continue;

    const type = classifyType(fen, lastMove, themes ?? "");

    batch.push({
      id,
      fen,
      solvingFen,
      lastMove,
      solutionMoves,
      rating: parseInt(rating, 10) || 1500,
      themes: themes ?? "",
      type,
      gameUrl: gameUrl?.startsWith("http") ? gameUrl : undefined,
      isPublic: true,
    });

    if (batch.length >= BATCH_SIZE) {
      await flushBatch();
    }
  }

  await flushBatch();
  console.log(`\nImported ${imported} puzzles from CSV.`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const csvArg = process.argv.indexOf("--csv");
  const csvPath = csvArg !== -1 ? process.argv[csvArg + 1] : null;

  // Always seed opponent-prediction puzzles
  console.log("Seeding opponent prediction puzzles...");
  let opCount = 0;
  for (const p of OPPONENT_PREDICTION_PUZZLES) {
    const moveList = p.moves.trim().split(/\s+/);
    if (moveList.length < 2) continue;
    const lastMove = moveList[0];
    const solutionMoves = moveList.slice(1).join(" ");
    const solvingFen = buildSolvingFen(p.fen, lastMove);
    if (!solvingFen) continue;
    await prisma.puzzle.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        fen: p.fen,
        solvingFen,
        lastMove,
        solutionMoves,
        rating: p.rating,
        themes: p.themes,
        type: "opponent_prediction",
      },
    });
    opCount++;
  }
  console.log(`Seeded ${opCount} opponent prediction puzzles.`);

  if (csvPath) {
    const resolvedPath = path.resolve(csvPath);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`CSV file not found: ${resolvedPath}`);
      process.exit(1);
    }
    await loadFromCsv(resolvedPath);
  } else {
    console.log("Seeding with bundled sample puzzles...");
    for (const p of SAMPLE_PUZZLES) {
      await upsertPuzzle(p);
    }
    console.log(`Seeded ${SAMPLE_PUZZLES.length} sample puzzles.`);
  }

  // Log breakdown
  const total = await prisma.puzzle.count();
  const retrograde = await prisma.puzzle.count({ where: { type: "retrograde" } });
  const opPred = await prisma.puzzle.count({ where: { type: "opponent_prediction" } });
  const standard = await prisma.puzzle.count({ where: { type: "standard" } });
  console.log(
    `\nDatabase: ${total} puzzles total` +
    ` (${retrograde} retrograde, ${opPred} opponent_prediction, ${standard} standard).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
