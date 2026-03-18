/**
 * Seed ScalesPosition table with pre-evaluated middlegame positions.
 *
 * 1. Pulls middlegame positions from LibraryPuzzle (excluding mate themes)
 * 2. Runs Stockfish MultiPV depth 10 on each
 * 3. Keeps only positions where all 3 moves are positive and spread is 30–400cp
 * 4. Stores them in ScalesPosition
 *
 * Usage:
 *   cd platform && npx tsx scripts/seed-scales-positions.ts
 *   cd platform && npx tsx scripts/seed-scales-positions.ts --target 500
 */

import { PrismaClient } from "@prisma/client";
import { spawn } from "child_process";

const prisma = new PrismaClient();

const TARGET = parseInt(process.argv.find((_, i, a) => a[i - 1] === "--target") ?? "500", 10);
const DEPTH = 10;
const BATCH_SIZE = 200; // fetch from DB at a time
const TIMEOUT_MS = 10_000;

interface MultiPVResult {
  move: string;
  cp: number;
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
      buffer = lines.pop()!; // keep incomplete line

      for (const line of lines) {
        if (line.includes("multipv") && (line.includes("score cp") || line.includes("score mate"))) {
          const depthMatch = line.match(/depth (\d+)/);
          const depth = depthMatch ? parseInt(depthMatch[1], 10) : 0;
          if (depth < DEPTH) continue;

          const pvNum = line.match(/multipv (\d+)/);
          const moveMatch = line.match(/\bpv ([a-h][1-8][a-h][1-8]\w?)/);
          if (!pvNum || !moveMatch) continue;

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

          results.set(parseInt(pvNum[1], 10), { move: moveMatch[1], cp });
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

// ── Main ──

async function main() {
  console.log(`Seeding ScalesPosition table — target: ${TARGET} positions`);

  await initStockfish();
  console.log("Stockfish initialized");

  // Check how many we already have
  const existing = await prisma.scalesPosition.count();
  console.log(`Existing ScalesPosition rows: ${existing}`);
  const needed = TARGET - existing;
  if (needed <= 0) {
    console.log("Already have enough positions. Done.");
    return;
  }

  // Exclude mate themes
  const EXCLUDED_THEMES = ["mateIn1", "mateIn2", "mateIn3", "mate", "backRankMate", "smotheredMate", "hookMate"];

  // Get existing FENs to avoid duplicates
  const existingFens = new Set(
    (await prisma.scalesPosition.findMany({ select: { fen: true } })).map((p) => p.fen)
  );

  let seeded = 0;
  let evaluated = 0;
  let offset = 0;
  const seenFens = new Set(existingFens);

  while (seeded < needed) {
    // Fetch a batch of middlegame library puzzles
    const puzzles = await prisma.libraryPuzzle.findMany({
      where: {
        themes: { contains: "middlegame" },
        AND: EXCLUDED_THEMES.map((t) => ({ themes: { not: { contains: t } } })),
      },
      orderBy: { id: "asc" },
      skip: offset,
      take: BATCH_SIZE,
      select: { solvingFen: true, rating: true },
    });

    if (puzzles.length === 0) {
      console.log(`Ran out of puzzles at offset ${offset}. Seeded ${seeded}/${needed}.`);
      break;
    }

    offset += puzzles.length;

    for (const puzzle of puzzles) {
      if (seeded >= needed) break;

      const fen = puzzle.solvingFen;
      if (seenFens.has(fen)) continue;
      seenFens.add(fen);

      evaluated++;
      const results = await analyzeMultiPV(fen);

      if (results.length < 3) {
        continue;
      }

      // Quality filters:
      // 1. All 3 moves must have positive eval
      const allPositive = results.every((r) => r.cp > 0);
      if (!allPositive) continue;

      // 2. No mate scores
      const hasMate = results.some((r) => Math.abs(r.cp) >= 20000);
      if (hasMate) continue;

      // 3. Spread between move 1 and move 3 must be 30–400cp
      const spread = results[0].cp - results[2].cp;
      if (spread < 30 || spread > 400) continue;

      // 4. Top gap (move 1 vs move 2) must not be too large
      const topGap = results[0].cp - results[1].cp;
      if (topGap > 200) continue;

      // Passed all filters — insert
      await prisma.scalesPosition.create({
        data: {
          fen,
          move1: results[0].move,
          eval1: results[0].cp,
          move2: results[1].move,
          eval2: results[1].cp,
          move3: results[2].move,
          eval3: results[2].cp,
        },
      });

      seeded++;
      if (seeded % 10 === 0) {
        console.log(`  ${seeded}/${needed} seeded (${evaluated} evaluated, offset ${offset})`);
      }
    }
  }

  console.log(`\nDone! Seeded ${seeded} positions (evaluated ${evaluated} total).`);
  console.log(`Total ScalesPosition rows: ${existing + seeded}`);

  // Cleanup
  sfProcess?.kill();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  sfProcess?.kill();
  process.exit(1);
});
