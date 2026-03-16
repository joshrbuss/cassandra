import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ConfirmedToast from "@/components/marketing/ConfirmedToast";
import NavLanguageToggle from "@/components/NavLanguageToggle";
import HomepageStats from "@/components/HomepageStats";

async function getStats() {
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

  const [siteStats, userImportCount, totalUsers, recentActiveUsers] =
    await Promise.all([
      prisma.siteStats.findUnique({ where: { id: 1 } }),
      prisma.puzzle.count({ where: { source: "user_import" } }),
      prisma.user.count(),
      prisma.puzzleAttempt.findMany({
        where: {
          userId: { not: null },
          createdAt: { gte: fifteenMinAgo },
        },
        select: { userId: true },
        distinct: ["userId"],
      }),
    ]);

  return {
    puzzlesSolved: Number(siteStats?.totalPuzzlesSolved ?? 0),
    fromRealGames: userImportCount,
    totalPlayers: totalUsers,
    onlineNow: recentActiveUsers.length,
  };
}

export default async function Home() {
  // Redirect logged-in users straight to their dashboard
  const { auth } = await import("@/auth");
  const session = await auth();
  if (session?.userId) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  const stats = await getStats().catch(() => ({
    puzzlesSolved: 0,
    fromRealGames: 0,
    totalPlayers: 0,
    onlineNow: 0,
  }));

  return (
    <main className="min-h-screen flex flex-col">
      {/* ── Nav ── */}
      <nav className="bg-[#0e0e0e] px-4 sm:px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {/* Left: logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#c8942a] flex items-center justify-center text-white font-bold text-sm">
              C
            </span>
            <span className="text-white font-semibold text-sm hidden sm:inline">
              Cassandra Chess
            </span>
          </Link>

          {/* Right: toggle + sign in + CTA */}
          <div className="flex items-center gap-3">
            <NavLanguageToggle />
            <Link
              href="/onboarding"
              className="text-gray-400 text-sm hover:text-white transition-colors hidden sm:inline"
            >
              Sign in
            </Link>
            <Link
              href="/onboarding"
              className="bg-[#c8942a] text-white text-sm font-semibold px-4 py-1.5 rounded-full hover:bg-[#b5852a] transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="bg-[#0e0e0e] px-4 sm:px-6 pt-16 pb-20">
        <div className="max-w-3xl mx-auto text-center">
          {/* Eyebrow */}
          <p className="text-[#c8942a] text-sm font-medium tracking-wide uppercase mb-4">
            Chess puzzle training — reimagined
          </p>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-5">
            Train smarter.{" "}
            <span className="text-[#c8942a]">Chess On.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Cassandra analyses your real games to find the positions where you keep
            going wrong — then drills you on exactly those moments until they stick.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-14">
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-[#c8942a] text-white font-semibold hover:bg-[#b5852a] transition-colors shadow-lg shadow-[#c8942a]/20"
            >
              Get started — it&apos;s free
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center h-12 px-8 rounded-full border border-[#333] text-gray-300 font-semibold hover:border-[#555] hover:text-white transition-colors"
            >
              How it works
            </a>
          </div>

          {/* Stat counters */}
          <HomepageStats
            puzzlesSolved={stats.puzzlesSolved}
            fromRealGames={stats.fromRealGames}
            totalPlayers={stats.totalPlayers}
            onlineNow={stats.onlineNow}
          />
        </div>
      </section>

      {/* ── Why Cassandra ── */}
      <section className="bg-white px-4 sm:px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold text-[#999] uppercase tracking-widest mb-6">
            Why Cassandra
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1 — with badge */}
            <div className="bg-[#f8f7f4] rounded-xl p-5 border border-[#eee]">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-[#1a1a1a] text-sm">
                  Puzzles from your own games
                </h3>
                <span className="text-[9px] font-bold text-[#c8942a] bg-[#c8942a]/10 border border-[#c8942a]/30 px-1.5 py-0.5 rounded-full uppercase whitespace-nowrap ml-2 shrink-0">
                  Unique to Cassandra
                </span>
              </div>
              <p className="text-xs text-[#666] leading-relaxed">
                Connect Lichess or Chess.com. We find the blunders in your recent games
                and turn them into targeted puzzles — so you train on your actual weaknesses.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-[#f8f7f4] rounded-xl p-5 border border-[#eee]">
              <h3 className="font-semibold text-[#1a1a1a] text-sm mb-2">
                Unlimited puzzles, no paywall
              </h3>
              <p className="text-xs text-[#666] leading-relaxed">
                Every feature is free. No premium tier, no puzzle limits.
                Just train as much as you want, whenever you want.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-[#f8f7f4] rounded-xl p-5 border border-[#eee]">
              <h3 className="font-semibold text-[#1a1a1a] text-sm mb-2">
                Connects both platforms
              </h3>
              <p className="text-xs text-[#666] leading-relaxed">
                Link your Lichess and Chess.com accounts.
                Cassandra pulls games from both and merges your training into one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="bg-white px-4 sm:px-6 pb-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold text-[#999] uppercase tracking-widest mb-6">
            How it works
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex gap-3">
              <span className="text-2xl font-extrabold text-[#c8942a]">1</span>
              <div>
                <h3 className="font-semibold text-[#1a1a1a] text-sm mb-1">Connect your account</h3>
                <p className="text-xs text-[#666] leading-relaxed">
                  Link Lichess, Chess.com, or both. Takes 30 seconds.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl font-extrabold text-[#c8942a]">2</span>
              <div>
                <h3 className="font-semibold text-[#1a1a1a] text-sm mb-1">We analyse your games</h3>
                <p className="text-xs text-[#666] leading-relaxed">
                  Stockfish scans your recent games and finds the moments you went wrong.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl font-extrabold text-[#c8942a]">3</span>
              <div>
                <h3 className="font-semibold text-[#1a1a1a] text-sm mb-1">Train on your mistakes</h3>
                <p className="text-xs text-[#666] leading-relaxed">
                  Solve puzzles pulled from your own blunders until the patterns stick.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA block ── */}
      <section className="bg-[#0e0e0e] px-4 sm:px-6 py-16">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-6">
            Ready to stop making the same mistakes?
          </h2>
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-[#c8942a] text-white font-semibold hover:bg-[#b5852a] transition-colors shadow-lg shadow-[#c8942a]/20 mb-6"
          >
            Get started free
          </Link>
          <p className="text-[#c8942a] font-bold text-lg">
            Chess On. &#127942;
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#f8f7f4] px-4 sm:px-6 py-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#999]">
          <p>&copy; 2026 Cassandra Chess</p>
          <p>Puzzles sourced from the Lichess open database (CC0)</p>
        </div>
      </footer>

      <Suspense>
        <ConfirmedToast />
      </Suspense>
    </main>
  );
}
