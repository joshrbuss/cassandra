/**
 * Chess.com public game archive API.
 * No auth token required — all endpoints are public.
 *
 * Endpoint: GET https://api.chess.com/pub/player/{username}/games/{year}/{month}
 * Returns: { games: [{ pgn: string, ... }] }
 */

const CHESSCOM_API = "https://api.chess.com";

interface ChessComGame {
  pgn?: string;
  time_class?: string;
  rated?: boolean;
  end_time?: number; // Unix timestamp
}

interface ChessComArchiveResponse {
  games?: ChessComGame[];
}

/**
 * Fetches rated games for a Chess.com user.
 *
 * @param since - If provided, only fetch months that overlap with this date.
 *                If null, fetch ALL available monthly archives (first sync).
 * @param maxGames - Cap on total games returned.
 */
export async function fetchRecentGames(
  username: string,
  maxGames = 500,
  since?: Date | null
): Promise<string[]> {
  const now = new Date();

  let months: { year: number; month: number }[];

  if (since) {
    // Incremental sync: only fetch months from `since` to now
    months = [];
    const d = new Date(since.getFullYear(), since.getMonth(), 1);
    while (d <= now) {
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
      d.setMonth(d.getMonth() + 1);
    }
  } else {
    // First sync: fetch ALL archives from the Chess.com archives endpoint
    try {
      const archivesRes = await fetch(
        `${CHESSCOM_API}/pub/player/${encodeURIComponent(username)}/games/archives`,
        { signal: AbortSignal.timeout(10_000) }
      );
      if (archivesRes.ok) {
        const archivesData = (await archivesRes.json()) as { archives?: string[] };
        // Archives are URLs like "https://api.chess.com/pub/player/username/games/2024/01"
        months = (archivesData.archives ?? []).map((url) => {
          const parts = url.split("/");
          return { year: parseInt(parts[parts.length - 2], 10), month: parseInt(parts[parts.length - 1], 10) };
        }).reverse(); // Most recent first
      } else {
        // Fallback: last 12 months
        months = [];
        for (let i = 0; i < 12; i++) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
        }
      }
    } catch {
      months = [];
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
      }
    }
  }

  const pgns: string[] = [];

  for (const { year, month } of months) {
    if (pgns.length >= maxGames) break;
    const mm = String(month).padStart(2, "0");
    const url = `${CHESSCOM_API}/pub/player/${encodeURIComponent(username)}/games/${year}/${mm}`;

    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) continue;

      const data: ChessComArchiveResponse = await res.json();
      const games = data.games ?? [];

      // Take rated games only, most recent first (archive is oldest-first)
      // Filter by individual game date when doing incremental sync
      for (const game of [...games].reverse()) {
        if (game.rated && game.pgn) {
          if (since && game.end_time) {
            const gameDate = new Date(game.end_time * 1000);
            if (gameDate <= since) continue;
          }
          pgns.push(game.pgn);
          if (pgns.length >= maxGames) break;
        }
      }
    } catch {
      // Skip on timeout or parse error
    }
  }

  return pgns.slice(0, maxGames);
}
