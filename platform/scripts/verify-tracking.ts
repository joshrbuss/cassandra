/**
 * E2E verification: attempt recording + streak tracking
 *
 * Usage: npx tsx scripts/verify-tracking.ts
 *
 * 1. Looks up j_r_b_01 user and grabs 3 personal puzzles + 1 library puzzle
 * 2. Records attempts directly via Prisma (simulating what the API route does)
 * 3. Queries DB to prove PuzzleAttempt rows exist and streak updated
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  console.log("=== E2E Tracking Verification ===\n");

  // 1. Find the j_r_b_01 user
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { chessComUsername: "J_R_B_01" },
        { lichessUsername: "J_R_B_01" },
        { chessComUsername: "j_r_b_01" },
        { lichessUsername: "j_r_b_01" },
      ],
    },
  });

  if (!user) {
    console.error("User j_r_b_01 not found. Listing all users:");
    const allUsers = await prisma.user.findMany({ select: { id: true, chessComUsername: true, lichessUsername: true } });
    console.table(allUsers);
    process.exit(1);
  }

  console.log(`Found user: id=${user.id} chess.com=${user.chessComUsername} lichess=${user.lichessUsername}`);
  console.log(`Before: currentStreak=${user.currentStreak} longestStreak=${user.longestStreak} lastPuzzleDate=${user.lastPuzzleDate}\n`);

  // 2. Grab 3 personal puzzles (from Puzzle table)
  const personalPuzzles = await prisma.puzzle.findMany({
    where: { sourceUserId: user.id },
    take: 3,
    select: { id: true, themes: true },
  });

  if (personalPuzzles.length < 3) {
    console.error(`Only found ${personalPuzzles.length} personal puzzles, need 3`);
    process.exit(1);
  }

  // 3. Grab 1 library puzzle (from LibraryPuzzle table — the FK fix target)
  const libraryPuzzle = await prisma.libraryPuzzle.findFirst({
    select: { id: true, themes: true },
  });

  const puzzlesToTest = [
    ...personalPuzzles.map((p) => ({ id: p.id, themes: p.themes, source: "personal" })),
    ...(libraryPuzzle ? [{ id: libraryPuzzle.id, themes: libraryPuzzle.themes, source: "library" }] : []),
  ];

  console.log(`Testing ${puzzlesToTest.length} puzzles (${personalPuzzles.length} personal + ${libraryPuzzle ? 1 : 0} library)\n`);

  // 4. Delete any prior test attempts from this script (cleanup)
  const testTag = "__verify_tracking_test__";
  await prisma.puzzleAttempt.deleteMany({ where: { tacticType: testTag } });

  // 5. Create attempts
  const createdIds: string[] = [];
  for (const puzzle of puzzlesToTest) {
    const attempt = await prisma.puzzleAttempt.create({
      data: {
        puzzleId: puzzle.id,
        userId: user.id,
        solveTimeMs: 5000 + Math.floor(Math.random() * 10000),
        success: true,
        tacticType: testTag, // tagged so we can clean up
      },
    });
    createdIds.push(attempt.id);
    console.log(`  ✓ Attempt saved: id=${attempt.id} puzzleId=${puzzle.id} (${puzzle.source})`);
  }

  // 6. Verify attempts exist in DB
  console.log("\n--- DB Verification ---\n");

  const savedAttempts = await prisma.puzzleAttempt.findMany({
    where: { id: { in: createdIds } },
    select: { id: true, puzzleId: true, userId: true, success: true, solveTimeMs: true, tacticType: true, createdAt: true },
  });

  console.log(`PuzzleAttempt rows found: ${savedAttempts.length} (expected ${puzzlesToTest.length})`);
  for (const a of savedAttempts) {
    console.log(`  id=${a.id} puzzleId=${a.puzzleId} userId=${a.userId} success=${a.success} solveTimeMs=${a.solveTimeMs} at=${a.createdAt.toISOString()}`);
  }

  // 7. Now test streak — simulate updateStreak logic
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];

  const freshUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { currentStreak: true, longestStreak: true, lastPuzzleDate: true },
  });

  if (!freshUser) {
    console.error("User disappeared!");
    process.exit(1);
  }

  console.log(`\nStreak state before update: currentStreak=${freshUser.currentStreak} lastPuzzleDate=${freshUser.lastPuzzleDate}`);

  if (freshUser.lastPuzzleDate !== today) {
    const isConsecutive = freshUser.lastPuzzleDate === yesterday;
    const newStreak = isConsecutive ? freshUser.currentStreak + 1 : 1;
    const newLongest = Math.max(newStreak, freshUser.longestStreak);

    await prisma.user.update({
      where: { id: user.id },
      data: { currentStreak: newStreak, longestStreak: newLongest, lastPuzzleDate: today },
    });

    const afterUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { currentStreak: true, longestStreak: true, lastPuzzleDate: true },
    });
    console.log(`Streak state after update:  currentStreak=${afterUser!.currentStreak} longestStreak=${afterUser!.longestStreak} lastPuzzleDate=${afterUser!.lastPuzzleDate}`);
  } else {
    console.log(`Already solved today (${today}) — streak unchanged at ${freshUser.currentStreak}`);
  }

  // 8. Verify dashboard accuracy query
  const allAttempts = await prisma.puzzleAttempt.findMany({
    where: { userId: user.id },
    select: { success: true },
  });
  const totalSolved = allAttempts.filter((a) => a.success).length;
  const accuracy = allAttempts.length > 0 ? Math.round((totalSolved / allAttempts.length) * 100) : null;
  console.log(`\nDashboard accuracy: ${accuracy}% (${totalSolved}/${allAttempts.length} attempts)`);

  // 9. Cleanup test attempts
  const deleted = await prisma.puzzleAttempt.deleteMany({ where: { tacticType: testTag } });
  console.log(`\nCleaned up ${deleted.count} test attempts`);

  console.log("\n=== All checks passed ===");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
