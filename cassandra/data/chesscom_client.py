"""
Chess.com API Client

Fetches games, player profiles, and puzzle data from the Chess.com public API.
Handles rate limiting, pagination, and bulk downloads.

API docs: https://www.chess.com/news/view/published-data-api
"""

import time
import logging
from dataclasses import dataclass, field
from typing import Optional
from pathlib import Path

import requests

logger = logging.getLogger(__name__)

BASE_URL = "https://api.chess.com/pub"

# Chess.com asks for a contact header for heavy API usage
DEFAULT_HEADERS = {
    "User-Agent": "Cassandra Chess Engine (github.com/cassandra-chess)",
    "Accept": "application/json",
}

# Rate limit: Chess.com doesn't publish hard limits but ~1 req/sec is safe
RATE_LIMIT_DELAY = 1.0


@dataclass
class PlayerProfile:
    username: str
    rating_rapid: Optional[int] = None
    rating_blitz: Optional[int] = None
    rating_bullet: Optional[int] = None
    country: Optional[str] = None
    joined: Optional[int] = None


@dataclass
class GameRecord:
    """A single game fetched from Chess.com."""
    url: str
    pgn: str
    time_control: str
    time_class: str  # rapid, blitz, bullet, daily
    white_username: str
    white_rating: int
    black_username: str
    black_rating: int
    result: str  # "win", "loss", "draw" from white's perspective
    end_time: int
    rules: str  # "chess", "chess960", etc.
    rated: bool


@dataclass
class FetchResult:
    """Result of a bulk fetch operation."""
    games: list[GameRecord] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    total_fetched: int = 0
    archives_processed: int = 0


