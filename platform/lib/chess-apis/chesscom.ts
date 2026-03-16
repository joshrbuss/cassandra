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
}

interface ChessComArchiveResponse {
  games?: ChessComGame[];
}

/**
 * Fetches rated games for a Chess.com user from the last 6 months.
 * Returns an array of PGN strings (one per game), capped at maxGames.
 */
export async function fetchRecentGames(
  username: string,
  maxGames = 200
): Promise<string[]> {
  const now = new Date();
  const months: { year: number; month: number }[] = [];

  // Last 6 months
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
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
      for (const game of [...games].reverse()) {
        if (game.rated && game.pgn) {
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
