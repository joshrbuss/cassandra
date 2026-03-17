import type { Metadata } from "next";
import Link from "next/link";
import ShareButton from "@/components/marketing/ShareButton";

export const metadata: Metadata = {
  title: "About the Creator",
  description: "Meet the creator of Cassandra Chess — chess ratings, recent games, and more.",
};

// Re-fetch Chess.com data at most once per hour
export const revalidate = 3600;

// ── Chess.com API types ───────────────────────────────────────────────────────

interface ChessComProfile {
  username: string;
  avatar?: string;
  url: string;
}

interface RatedCategory {
  last?: { rating: number };
}

interface ChessComStats {
  chess_bullet?: RatedCategory;
  chess_blitz?: RatedCategory;
  chess_rapid?: RatedCategory;
  chess_daily?: RatedCategory;
}

interface ChessComGamePlayer {
  username: string;
  result: string; // "win" | "resigned" | "checkmated" | "drawn" | ...
}

interface ChessComGame {
  white: ChessComGamePlayer;
  black: ChessComGamePlayer;
  time_class: string; // "bullet" | "blitz" | "rapid" | "daily"
  end_time: number; // Unix timestamp
}

interface ChessComGamesResponse {
  games: ChessComGame[];
}

// ── Data fetching ─────────────────────────────────────────────────────────────

const CHESSCOM_HEADERS = {
  "User-Agent": "Cassandra Chess Puzzles (https://cassandrachess.com)",
};

async function fetchChessComData(username: string) {
  const base = "https://api.chess.com/pub/player";

  const [profileRes, statsRes, archivesRes] = await Promise.all([
    fetch(`${base}/${username}`, { headers: CHESSCOM_HEADERS }),
    fetch(`${base}/${username}/stats`, { headers: CHESSCOM_HEADERS }),
    fetch(`${base}/${username}/games/archives`, { headers: CHESSCOM_HEADERS }),
  ]);

  const profile: ChessComProfile | null = profileRes.ok
    ? ((await profileRes.json()) as ChessComProfile)
    : null;

  const stats: ChessComStats | null = statsRes.ok
    ? ((await statsRes.json()) as ChessComStats)
    : null;

  // Fetch the most recent month of games
  let recentGames: ChessComGame[] = [];
  if (archivesRes.ok) {
    const { archives } = (await archivesRes.json()) as { archives: string[] };
    const latestArchiveUrl = archives.at(-1);
    if (latestArchiveUrl) {
      const gamesRes = await fetch(latestArchiveUrl, { headers: CHESSCOM_HEADERS });
      if (gamesRes.ok) {
        const data = (await gamesRes.json()) as ChessComGamesResponse;
        // Newest first, take last 5
        recentGames = [...data.games].reverse().slice(0, 5);
      }
    }
  }

  return { profile, stats, recentGames };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeResult(result: string): "W" | "L" | "D" {
  if (result === "win") return "W";
  if (["drawn", "stalemate", "agreed", "repetition", "insufficient", "50move", "timevsinsufficient"].includes(result))
    return "D";
  return "L";
}

function resultColor(r: "W" | "L" | "D") {
  return r === "W" ? "text-green-600 bg-green-50 border-green-200"
    : r === "L" ? "text-red-600 bg-red-50 border-red-200"
    : "text-gray-600 bg-gray-100 border-gray-200";
}

function timeClassLabel(tc: string) {
  return { bullet: "Bullet", blitz: "Blitz", rapid: "Rapid", daily: "Daily" }[tc] ?? tc;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CreatorPage() {
  const username = process.env.NEXT_PUBLIC_CREATOR_CHESSCOM_USERNAME ?? "";
  const twitterHandle = process.env.NEXT_PUBLIC_TWITTER_HANDLE ?? "@cassandrachess";
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://cassandrachess.com";
  const pageUrl = `${siteUrl}/creator`;

  if (!username) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-gray-500 text-sm">
          Set <code className="font-mono">NEXT_PUBLIC_CREATOR_CHESSCOM_USERNAME</code> to enable this page.
        </p>
      </main>
    );
  }

  const { profile, stats, recentGames } = await fetchChessComData(username);

  const ratings = [
    { label: "Bullet", value: stats?.chess_bullet?.last?.rating },
    { label: "Blitz", value: stats?.chess_blitz?.last?.rating },
    { label: "Rapid", value: stats?.chess_rapid?.last?.rating },
    { label: "Daily", value: stats?.chess_daily?.last?.rating },
  ];

  const shareText = `Play chess puzzles with ${twitterHandle} at ${siteUrl}`;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← Home
          </Link>
        </div>

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 px-6 pt-8 pb-14" />

          <div className="px-6 pb-6">
            <div className="-mt-10 mb-4 flex items-end justify-between">
              <div className="relative">
                {profile?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar}
                    alt={`${username}'s Chess.com profile picture`}
                    loading="lazy"
                    className="w-20 h-20 rounded-full border-4 border-white shadow object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full border-4 border-white shadow bg-blue-200 flex items-center justify-center text-3xl font-bold text-blue-700">
                    {username[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <ShareButton
                text={shareText}
                url={pageUrl}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.252 5.622 5.912-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Share
              </ShareButton>
            </div>

            <h1 className="text-xl font-bold text-gray-900">{profile?.username ?? username}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Chess.com</p>

            {/* Rating grid */}
            <div className="grid grid-cols-4 gap-2 mt-5">
              {ratings.map(({ label, value }) => (
                <div key={label} className="text-center rounded-xl border border-gray-100 bg-gray-50 px-2 py-3">
                  <div className="text-lg font-bold text-gray-900">
                    {value ?? "—"}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-5">
              <a
                href={`https://www.chess.com/member/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center h-10 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
              >
                Follow on Chess.com
              </a>
              <a
                href={`https://www.chess.com/play/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center h-10 rounded-lg border border-gray-200 text-gray-700 font-semibold text-sm hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                Challenge me ⚔️
              </a>
            </div>
          </div>
        </div>

        {/* Recent games */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Recent Games</h2>
          {recentGames.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No recent games found.</p>
          ) : (
            <ol className="space-y-2">
              {recentGames.map((game, i) => {
                const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
                const myResult = normalizeResult(isWhite ? game.white.result : game.black.result);
                const opponent = isWhite ? game.black.username : game.white.username;
                const color = resultColor(myResult);
                const date = new Date(game.end_time * 1000);
                const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });

                return (
                  <li
                    key={i}
                    className="flex items-center justify-between text-sm border border-gray-100 rounded-lg px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${color}`}
                      >
                        {myResult}
                      </span>
                      <div>
                        <span className="font-medium text-gray-800">vs {opponent}</span>
                        <span className="ml-2 text-xs text-gray-400">{timeClassLabel(game.time_class)}</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{dateStr}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </main>
  );
}
