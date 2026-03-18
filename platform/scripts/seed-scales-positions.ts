/**
 * Seed ScalesPosition table from real human games (RawGame PGNs).
 *
 * 1. Pulls all RawGame records with status='done' that have a PGN
 * 2. Extracts middlegame positions (moves 12–35) from each game
 * 3. Runs Stockfish MultiPV depth 10 on each position
 * 4. Keeps only positions where all 3 top moves have positive cp
 *    and spread between move 1 and move 3 is 30–400cp
 * 5. Stores in ScalesPosition table
 *
 * Usage:
 *   cd platform && npx tsx scripts/seed-scales-positions.ts
 *   cd platform && npx tsx scripts/seed-scales-positions.ts --target 500
 */

import { PrismaClient } from "@prisma/client";
import { Chess } from "chess.js";
import { spawn } from "child_process";

const prisma = new PrismaClient();

const TARGET = parseInt(process.argv.find((_, i, a) => a[i - 1] === "--target") ?? "500", 10);
const DEPTH = 10;
const BATCH_SIZE = 100; // games to fetch from DB at a time
const MOVE_MIN = 12; // earliest full move number to consider
const MOVE_MAX = 35; // latest full move number to consider
const TIMEOUT_MS = 10_000;

interface MultiPVResult {
  move: string;
  cp: number;
  pv: string; // full PV line (space-separated UCI moves)
}

// ── Stockfish process management ──

let sfProcess: ReturnType<typeof spawn> | null = null;

function ensureStockfish(): ReturnType<typeof spawn> {
  if (!sfProcess) {
    sfProcess = spawn("stockfish", [], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    sfProcess.on("error", (err) => {
      console.error("Failed to start Stockfish:", err);
      process.exit(1);
    });
  }
  return sfProcess;
}

function sendCommand(sf: ReturnType<typeof spawn>, cmd: string) {
  sf.stdin!.write(cmd + "\n");
}

async function initStockfish(): Promise<void> {
  const sf = ensureStockfish();
  return new Promise((resolve) => {
    const handler = (data: Buffer) => {
      if (data.toString().includes("readyok")) {
        sf.stdout!.off("data", handler);
        resolve();
      }
    };
    sf.stdout!.on("data", handler);
    sendCommand(sf, "uci");
    sendCommand(sf, "isready");
  });
}

async function analyzeMultiPV(fen: string): Promise<MultiPVResult[]> {
  const sf = ensureStockfish();

  return new Promise((resolve) => {
    const results = new Map<number, MultiPVResult>();
    let settled = false;
    let buffer = "";

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      sf.stdout!.off("data", handler);
      const ordered: MultiPVResult[] = [];
      for (let i = 1; i <= 3; i++) {
        const r = results.get(i);
        if (r) ordered.push(r);
      }
      resolve(ordered);
    };

    const timeout = setTimeout(() => {
      console.warn(`  Timeout on FEN: ${fen}`);
      finish();
    }, TIMEOUT_MS);

    const handler = (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop()!;

      for (const line of lines) {
        if (line.includes("multipv") && (line.includes("score cp") || line.includes("score mate"))) {
          const depthMatch = line.match(/depth (\d+)/);
          const depth = depthMatch ? parseInt(depthMatch[1], 10) : 0;
          if (depth < DEPTH) continue;

          const pvNum = line.match(/multipv (\d+)/);
          // Capture the full PV line (all moves after "pv")
          const pvMatch = line.match(/\bpv ((?:[a-h][1-8][a-h][1-8]\w?\s*)+)/);
          if (!pvNum || !pvMatch) continue;

          const pvMoves = pvMatch[1].trim().split(/\s+/);
          const firstMove = pvMoves[0];

          let cp: number;
          const cpMatch = line.match(/score cp (-?\d+)/);
          const mateMatch = line.match(/score mate (-?\d+)/);
          if (cpMatch) {
            cp = parseInt(cpMatch[1], 10);
          } else if (mateMatch) {
            const mateIn = parseInt(mateMatch[1], 10);
            cp = mateIn > 0 ? 30000 : -30000;
          } else {
            continue;
          }

          // Store first 3 moves of PV as context
          const pvLine = pvMoves.slice(0, 3).join(" ");
          results.set(parseInt(pvNum[1], 10), { move: firstMove, cp, pv: pvLine });
        }

        if (line.startsWith("bestmove")) {
          finish();
          return;
        }
      }
    };

    sf.stdout!.on("data", handler);
    sendCommand(sf, "ucinewgame");
    sendCommand(sf, `setoption name MultiPV value 3`);
    sendCommand(sf, `position fen ${fen}`);
    sendCommand(sf, `go depth ${DEPTH}`);
  });
}

/**
 * Extract middlegame FENs (moves 12–35) from a PGN string.
 * Returns unique FENs from within the move range.
 */
