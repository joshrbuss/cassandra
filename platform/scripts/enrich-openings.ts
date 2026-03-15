/**
 * Enriches existing puzzles with ECO opening codes and ELO range bands.
 *
 * Reads the original Lichess puzzle CSV and updates each puzzle row with:
 *   - ecoCode      — ECO code from OpeningTags column (e.g. "B90")
 *   - openingName  — Human-readable name (e.g. "Sicilian Najdorf")
 *   - eloRangeMin  — Lower bound of the puzzle's ELO band
 *   - eloRangeMax  — Upper bound of the puzzle's ELO band
 *   - subtype      — "out_of_book" when OpeningTags is present, "standard" otherwise
 *
 * Usage:
 *   npx tsx scripts/enrich-openings.ts --csv /path/to/lichess_db_puzzle.csv
 *
 * Only processes puzzles where ecoCode IS NULL (safe to re-run).
 */

import fs from "fs";
import path from "path";
import readline from "readline";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// ELO band assignment — matches the spec exactly
// ---------------------------------------------------------------------------
const ELO_BANDS = [
  { min: 600, max: 999 },
  { min: 1000, max: 1199 },
  { min: 1200, max: 1399 },
  { min: 1400, max: 1599 },
  { min: 1600, max: 1799 },
  { min: 1800, max: 9999 },
] as const;

function eloRange(puzzleRating: number): { min: number; max: number } {
  return (
    ELO_BANDS.find((b) => puzzleRating >= b.min && puzzleRating <= b.max) ??
    ELO_BANDS[0]
  );
}

// ---------------------------------------------------------------------------
// Parse the OpeningTags cell from the Lichess CSV
// e.g. "B90_Sicilian_Najdorf" → { ecoCode: "B90", openingName: "Sicilian Najdorf" }
// Multiple tags are space-separated; we use only the first.
// ---------------------------------------------------------------------------
function parseLichessOpening(
  openingTags: string
): { ecoCode: string; openingName: string } | null {
  const trimmed = openingTags.trim();
  if (!trimmed) return null;
  const firstTag = trimmed.split(" ")[0];
  const underscoreIdx = firstTag.indexOf("_");
  if (underscoreIdx === -1) return null;
  const ecoCode = firstTag.slice(0, underscoreIdx).toUpperCase();
  const openingName = firstTag.slice(underscoreIdx + 1).replace(/_/g, " ");
  return { ecoCode, openingName };
}

// ---------------------------------------------------------------------------
// CSV parsing — Lichess CSV columns (header):
//   PuzzleId, FEN, Moves, Rating, RatingDeviation, Popularity, NbPlays,
//   Themes, GameUrl, OpeningTags
// ---------------------------------------------------------------------------
interface CsvRow {
  puzzleId: string;
  rating: number;
  openingTags: string;
}

async function parseCsv(csvPath: string): Promise<Map<string, CsvRow>> {
  const rows = new Map<string, CsvRow>();
  const rl = readline.createInterface({
    input: fs.createReadStream(csvPath),
    crlfDelay: Infinity,
  });

  let headerParsed = false;
  let idIdx = 0;
  let ratingIdx = 3;
  let openingTagsIdx = 9;

  for await (const line of rl) {
    if (!headerParsed) {
      // Parse header to find column positions
      const cols = line.split(",").map((c) => c.trim().toLowerCase());
      idIdx = cols.findIndex((c) => c === "puzzleid");
      ratingIdx = cols.findIndex((c) => c === "rating");
      openingTagsIdx = cols.findIndex((c) => c === "openingtags");
      // Fall back to positional defaults if columns not found in header
      if (idIdx === -1) idIdx = 0;
      if (ratingIdx === -1) ratingIdx = 3;
      if (openingTagsIdx === -1) openingTagsIdx = 9;
      headerParsed = true;
      continue;
    }

    // Simple CSV split — works for Lichess puzzles which don't quote fields containing commas
    const cols = line.split(",");
    if (cols.length < 8) continue;

    const puzzleId = cols[idIdx]?.trim();
    const ratingStr = cols[ratingIdx]?.trim();
    const openingTags = cols[openingTagsIdx]?.trim() ?? "";

    if (!puzzleId || !ratingStr) continue;

    rows.set(puzzleId, {
      puzzleId,
      rating: parseInt(ratingStr, 10),
      openingTags,
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const csvFlagIdx = args.indexOf("--csv");
  if (csvFlagIdx === -1 || !args[csvFlagIdx + 1]) {
    console.error("Usage: npx tsx scripts/enrich-openings.ts --csv /path/to/lichess_db_puzzle.csv");
    process.exit(1);
  }
  const csvPath = path.resolve(args[csvFlagIdx + 1]);
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  console.log(`Reading CSV: ${csvPath}`);
  const csvRows = await parseCsv(csvPath);
  console.log(`Parsed ${csvRows.size.toLocaleString()} CSV rows`);

  // Fetch puzzles that haven't been enriched yet
  const puzzles = await prisma.puzzle.findMany({
    where: { ecoCode: null },
    select: { id: true, rating: true },
  });
  console.log(`Puzzles to enrich: ${puzzles.length.toLocaleString()}`);

  let updated = 0;
  let skipped = 0;
  const BATCH = 500;

  for (let i = 0; i < puzzles.length; i += BATCH) {
    const batch = puzzles.slice(i, i + BATCH);
    await Promise.all(
      batch.map((puzzle) => {
        const csvRow = csvRows.get(puzzle.id);
        const { min, max } = eloRange(puzzle.rating);

        if (!csvRow) {
          // Puzzle not in CSV — still assign elo range and subtype
          return prisma.puzzle.update({
            where: { id: puzzle.id },
            data: { eloRangeMin: min, eloRangeMax: max, subtype: "standard" },
          });
        }

        const opening = parseLichessOpening(csvRow.openingTags);
        return prisma.puzzle.update({
          where: { id: puzzle.id },
          data: {
            ecoCode: opening?.ecoCode ?? null,
            openingName: opening?.openingName ?? null,
            eloRangeMin: min,
            eloRangeMax: max,
            subtype: opening ? "out_of_book" : "standard",
          },
        });
      })
    );
    updated += batch.length;
    if (updated % 5000 === 0 || updated === puzzles.length) {
      console.log(`  ${updated.toLocaleString()} / ${puzzles.length.toLocaleString()} updated`);
    }
  }

  console.log(`Done. Updated: ${updated}, skipped (not in CSV): ${skipped}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
