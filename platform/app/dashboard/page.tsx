import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTotalImportedCount } from "@/lib/jobs/importGames";
import LockedFeature from "@/components/LockedFeature";

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
    },
  });

  // No connected accounts → back to onboarding
  if (!user?.lichessUsername && !user?.chessComUsername) {
    redirect("/onboarding");
  }

  const displayName =
    user?.lichessUsername ?? user?.chessComUsername ?? "Player";
  const displayElo = user?.rawElo ?? user?.elo;
  const totalImported = user ? await getTotalImportedCount(user.id) : 0;

  const stripeLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← Home
          </Link>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold text-lg">
                {displayName[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
                {displayElo && (
                  <p className="text-sm text-gray-500">
                    Rating: <span className="font-semibold text-gray-700">{displayElo}</span>
                    {user?.eloPlatform && (
                      <span className="ml-1 text-gray-400">
                        ({user.eloPlatform === "lichess" ? "Lichess" : "Chess.com"})
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
            {stripeLink && (
              <a
                href={stripeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-full hover:bg-purple-100 transition-colors"
              >
                ✨ Go ad-free
              </a>
            )}
          </div>
        </div>

        {/* Connected accounts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Connected accounts</h2>
          <div className="space-y-2">
            {user?.lichessUsername && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-bold">L</div>
                <span className="text-gray-600">Lichess:</span>
                <a
                  href={`https://lichess.org/@/${user.lichessUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline"
                >
                  {user.lichessUsername}
                </a>
                <span className="text-green-600 text-xs">✓</span>
              </div>
            )}
            {user?.chessComUsername && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">C</div>
                <span className="text-gray-600">Chess.com:</span>
                <a
                  href={`https://www.chess.com/member/${user.chessComUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline"
                >
                  {user.chessComUsername}
                </a>
                <span className="text-green-600 text-xs">✓</span>
              </div>
            )}
          </div>
          <Link
            href="/settings"
            className="text-xs text-gray-400 hover:underline mt-3 inline-block"
          >
            Manage accounts →
          </Link>
        </div>

        {/* Puzzle stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Your puzzles</h2>
          {totalImported > 0 ? (
            <p className="text-3xl font-extrabold text-blue-600 tabular-nums">
              {totalImported}
              <span className="text-base font-normal text-gray-500 ml-2">
                from your games
              </span>
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              No personal puzzles yet.{" "}
              <Link href="/train" className="text-blue-600 hover:underline">
                Start analysis →
              </Link>
            </p>
          )}
          {user?.currentStreak > 0 && (
            <p className="text-sm text-orange-600 mt-2 font-medium">
              🔥 {user.currentStreak}-day streak
            </p>
          )}
        </div>

        {/* Play now */}
        <div className="grid grid-cols-1 gap-3 mb-4">
          {/* Train on personal puzzles — primary CTA */}
          <Link
            href="/train"
            className="flex items-center justify-between bg-blue-600 text-white rounded-xl p-5 shadow-sm hover:bg-blue-700 transition-colors"
          >
            <div>
              <p className="font-semibold">Train on my games</p>
              <p className="text-xs text-blue-200 mt-0.5">
                {totalImported > 0
                  ? `${totalImported} personal puzzles from your blunders`
                  : "Analyse your games to generate personal puzzles"}
              </p>
            </div>
            <span className="text-lg">→</span>
          </Link>

          <Link
            href="/puzzles"
            className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-blue-400 transition-colors"
          >
            <div>
              <p className="font-semibold text-gray-800">Browse all puzzles</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Curated puzzles matched to your rating
              </p>
            </div>
            <span className="text-gray-400 text-lg">→</span>
          </Link>

          <Link
            href="/battles"
            className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-blue-400 transition-colors"
          >
            <div>
              <p className="font-semibold text-gray-800">⚔️ Duels</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Race a friend through 5 puzzles
              </p>
            </div>
            <span className="text-gray-400 text-lg">→</span>
          </Link>

          <Link
            href="/stats"
            className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-blue-400 transition-colors"
          >
            <div>
              <p className="font-semibold text-gray-800">📊 My stats</p>
              <p className="text-xs text-gray-400 mt-0.5">
                See your tactic weaknesses and slow spots
              </p>
            </div>
            <span className="text-gray-400 text-lg">→</span>
          </Link>
        </div>

        {/* Coming soon */}
        <div className="mt-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Coming soon</h2>
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

        {/* Sign out */}
        <p className="text-center text-xs text-gray-400 mt-6">
          <a href="/api/auth/signout" className="hover:underline">
            Sign out
          </a>
        </p>
      </div>
    </main>
  );
}