class ChessComClient:
    """
    Client for the Chess.com public API.

    Usage:
        client = ChessComClient()
        result = client.fetch_player_games("hikaru", time_class="blitz", max_games=1000)
        for game in result.games:
            print(game.white_username, game.white_rating, game.result)
    """

    def __init__(self, rate_limit: float = RATE_LIMIT_DELAY, cache_dir: Optional[Path] = None):
        self.rate_limit = rate_limit
        self.session = requests.Session()
        self.session.headers.update(DEFAULT_HEADERS)
        self._last_request_time = 0.0
        self.cache_dir = cache_dir
        if cache_dir:
            cache_dir.mkdir(parents=True, exist_ok=True)

    def _throttle(self):
        """Enforce rate limiting between requests."""
        elapsed = time.time() - self._last_request_time
        if elapsed < self.rate_limit:
            time.sleep(self.rate_limit - elapsed)
        self._last_request_time = time.time()

    def _get(self, endpoint: str) -> dict:
        """Make a GET request with rate limiting and error handling."""
        self._throttle()
        url = f"{BASE_URL}{endpoint}"
        logger.debug(f"GET {url}")

        try:
            resp = self.session.get(url, timeout=30)
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.HTTPError as e:
            if resp.status_code == 404:
                logger.warning(f"Not found: {url}")
                return {}
            elif resp.status_code == 429:
                logger.warning("Rate limited — backing off 60s")
                time.sleep(60)
                return self._get(endpoint)  # retry once
            raise
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed: {e}")
            raise

    # ── Player endpoints ──────────────────────────────────────────

    def get_player_profile(self, username: str) -> Optional[PlayerProfile]:
        """Fetch a player's profile and ratings."""
        profile_data = self._get(f"/player/{username}")
        if not profile_data:
            return None

        stats_data = self._get(f"/player/{username}/stats")

        def _rating(category: str) -> Optional[int]:
            cat = stats_data.get(category, {})
            last = cat.get("last", {})
            return last.get("rating")

        return PlayerProfile(
            username=profile_data.get("username", username),
            rating_rapid=_rating("chess_rapid"),
            rating_blitz=_rating("chess_blitz"),
            rating_bullet=_rating("chess_bullet"),
            country=profile_data.get("country", "").split("/")[-1],
            joined=profile_data.get("joined"),
        )

    # ── Game archive endpoints ────────────────────────────────────

    def get_game_archives(self, username: str) -> list[str]:
        """Get list of monthly archive URLs for a player."""
        data = self._get(f"/player/{username}/games/archives")
        return data.get("archives", [])

    def _parse_game(self, raw: dict) -> Optional[GameRecord]:
        """Parse a raw game dict from the API into a GameRecord."""
        try:
            # Skip non-standard chess
            if raw.get("rules", "chess") != "chess":
                return None

            pgn = raw.get("pgn", "")
            if not pgn:
                return None

            white = raw.get("white", {})
            black = raw.get("black", {})

            # Determine result from white's perspective
            white_result = white.get("result", "")
            if white_result == "win":
                result = "win"
            elif white_result in ("checkmated", "timeout", "resigned", "abandoned"):
                result = "loss"
            else:
                result = "draw"

            return GameRecord(
                url=raw.get("url", ""),
                pgn=pgn,
                time_control=raw.get("time_control", ""),
                time_class=raw.get("time_class", ""),
                white_username=white.get("username", ""),
                white_rating=white.get("rating", 0),
                black_username=black.get("username", ""),
                black_rating=black.get("rating", 0),
                result=result,
                end_time=raw.get("end_time", 0),
                rules=raw.get("rules", "chess"),
                rated=raw.get("rated", False),
            )
        except (KeyError, TypeError) as e:
            logger.warning(f"Failed to parse game: {e}")
            return None

    def fetch_archive(self, archive_url: str) -> list[GameRecord]:
        """Fetch all games from a single monthly archive URL."""
        # Archive URLs look like: https://api.chess.com/pub/player/USERNAME/games/2024/01
        # Extract the endpoint portion
        endpoint = archive_url.replace(BASE_URL, "")
        data = self._get(endpoint)
        games = []
        for raw in data.get("games", []):
            game = self._parse_game(raw)
            if game:
                games.append(game)
        return games

    def fetch_player_games(
        self,
        username: str,
        time_class: Optional[str] = None,
        rated_only: bool = True,
        max_games: Optional[int] = None,
        min_elo: Optional[int] = None,
        max_elo: Optional[int] = None,
    ) -> FetchResult:
        """
        Fetch games for a player with optional filtering.

        Args:
            username: Chess.com username
            time_class: Filter by time control ("rapid", "blitz", "bullet", "daily")
            rated_only: Only include rated games
            max_games: Stop after fetching this many games
            min_elo: Only include games where both players are >= this elo
            max_elo: Only include games where both players are <= this elo

        Returns:
            FetchResult with games and metadata
        """
        result = FetchResult()
        archives = self.get_game_archives(username)

        if not archives:
            result.errors.append(f"No archives found for {username}")
            return result

        # Process archives in reverse chronological order (newest first)
        for archive_url in reversed(archives):
            try:
                games = self.fetch_archive(archive_url)
                result.archives_processed += 1

                for game in games:
                    # Apply filters
                    if rated_only and not game.rated:
                        continue
                    if time_class and game.time_class != time_class:
                        continue
                    if min_elo and (game.white_rating < min_elo or game.black_rating < min_elo):
                        continue
                    if max_elo and (game.white_rating > max_elo or game.black_rating > max_elo):
                        continue

                    result.games.append(game)
                    result.total_fetched += 1

                    if max_games and result.total_fetched >= max_games:
                        logger.info(f"Reached max_games limit ({max_games})")
                        return result

                logger.info(
                    f"Archive {result.archives_processed}: "
                    f"{len(games)} games fetched, {result.total_fetched} total"
                )

            except Exception as e:
                error_msg = f"Error processing archive {archive_url}: {e}"
                logger.error(error_msg)
                result.errors.append(error_msg)

        return result

    # ── Bulk fetch by elo range ───────────────────────────────────

    def fetch_titled_players(self, title: str = "GM") -> list[str]:
        """Get list of players with a given title (GM, IM, FM, etc.)."""
        data = self._get(f"/titled/{title}")
        return data.get("players", [])

    def fetch_games_by_elo_bracket(
        self,
        usernames: list[str],
        elo_min: int,
        elo_max: int,
        time_class: str = "blitz",
        games_per_player: int = 100,
        max_total: int = 10000,
    ) -> FetchResult:
        """
        Fetch games from multiple players filtered to an elo bracket.
        Useful for building elo-segmented datasets.
        """
        combined = FetchResult()

        for username in usernames:
            if combined.total_fetched >= max_total:
                break

            remaining = max_total - combined.total_fetched
            player_max = min(games_per_player, remaining)

            logger.info(f"Fetching up to {player_max} games for {username}")
            player_result = self.fetch_player_games(
                username=username,
                time_class=time_class,
                min_elo=elo_min,
                max_elo=elo_max,
                max_games=player_max,
            )

            combined.games.extend(player_result.games)
            combined.total_fetched += player_result.total_fetched
            combined.errors.extend(player_result.errors)
            combined.archives_processed += player_result.archives_processed

        return combined
