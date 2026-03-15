import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import EmailSignup from "@/components/marketing/EmailSignup";
import ConfirmedToast from "@/components/marketing/ConfirmedToast";
import { getT, resolveLocale } from "@/lib/i18n";

async function getSiteStats() {
  const [siteStats, distinctPlayers, totalPuzzles, activeBattles, streakAgg] =
    await Promise.all([
      prisma.siteStats.findUnique({ where: { id: 1 } }),
      prisma.puzzleAttempt.findMany({
        where: { userId: { not: null } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.puzzle.count(),
      prisma.battle.count({ where: { status: "active" } }),
      prisma.user.aggregate({ _max: { currentStreak: true } }),
    ]);

  return {
    puzzlesSolved: Number(siteStats?.totalPuzzlesSolved ?? 0),
    registeredPlayers: distinctPlayers.length,
    totalPuzzles,
    activeBattles,
    longestCurrentStreak: streakAgg._max.currentStreak ?? 0,
  };
}

async function getTopStreaks() {
  return prisma.user.findMany({
    where: { currentStreak: { gt: 0 } },
    orderBy: { currentStreak: "desc" },
    take: 5,
    select: {
      id: true,
      lichessUsername: true,
      chessComUsername: true,
      currentStreak: true,
    },
  });
}

function streakDisplayName(user: { lichessUsername: string | null; chessComUsername: string | null }): string {
  return user.lichessUsername ?? user.chessComUsername ?? "Anonymous";
}

export default async function Home() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("preferred_locale")?.value);
  const t = getT(locale);

  const [{ puzzlesSolved, registeredPlayers, totalPuzzles, activeBattles, longestCurrentStreak }, topStreaks, sample] =
    await Promise.all([
      getSiteStats(),
      getTopStreaks(),
      prisma.puzzle.findFirst({ orderBy: { createdAt: "asc" } }),
    ]);

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          {t("home.title")}
        </h1>
        <p className="text-gray-500 text-lg mb-10">
          {t("home.subtitle")}
        </p>

        {/* Trust signals — 5 live counters, 2-3 per row on mobile */}
        <div className="flex flex-wrap justify-center gap-x-10 gap-y-6 mb-12">
          <div className="text-center">
            <p className="text-5xl font-extrabold text-blue-600 tabular-nums">
              {puzzlesSolved.toLocaleString(locale)}
            </p>
            <p className="text-sm text-gray-500 mt-2 font-medium">{t("home.stats.puzzlesSolved")}</p>
          </div>
          <div className="text-center">
            <p className="text-5xl font-extrabold text-blue-600 tabular-nums">
              {registeredPlayers.toLocaleString(locale)}
            </p>
            <p className="text-sm text-gray-500 mt-2 font-medium">{t("home.stats.players")}</p>
          </div>
          <div className="text-center">
            <p className="text-5xl font-extrabold text-blue-600 tabular-nums">
              {totalPuzzles.toLocaleString(locale)}
            </p>
            <p className="text-sm text-gray-500 mt-2 font-medium">{t("home.stats.puzzlesInLibrary")}</p>
          </div>
          <div className="text-center">
            <p className="text-5xl font-extrabold text-blue-600 tabular-nums">
              {activeBattles.toLocaleString(locale)}
            </p>
            <p className="text-sm text-gray-500 mt-2 font-medium">{t("home.stats.activeBattles")}</p>
          </div>
          <div className="text-center">
            <p className="text-5xl font-extrabold text-blue-600 tabular-nums">
              {longestCurrentStreak.toLocaleString(locale)}
            </p>
            <p className="text-sm text-gray-500 mt-2 font-medium">{t("home.stats.longestStreak")}</p>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
          {sample ? (
            <Link
              href={`/puzzles/${sample.id}`}
              className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow"
            >
              {t("home.cta.start")}
            </Link>
          ) : (
            <p className="text-gray-400 text-sm">No puzzles loaded yet. Run the seed script.</p>
          )}
          <Link
            href="/learn"
            className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-white text-gray-700 font-semibold border border-gray-300 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            {t("home.cta.learn")}
          </Link>
        </div>

        {/* Battle CTA */}
        <Link
          href="/battles"
          className="mt-4 block rounded-xl overflow-hidden shadow-sm group"
        >
          <div className="bg-blue-600 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl" role="img" aria-label="swords">⚔️</span>
              <div className="text-left">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-0.5">
                  {t("home.battles.eyebrow")}
                </p>
                <h2 className="text-base font-bold text-white">
                  {t("home.battles.title")}
                </h2>
                <p className="text-xs text-blue-200 mt-0.5">
                  {t("home.battles.desc")}
                </p>
              </div>
            </div>
            <span className="text-blue-300 group-hover:text-white transition-colors text-lg">→</span>
          </div>
        </Link>

        {/* Brilliant Puzzle of the Day — featured entry point */}
        <Link
          href="/puzzles/brilliant"
          className="mt-4 block rounded-xl overflow-hidden shadow-sm group"
        >
          <div className="bg-zinc-900 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl" role="img" aria-label="diamond">💎</span>
              <div className="text-left">
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-0.5">
                  {t("home.brilliant.eyebrow")}
                </p>
                <h2 className="text-base font-bold text-white">
                  {t("home.brilliant.title")}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {t("home.brilliant.desc")}
                </p>
              </div>
            </div>
            <span className="text-zinc-500 group-hover:text-cyan-400 transition-colors text-lg">→</span>
          </div>
        </Link>

        {/* Puzzle type overview */}
        <div className="mt-4 grid grid-cols-1 gap-4 text-left">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-gray-900">{t("home.puzzles.retrograde.title")}</h2>
              <span className="text-xs text-gray-400 font-mono">{totalPuzzles} puzzles</span>
            </div>
            <p className="text-sm text-gray-500">{t("home.puzzles.retrograde.desc")}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-1">{t("home.puzzles.prediction.title")}</h2>
            <p className="text-sm text-gray-500">{t("home.puzzles.prediction.desc")}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-1">{t("home.puzzles.timed.title")}</h2>
            <p className="text-sm text-gray-500">{t("home.puzzles.timed.desc")}</p>
          </div>
        </div>

        {/* Streak leaderboard widget */}
        {topStreaks.length > 0 && (
          <div className="mt-4 bg-white rounded-xl border border-gray-200 p-5 shadow-sm text-left">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">{t("home.streaks.title")}</h2>
              <Link href="/leaderboard" className="text-xs text-blue-600 hover:underline">
                {t("home.streaks.link")}
              </Link>
            </div>
            <ol className="space-y-2">
              {topStreaks.map((u: { id: string; lichessUsername: string | null; chessComUsername: string | null; currentStreak: number }, i: number) => (
                <li key={u.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 font-mono w-5">#{i + 1}</span>
                  <span className="flex-1 ml-2 text-gray-700 font-medium truncate">
                    {streakDisplayName(u)}
                  </span>
                  <span className="font-mono font-bold text-orange-500">
                    {u.currentStreak}d
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Email signup — hero section */}
        <div className="mt-4">
          <EmailSignup source="homepage" />
        </div>
      </div>

      {/* Confirmation toast — reads ?confirmed= query param */}
      <Suspense>
        <ConfirmedToast />
      </Suspense>
    </main>
  );
}
