/**
 * Backfills subtype = 'brilliant' for all puzzles whose themes field contains
 * the Lichess "brilliantMove" tag.
 *
 * Also ensures enrich-openings already ran (eloRangeMin should be set). If not,
 * this script still runs safely — it only updates the subtype field.
 *
 * Usage:
 *   npx tsx scripts/tag-brilliant.ts
 *
 * Safe to re-run — only processes puzzles where subtype != 'brilliant' AND
 * themes contains 'brilliantMove'.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Counting puzzles with brilliantMove theme...");

  // Prisma/SQLite uses LIKE for contains — find candidates first, then update in batch
  const candidates = await prisma.puzzle.findMany({
    where: {
      themes: { contains: "brilliantMove" },
      NOT: { subtype: "brilliant" },
    },
    select: { id: true },
  });

  console.log(`Found ${candidates.length.toLocaleString()} puzzles to tag as 'brilliant'`);

  if (candidates.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  const BATCH = 500;
  let updated = 0;

  for (let i = 0; i < candidates.length; i += BATCH) {
    const ids = candidates.slice(i, i + BATCH).map((p) => p.id);
    await prisma.puzzle.updateMany({
      where: { id: { in: ids } },
      data: { subtype: "brilliant" },
    });
    updated += ids.length;
    if (updated % 5000 === 0 || updated === candidates.length) {
      console.log(`  ${updated.toLocaleString()} / ${candidates.length.toLocaleString()} tagged`);
    }
  }

  console.log(`Done. ${updated.toLocaleString()} puzzles tagged as 'brilliant'.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
