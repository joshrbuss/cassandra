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
  url?: string;
}

/**
 * Fetches rated games for a Lichess user.
 *
 * @param since - If provided, only fetch games after this date.
 *                If null, fetch all available games (first sync).
 * @param count - Max games to return.
 */
export async function fetchRecentGames(
  username: string,
  count = 500,
  since?: Date | null
): Promise<string[]> {
  const url = new URL(`${LICHESS_API}/api/games/user/${encodeURIComponent(username)}`);
  url.searchParams.set("max", String(count));
  url.searchParams.set("moves", "true");
  url.searchParams.set("opening", "false");
  url.searchParams.set("clocks", "false");
  url.searchParams.set("evals", "true");  // include %eval annotations for blunder detection
  url.searchParams.set("rated", "true");

  if (since) {
    // Incremental: only games after last sync
    url.searchParams.set("since", String(since.getTime()));
  }
  // If no `since`, Lichess returns the most recent `count` games (all time)

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/x-ndjson",
      "User-Agent": "CassandraChess/1.0",
    },
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
        let pgn = game.pgn;
        if (game.id && !pgn.includes("[Site ")) {
          pgn = `[Site "https://lichess.org/${game.id}"]\n${pgn}`;
        }
        pgns.push(pgn);
      }
    } catch {
      // Skip malformed lines
    }
  }

  return pgns;
}
