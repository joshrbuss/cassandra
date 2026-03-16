import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTotalImportedCount } from "@/lib/jobs/importGames";
import LockedFeature from "@/components/LockedFeature";
import SyncButton from "@/components/SyncButton";

export const metadata = {
  title: "Dashboard — Cassandra Chess",
};

export default async function DashboardPage() {
  const session = await auth();

  // Must be signed in to see dashboard
  if (!session?.userId) {
    redirect("/onboarding");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      lichessUsername: true,
      chessComUsername: true,
      rawElo: true,
      normalizedElo: true,
      eloPlatform: true,
      elo: true,
      currentStreak: true,
      lastSyncedAt: true,
    },
  });

  // No connected accounts → back to onboarding
  if (!user?.lichessUsername && !user?.chessComUsername) {
    redirect("/onboarding");
  }

  const displayName =
    user?.lichessUsername ?? user?.chessComUsername ?? "Player";
  const displayElo = user?.rawElo ?? user?.elo;

  const [totalImported, userAttempts] = await Promise.all([
    user ? getTotalImportedCount(user.id) : Promise.resolve(0),
    user
      ? prisma.puzzleAttempt.findMany({
          where: { userId: user.id },
          select: { success: true },
        })
      : Promise.resolve([]),
  ]);

  const totalSolved = userAttempts.filter((a) => a.success).length;
  const accuracy =
    userAttempts.length > 0
      ? Math.round((totalSolved / userAttempts.length) * 100)
      : null;

  const stripeLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10">
      <div className="max-w-lg mx-auto">
        {/* Brand bar */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-stone-900 rounded-md flex items-center justify-center">
              <span className="text-amber-400 font-bold text-sm">C</span>
            </div>
            <span className="text-sm font-semibold text-stone-700 group-hover:text-stone-900 transition-colors">
              Cassandra Chess
            </span>
          </Link>
          {stripeLink && (
            <a
              href={stripeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-full hover:bg-purple-100 transition-colors"
            >
              Go ad-free
            </a>
          )}
        </div>

        {/* Greeting + profile */}
        <div className="mb-8">
          <p className="text-sm text-stone-500 mb-1">
            Chess On, {displayName}!
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-stone-900 flex items-center justify-center text-amber-400 font-bold text-lg">
                {displayName[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-stone-900">{displayName}</h1>
                {displayElo && (
                  <p className="text-sm text-stone-500">
                    Rating: <span className="font-semibold text-stone-700">{displayElo}</span>
                    {user?.eloPlatform && (
                      <span className="ml-1 text-stone-400">
                        ({user.eloPlatform === "lichess" ? "Lichess" : "Chess.com"})
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Connected accounts */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm mb-4">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">Connected accounts</h2>
          <div className="space-y-2">
            {user?.lichessUsername && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-full bg-stone-900 flex items-center justify-center text-white text-xs font-bold">L</div>
                <span className="text-stone-600">Lichess:</span>
                <a
                  href={`https://lichess.org/@/${user.lichessUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-amber-700 hover:underline"
                >
                  {user.lichessUsername}
                </a>
                <span className="text-emerald-600 text-xs">✓</span>
              </div>
            )}
            {user?.chessComUsername && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-full bg-green-700 flex items-center justify-center text-white text-xs font-bold">C</div>
                <span className="text-stone-600">Chess.com:</span>
                <a
                  href={`https://www.chess.com/member/${user.chessComUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-amber-700 hover:underline"
                >
                  {user.chessComUsername}
                </a>
                <span className="text-emerald-600 text-xs">✓</span>
              </div>
            )}
          </div>
          <Link
            href="/settings"
            className="text-xs text-stone-400 hover:underline mt-3 inline-block"
          >
            Manage accounts →
          </Link>
        </div>

        {/* Puzzle stats */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-stone-700">Your puzzles</h2>
            {user?.currentStreak > 0 && (
              <span className="text-sm text-orange-600 font-medium">
                {user.currentStreak}-day streak
              </span>
            )}
          </div>
          <div className="flex gap-6 mb-3">
            <div>
              <p className="text-2xl font-extrabold text-amber-700 tabular-nums">{totalImported}</p>
              <p className="text-xs text-stone-400 mt-0.5">personal puzzles</p>
            </div>
            {accuracy !== null && (
              <div>
                <p className="text-2xl font-extrabold text-emerald-700 tabular-nums">{accuracy}%</p>
                <p className="text-xs text-stone-400 mt-0.5">accuracy ({userAttempts.length} attempts)</p>
              </div>
            )}
          </div>
          <SyncButton lastSyncedAt={user?.lastSyncedAt?.toISOString() ?? null} />
        </div>

        {/* Play now */}
        <div className="grid grid-cols-1 gap-3 mb-4">
          {/* Train on personal puzzles — primary CTA */}
          <Link
            href="/train"
            className="flex items-center justify-between bg-emerald-800 text-white rounded-xl p-5 shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <div>
              <p className="font-semibold">Train on my games</p>
              <p className="text-xs text-emerald-300 mt-0.5">
                {totalImported > 0
                  ? `${totalImported} personal puzzles from your blunders`
                  : "Analyse your games to generate personal puzzles"}
              </p>
            </div>
            <span className="text-emerald-300 text-lg">→</span>
          </Link>

          <Link
            href="/puzzles"
            className="flex items-center justify-between bg-white border border-stone-200 rounded-xl p-5 shadow-sm hover:border-amber-400 transition-colors"
          >
            <div>
              <p className="font-semibold text-stone-800">Browse all puzzles</p>
              <p className="text-xs text-stone-400 mt-0.5">
                Curated puzzles matched to your rating
              </p>
            </div>
            <span className="text-stone-400 text-lg">→</span>
          </Link>

          <Link
            href="/stats"
            className="flex items-center justify-between bg-white border border-stone-200 rounded-xl p-5 shadow-sm hover:border-amber-400 transition-colors"
          >
            <div>
              <p className="font-semibold text-stone-800">My stats</p>
              <p className="text-xs text-stone-400 mt-0.5">
                See your tactic weaknesses and slow spots
              </p>
            </div>
            <span className="text-stone-400 text-lg">→</span>
          </Link>
        </div>

        {/* Coming soon */}
        <div className="mt-6">
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Coming soon</h2>
          <div className="grid grid-cols-1 gap-3">
            <LockedFeature
              emoji="⏪"
              name="Rewind"
              description="Replay any position from your game history and explore alternatives"
              source="dashboard-rewind"
            />
            <LockedFeature
              emoji="🎯"
              name="Rank It"
              description="Guess what rating played each move — train your intuition"
              source="dashboard-rankit"
            />
            <LockedFeature
              emoji="📖"
              name="Opening Trainer"
              description="Master your opening repertoire with targeted drills"
              source="dashboard-openings"
            />
            <LockedFeature
              emoji="⚔️"
              name="Duels v2"
              description="Real-time rated puzzle races with leaderboards and ELO"
              source="dashboard-duels"
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-10 pt-6 border-t border-stone-200 text-center">
          <p className="text-xs text-stone-400">
            Cassandra Chess · Puzzles sourced from the Lichess open database (CC0)
          </p>
          <p className="text-xs text-stone-300 mt-2">
            <a href="/api/auth/signout" className="hover:underline hover:text-stone-500">
              Sign out
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
