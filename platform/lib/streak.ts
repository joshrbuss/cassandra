import { prisma } from "@/lib/prisma";

/**
 * Updates the user's daily streak.
 * Idempotent — if already solved today, no-op.
 * Call this on any successful puzzle/scales completion.
 */
export async function updateStreak(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, longestStreak: true, currentLoseStreak: true, longestLoseStreak: true, lastPuzzleDate: true },
    });
    if (!user) {
      console.log(`[streak] user not found: ${userId}`);
      return;
    }

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD UTC
    if (user.lastPuzzleDate === today) {
      console.log(`[streak] already solved today (${today}), skipping`);
      return;
    }

    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
    const isConsecutive = user.lastPuzzleDate === yesterday;

    const newStreak = isConsecutive ? user.currentStreak + 1 : 1;
    const newLongest = Math.max(newStreak, user.longestStreak);

    console.log(`[streak] userId=${userId} lastPuzzleDate=${user.lastPuzzleDate} today=${today} consecutive=${isConsecutive} ${user.currentStreak}→${newStreak} longest=${newLongest}`);
    // When user returns after missing days, record the lose streak before resetting
    let loseStreakUpdate = {};
    if (!isConsecutive && user.lastPuzzleDate) {
      const lastDate = new Date(user.lastPuzzleDate);
      const todayDate = new Date(today);
      const daysMissed = Math.floor((todayDate.getTime() - lastDate.getTime()) / 86_400_000) - 1;
      if (daysMissed > 0) {
        const newLongestLose = Math.max(daysMissed, user.longestLoseStreak);
        loseStreakUpdate = { currentLoseStreak: 0, longestLoseStreak: newLongestLose };
      }
    } else {
      loseStreakUpdate = { currentLoseStreak: 0 };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastPuzzleDate: today,
        ...loseStreakUpdate,
      },
    });
    console.log(`[streak] ✓ updated`);
  } catch (e: unknown) {
    // P2025 = record not found — stale session cookie after user deletion, ignore
    if ((e as { code?: string })?.code === "P2025") return;
    throw e;
  }
}
