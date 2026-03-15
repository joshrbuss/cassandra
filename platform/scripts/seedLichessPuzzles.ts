/**
 * scripts/seedLichessPuzzles.ts
 *
 * Downloads 50,000 Lichess puzzles from the public database, filtered to
 * popularity >= 50, spread across all rating bands, and inserts them into
 * the LibraryPuzzle table.
 *
 * Requirements:
 *   - zstd CLI installed (brew install zstd / apt install zstd)
 *   - DATABASE_URL set in environment (or .env loaded by prisma.config.ts)
 *
 * Usage:
 *   cd platform
 *   npx tsx scripts/seedLichessPuzzles.ts
 *
 * The script is idempotent — existing lichessIds are skipped via upsert.
 */

import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import * as fs from "fs";
import * as readline from "readline";
import * as https from "https";
import * as http from "http";
import { Chess } from "chess.js";
import * as path from "path";

const prisma = new PrismaClient();

const DOWNLOAD_URL = "https://database.lichess.org/lichess_db_puzzle.csv.zst";
const TMP_ZST = "/tmp/lichess_db_puzzle.csv.zst";
const TMP_CSV = "/tmp/lichess_db_puzzle.csv";
const TARGET = 50_000;
const MIN_POPULARITY = 50;
const BATCH_SIZE = 500;

// Target count per rating band to ensure spread
const RATING_BANDS: { min: number; max: number; target: number }[] = [
  { min: 0,    max: 800,  target: 3_000 },
  { min: 800,  max: 1000, target: 5_000 },
  { min: 1000, max: 1200, target: 7_000 },
  { min: 1200, max: 1400, target: 8_000 },
  { min: 1400, max: 1600, target: 8_000 },
  { min: 1600, max: 1800, target: 7_000 },
  { min: 1800, max: 2000, target: 6_000 },
  { min: 2000, max: 2200, target: 4_000 },
  { min: 2200, max: 9999, target: 2_000 },
];

function getBand(rating: number) {
  return RATING_BANDS.find((b) => rating >= b.min && rating < b.max);
}

async function download(url: string, dest: string): Promise<void> {
  console.log(`Downloading ${url} ...`);
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith("https") ? https : http;
    const req = protocol.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return download(res.headers.location!, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const total = parseInt(res.headers["content-length"] ?? "0", 10);
      let received = 0;
      res.on("data", (chunk: Buffer) => {
        received += chunk.length;
        if (total > 0) {
          const pct = ((received / total) * 100).toFixed(1);
          process.stdout.write(`\r  ${pct}% (${(received / 1_048_576).toFixed(1)} MB)`);
        }
      });
      res.pipe(file);
      res.on("end", () => { process.stdout.write("\n"); file.close(); resolve(); });
      res.on("error", reject);
    });
    req.on("error", reject);
  });
}

function decompress(src: string, dest: string): void {
  console.log("Decompressing ...");
  execSync(`zstd -d "${src}" -o "${dest}" --force`, { stdio: "inherit" });
}

/** Apply the first move of a Lichess puzzle to get the solvingFen. */
function applySolvingMove(fen: string, firstMove: string): { solvingFen: string; lastMove: string } | null {
  try {
    const chess = new Chess(fen);
    const from = firstMove.slice(0, 2);
    const to = firstMove.slice(2, 4);
    const promotion = firstMove[4] as "q" | "r" | "b" | "n" | undefined;
    const result = chess.move({ from, to, ...(promotion ? { promotion } : {}) });
    if (!result) return null;
    return { solvingFen: chess.fen(), lastMove: firstMove };
  } catch {
    return null;
  }
}

