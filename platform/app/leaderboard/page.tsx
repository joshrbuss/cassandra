import type { Metadata } from "next";
import Link from "next/link";
import type { StreakLeaderboardResponse, LeaderboardEntry } from "@/app/api/leaderboard/streaks/route";
import type { ReferralLeaderboardResponse, ReferralLeaderboardEntry } from "@/app/api/leaderboard/referrals/route";
import { countryToFlag } from "@/lib/countryFlag";

export const metadata: Metadata = {
  title: "Leaderboard — Cassandra",
  description: "Top daily puzzle streaks and referrers on Cassandra.",
};

// Revalidate every 60 seconds
export const revalidate = 60;

async function getLeaderboard(): Promise<StreakLeaderboardResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/leaderboard/streaks`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return { current: [], allTime: [] };
  return res.json() as Promise<StreakLeaderboardResponse>;
}

async function getReferralLeaderboard(): Promise<ReferralLeaderboardResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/leaderboard/referrals`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return { entries: [] };
  return res.json() as Promise<ReferralLeaderboardResponse>;
}

function streakBadges(streak: number): string[] {
  const badges: string[] = [];
  if (streak >= 365) badges.push("🔥365");
  else if (streak >= 100) badges.push("🔥100");
  else if (streak >= 30) badges.push("🔥30");
  else if (streak >= 7) badges.push("🔥7");
  return badges;
}

function LeaderboardTable({ entries, label }: { entries: LeaderboardEntry[]; label: string }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic py-4">
        No {label.toLowerCase()} streaks yet — start solving puzzles!
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 uppercase tracking-widest border-b border-gray-100">
            <th className="text-left py-2 pr-4 font-medium w-10">Rank</th>
            <th className="text-left py-2 pr-4 font-medium">Player</th>
            <th className="text-right py-2 pr-4 font-medium">Streak</th>
            <th className="text-right py-2 font-medium">Badges</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {entries.map((entry) => {
            const badges = streakBadges(entry.streak);
            const isTop3 = entry.rank <= 3;
            const rankIcon = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : null;
            return (
              <tr key={entry.userId} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 pr-4 text-gray-400 font-mono">
                  {rankIcon ?? `#${entry.rank}`}
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    {entry.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.avatarUrl}
                        alt={`${entry.displayName}'s avatar`}
                        loading="lazy"
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                        {entry.displayName[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <span className={`font-medium ${isTop3 ? "text-gray-900" : "text-gray-700"}`}>
                      {entry.displayName}
                    </span>
                    {countryToFlag(entry.country) && (
                      <span className="text-sm">{countryToFlag(entry.country)}</span>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-4 text-right font-mono font-bold text-blue-600">
                  {entry.streak}d
                </td>
                <td className="py-3 text-right">
                  {badges.length > 0 ? (
                    <span className="text-sm">{badges.join(" ")}</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ReferralTable({ entries }: { entries: (ReferralLeaderboardEntry & { country?: string | null })[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic py-4">
        No referrals yet — share your link to get started!
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 uppercase tracking-widest border-b border-gray-100">
            <th className="text-left py-2 pr-4 font-medium w-10">Rank</th>
            <th className="text-left py-2 pr-4 font-medium">Player</th>
            <th className="text-right py-2 font-medium">Referrals</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {entries.map((entry) => {
            const isTop3 = entry.rank <= 3;
            const rankIcon = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : null;
            return (
              <tr key={entry.userId} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 pr-4 text-gray-400 font-mono">
                  {rankIcon ?? `#${entry.rank}`}
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    {entry.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.avatarUrl} alt={`${entry.displayName}'s avatar`} loading="lazy" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                        {entry.displayName[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <span className={`font-medium ${isTop3 ? "text-gray-900" : "text-gray-700"}`}>
                      {entry.displayName}
                    </span>
                    {countryToFlag(entry.country) && (
                      <span className="text-sm">{countryToFlag(entry.country)}</span>
                    )}
                  </div>
                </td>
                <td className="py-3 text-right font-mono font-bold text-emerald-600">
                  {entry.referralCount}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "alltime" ? "alltime" : tab === "referrals" ? "referrals" : "current";
  const [{ current, allTime }, { entries: referralEntries }] = await Promise.all([
    getLeaderboard(),
    getReferralLeaderboard(),
  ]);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← Home
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">Leaderboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Solve puzzles, keep your streak, and invite friends.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
          <Link
            href="/leaderboard?tab=current"
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "current"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Current Streaks
          </Link>
          <Link
            href="/leaderboard?tab=alltime"
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "alltime"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            All-Time
          </Link>
          <Link
            href="/leaderboard?tab=referrals"
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "referrals"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Top Referrers
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          {activeTab === "current" ? (
            <LeaderboardTable entries={current} label="Current" />
          ) : activeTab === "alltime" ? (
            <LeaderboardTable entries={allTime} label="All-time" />
          ) : (
            <ReferralTable entries={referralEntries} />
          )}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/puzzles"
            className="inline-flex items-center justify-center h-10 px-6 rounded-full bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
          >
            Solve Puzzles →
          </Link>
        </div>
      </div>
    </main>
  );
}