function extractMiddlegameFens(pgn: string): string[] {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    const history = chess.history({ verbose: true });

    const fens: string[] = [];
    const replay = new Chess();

    for (let i = 0; i < history.length; i++) {
      replay.move(history[i].san);
      // Full move number: Math.floor(i / 2) + 1
      const fullMove = Math.floor(i / 2) + 1;
      if (fullMove >= MOVE_MIN && fullMove <= MOVE_MAX) {
        fens.push(replay.fen());
      }
      if (fullMove > MOVE_MAX) break;
    }

    return fens;
  } catch {
    return [];
  }
}

// ── Main ──

async function main() {
  console.log(`Seeding ScalesPosition from RawGame PGNs — target: ${TARGET} positions`);
  console.log(`Extracting middlegame positions (moves ${MOVE_MIN}–${MOVE_MAX})`);

  await initStockfish();
  console.log("Stockfish initialized");

  const existing = await prisma.scalesPosition.count();
  console.log(`Existing ScalesPosition rows: ${existing}`);
  const needed = TARGET - existing;
  if (needed <= 0) {
    console.log("Already have enough positions. Done.");
    return;
  }

  // Get existing FENs to avoid duplicates
  const existingFens = new Set(
    (await prisma.scalesPosition.findMany({ select: { fen: true } })).map((p) => p.fen)
  );
  const seenFens = new Set(existingFens);

  // Count available games — use any status since all RawGames have PGNs
  const totalGames = await prisma.rawGame.count({
    where: { pgn: { not: "" } },
  });
  console.log(`RawGame records with PGNs: ${totalGames}`);

  let seeded = 0;
  let evaluated = 0;
  let gamesProcessed = 0;
  let offset = 0;

  while (seeded < needed) {
    const games = await prisma.rawGame.findMany({
      where: { pgn: { not: "" } },
      orderBy: { id: "asc" },
      skip: offset,
      take: BATCH_SIZE,
      select: { id: true, pgn: true },
    });

    if (games.length === 0) {
      console.log(`Ran out of games at offset ${offset}. Seeded ${seeded}/${needed}.`);
      break;
    }

    offset += games.length;

    for (const game of games) {
      if (seeded >= needed) break;
      gamesProcessed++;

      const fens = extractMiddlegameFens(game.pgn);

      for (const fen of fens) {
        if (seeded >= needed) break;
        if (seenFens.has(fen)) continue;
        seenFens.add(fen);

        evaluated++;
        const results = await analyzeMultiPV(fen);

        if (results.length < 3) continue;

        // Quality filters:
        // 1. All 3 moves must have positive eval
        if (!results.every((r) => r.cp > 0)) continue;

        // 2. No mate scores
        if (results.some((r) => Math.abs(r.cp) >= 20000)) continue;

        // 3. Spread between move 1 and move 3 must be 30–400cp
        const spread = results[0].cp - results[2].cp;
        if (spread < 30 || spread > 400) continue;

        // 4. Top gap (move 1 vs move 2) must not be too large
        const topGap = results[0].cp - results[1].cp;
        if (topGap > 200) continue;

        // 5. Detect sacrifice moves (piece lands on square capturable by lesser piece)
        const PIECE_VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 99 };
        let hasSacrifice = false;
        for (const r of results) {
          const testChess = new Chess(fen);
          const moveResult = testChess.move({
            from: r.move.slice(0, 2),
            to: r.move.slice(2, 4),
            promotion: r.move[4] || undefined,
          });
          if (!moveResult) continue;
          const afterChess = new Chess(testChess.fen());
          const captures = afterChess.moves({ verbose: true }).filter(
            (m) => m.to === r.move.slice(2, 4)
          );
          if (captures.length > 0 && !moveResult.captured) {
            const movedVal = PIECE_VAL[moveResult.piece] ?? 0;
            const attackerVal = PIECE_VAL[captures[0].piece] ?? 0;
            if (attackerVal < movedVal) {
              hasSacrifice = true;
              break;
            }
          }
        }

        await prisma.scalesPosition.create({
          data: {
            fen,
            move1: results[0].move,
            eval1: results[0].cp,
            pv1: results[0].pv,
            move2: results[1].move,
            eval2: results[1].cp,
            pv2: results[1].pv,
            move3: results[2].move,
            eval3: results[2].cp,
            pv3: results[2].pv,
            hasSacrifice,
          },
        });

        seeded++;
        if (seeded % 10 === 0) {
          console.log(`  ${seeded}/${needed} seeded (${evaluated} evaluated, ${gamesProcessed} games, offset ${offset})`);
        }
      }
    }
  }

  console.log(`\nDone! Seeded ${seeded} positions from ${gamesProcessed} games (${evaluated} positions evaluated).`);
  console.log(`Total ScalesPosition rows: ${existing + seeded}`);

  sfProcess?.kill();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  sfProcess?.kill();
  process.exit(1);
});