async function main() {
  console.log("=== Lichess Puzzle Seeder ===\n");

  // Check existing count
  const existing = await prisma.libraryPuzzle.count();
  if (existing >= TARGET) {
    console.log(`LibraryPuzzle table already has ${existing} rows — skipping seed.`);
    return;
  }
  console.log(`Existing rows: ${existing}. Will seed up to ${TARGET} total.\n`);

  // Download if needed
  if (!fs.existsSync(TMP_ZST)) {
    await download(DOWNLOAD_URL, TMP_ZST);
  } else {
    console.log(`Using cached ${TMP_ZST}`);
  }

  // Decompress if needed
  if (!fs.existsSync(TMP_CSV)) {
    decompress(TMP_ZST, TMP_CSV);
  } else {
    console.log(`Using cached ${TMP_CSV}`);
  }

  // Track band counts
  const bandCounts = new Map<number, number>(RATING_BANDS.map((b, i) => [i, 0]));
  let totalInserted = 0;
  let totalSkipped = 0;
  let lineNo = 0;

  const batch: {
    lichessId: string; fen: string; solvingFen: string; lastMove: string;
    solutionMoves: string; rating: number; themes: string; popularity: number;
    gameUrl: string | null;
  }[] = [];

  const rl = readline.createInterface({
    input: fs.createReadStream(TMP_CSV),
    crlfDelay: Infinity,
  });

  console.log("\nParsing CSV and inserting...");

  for await (const line of rl) {
    lineNo++;
    if (lineNo === 1) continue; // header

    // CSV: PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags
    const cols = line.split(",");
    if (cols.length < 9) continue;

    const [puzzleId, fen, movesRaw, ratingStr, , popularityStr, , themesRaw, gameUrl] = cols;
    const rating = parseInt(ratingStr, 10);
    const popularity = parseInt(popularityStr, 10);

    if (isNaN(rating) || isNaN(popularity)) continue;
    if (popularity < MIN_POPULARITY) { totalSkipped++; continue; }

    const bandIdx = RATING_BANDS.findIndex((b) => rating >= b.min && rating < b.max);
    if (bandIdx === -1) continue;

    const band = RATING_BANDS[bandIdx];
    const bandCount = bandCounts.get(bandIdx) ?? 0;
    if (bandCount >= band.target) continue;

    const moves = movesRaw.trim().split(" ");
    if (moves.length < 2) continue;

    const solved = applySolvingMove(fen, moves[0]);
    if (!solved) continue;

    batch.push({
      lichessId: puzzleId,
      fen,
      solvingFen: solved.solvingFen,
      lastMove: solved.lastMove,
      solutionMoves: moves.slice(1).join(" "),
      rating,
      themes: themesRaw?.trim() ?? "",
      popularity,
      gameUrl: gameUrl?.trim() || null,
    });

    bandCounts.set(bandIdx, bandCount + 1);

    if (batch.length >= BATCH_SIZE) {
      await prisma.libraryPuzzle.createMany({ data: batch, skipDuplicates: true });
      totalInserted += batch.length;
      batch.length = 0;
      process.stdout.write(`\r  Inserted ${totalInserted.toLocaleString()} puzzles...`);
    }

    // Check if all bands are full
    const done = RATING_BANDS.every((b, i) => (bandCounts.get(i) ?? 0) >= b.target);
    if (done) break;
  }

  // Flush remaining batch
  if (batch.length > 0) {
    await prisma.libraryPuzzle.createMany({ data: batch, skipDuplicates: true });
    totalInserted += batch.length;
  }

  process.stdout.write("\n");
  console.log(`\nDone! Inserted ${totalInserted.toLocaleString()} puzzles (skipped ${totalSkipped.toLocaleString()} low-popularity).`);

  const finalCount = await prisma.libraryPuzzle.count();
  console.log(`LibraryPuzzle table now has ${finalCount.toLocaleString()} rows.`);

  // Print band summary
  console.log("\nRating band breakdown:");
  RATING_BANDS.forEach((b, i) => {
    const count = bandCounts.get(i) ?? 0;
    console.log(`  ${b.min}–${b.max}: ${count.toLocaleString()} / ${b.target.toLocaleString()}`);
  });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
