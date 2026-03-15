/**
 * Lichess public game API.
 * No auth token required — fetches publicly available games.
 *
 * Endpoint: GET https://lichess.org/api/games/user/{username}
 * Returns: newline-delimited JSON (NDJSON), each line is a game object with a `pgn` field.
 */

const LICHESS_API = "https://lichess.org";

interface LichessGame {
  pgn?: string;
  moves?: string;
  id?: string;
}

/**
 * Fetches the most recent `count` rated games for a Lichess user.
 * Requests eval annotations (evals=true) so puzzle extraction can run
 * without Stockfish. Returns an array of PGN strings (one per game).
 */
export async function fetchRecentGames(
  username: string,
  count = 200
): Promise<string[]> {
  const url = new URL(`${LICHESS_API}/api/games/user/${encodeURIComponent(username)}`);
  url.searchParams.set("max", String(count));
  url.searchParams.set("moves", "true");
  url.searchParams.set("opening", "false");
  url.searchParams.set("clocks", "false");
  url.searchParams.set("evals", "true");  // include %eval annotations for blunder detection
  url.searchParams.set("rated", "true");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/x-ndjson",
      "User-Agent": "CassandraChess/1.0",
    },
    // 200 games is more data — allow more time
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    console.error(`[lichess] API error ${res.status} for user ${username}`);
    return [];
  }

  const text = await res.text();
  const pgns: string[] = [];

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const game: LichessGame = JSON.parse(trimmed);
      if (game.pgn) {
        pgns.push(game.pgn);
      }
    } catch {
      // Skip malformed lines
    }
  }

  return pgns;
}
