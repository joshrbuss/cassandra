import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import EmailSignup from "@/components/marketing/EmailSignup";
import ConfirmedToast from "@/components/marketing/ConfirmedToast";
import { resolveLocale } from "@/lib/i18n";

async function getSiteStats() {
  const [siteStats, distinctPlayers] = await Promise.all([
    prisma.siteStats.findUnique({ where: { id: 1 } }),
    prisma.puzzleAttempt.findMany({
      where: { userId: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ]);

  return {
    puzzlesSolved: Number(siteStats?.totalPuzzlesSolved ?? 0),
    registeredPlayers: distinctPlayers.length,
  };
}

export default async function Home() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("preferred_locale")?.value);

  // Redirect logged-in users straight to their dashboard
  const { auth } = await import("@/auth");
  const session = await auth();
  if (session?.userId) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  const { puzzlesSolved, registeredPlayers } = await getSiteStats().catch(() => ({
    puzzlesSolved: 0,
    registeredPlayers: 0,
  }));

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center">
        <div className="text-5xl mb-4">♟</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Train smarter. Chess On.
        </h1>
        <p className="text-gray-500 text-lg mb-10">
          Cassandra analyses your real games to find the positions where you keep
          going wrong — then drills you on exactly those moments until they stick.
        </p>

        {/* Trust signals */}
        <div className="flex justify-center gap-12 mb-10">
          <div className="text-center">
            <p className="text-5xl font-extrabold text-blue-600 tabular-nums">
              {puzzlesSolved.toLocaleString(locale)}
            </p>
            <p className="text-sm text-gray-500 mt-2 font-medium">Puzzles solved</p>
          </div>
          <div className="text-center">
            <p className="text-5xl font-extrabold text-blue-600 tabular-nums">
              {registeredPlayers.toLocaleString(locale)}
            </p>
            <p className="text-sm text-gray-500 mt-2 font-medium">Players training</p>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow"
          >
            Get Started — it&apos;s free
          </Link>
          <Link
            href="/learn"
            className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-white text-gray-700 font-semibold border border-gray-300 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            How it works
          </Link>
        </div>

        {/* Feature summary */}
        <div className="grid grid-cols-1 gap-4 text-left mb-10">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-1">Puzzles from your own games</h2>
            <p className="text-sm text-gray-500">
              Connect Lichess or Chess.com. We find the blunders in your recent games
              and turn them into targeted puzzles — so you train on your actual weaknesses,
              not random positions.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-1">Spaced repetition that actually works</h2>
            <p className="text-sm text-gray-500">
              Cassandra resurfaces positions you got wrong at the right interval,
              so patterns move from short-term recall into long-term muscle memory.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-1">No random puzzle grinding</h2>
            <p className="text-sm text-gray-500">
              Generic puzzle sets waste hours on positions you already handle well.
              Every puzzle here is chosen because it mirrors a pattern you specifically struggle with.
            </p>
          </div>
        </div>

        {/* Email signup */}
        <div className="mb-4">
          <EmailSignup source="homepage" />
        </div>
      </div>

      <Suspense>
        <ConfirmedToast />
      </Suspense>
    </main>
  );
}
