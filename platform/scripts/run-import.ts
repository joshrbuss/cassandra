/**
 * One-off script: run game import for a specific user.
 * Usage: npx tsx scripts/run-import.ts <userId>
 */

import { importGamesForUser } from "../lib/jobs/importGames";

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: npx tsx scripts/run-import.ts <userId>");
  process.exit(1);
}

async function main() {
  console.log(`Importing games for user ${userId}…`);
  const result = await importGamesForUser(userId);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });
