#!/usr/bin/env python3
"""
Bulk Data Ingestion for Cassandra

Pulls games from Chess.com across a wide elo spectrum for
blitz (3|0, 3|2) and rapid (10|0) time controls.

Strategy:
1. Start with seed players at various elo levels
2. Spider outward — each game gives us an opponent to follow
3. Track elo distribution to ensure coverage across brackets
4. Store everything in a persistent SQLite database

Usage:
    # Quick test (50 games)
    python3 scripts/bulk_ingest.py --test

    # Full ingestion (default: 10,000 games)
    python3 scripts/bulk_ingest.py --max-games 10000

    # Target specific time class
    python3 scripts/bulk_ingest.py --time-class blitz --max-games 5000
"""

import sys
import os
import argparse
import logging
import json
import time
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cassandra.data import ChessComClient, GameParser, Database

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("bulk_ingest")

# ── Seed players across the elo spectrum ──────────────────────────
# We start with a handful of known players at different levels,
# then discover more players from their opponents.
SEED_PLAYERS = [
    # Super GMs (2700+)
    "hikaru", "magnuscarlsen", "firouzja2003", "danielnaroditsky",
    # GMs / IMs (2200-2500)
    "gothamchess", "anna_cramling", "botezlive",
    # Strong club players (1800-2100) — popular streamers/community figures
    "agadmator",
    # The spider will discover lower-rated players from opponents
]

# Time controls we care about
TARGET_TIME_CONTROLS = {
    "blitz": ["180", "180+2"],      # 3|0 and 3|2
    "rapid": ["600"],                # 10|0
}

# Database path
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cassandra.db")


class IngestionTracker:
    """Tracks ingestion progress and elo distribution."""

    def __init__(self):
        self.games_ingested = 0
        self.games_skipped = 0
        self.players_processed = set()
        self.players_queued = set()
        self.elo_histogram = defaultdict(int)  # elo_bucket -> count
        self.time_class_counts = defaultdict(int)
        self.errors = []

    def record_game(self, white_elo: int, black_elo: int, time_class: str):
        self.games_ingested += 1
        # Track elo distribution (bucket by 200s)
        for elo in [white_elo, black_elo]:
            bucket = (elo // 200) * 200
            self.elo_histogram[bucket] += 1
        self.time_class_counts[time_class] += 1

    def print_status(self):
        logger.info(f"\n{'='*60}")
        logger.info(f"INGESTION STATUS")
        logger.info(f"  Games ingested:    {self.games_ingested}")
        logger.info(f"  Games skipped:     {self.games_skipped}")
        logger.info(f"  Players processed: {len(self.players_processed)}")
        logger.info(f"  Players in queue:  {len(self.players_queued)}")

        logger.info(f"\n  Time controls:")
        for tc, count in sorted(self.time_class_counts.items()):
            logger.info(f"    {tc}: {count} games")

        logger.info(f"\n  Elo distribution:")
        for bucket in sorted(self.elo_histogram.keys()):
            count = self.elo_histogram[bucket]
            bar = "█" * (count // 5) if count > 0 else ""
            logger.info(f"    {bucket:>4}-{bucket+199:<4}: {count:>5} {bar}")

        logger.info(f"{'='*60}\n")

    def get_underrepresented_elo(self) -> tuple[int, int]:
        """Find the elo range with the least data for targeted spidering."""
        if not self.elo_histogram:
            return (800, 1200)
        min_bucket = min(self.elo_histogram, key=self.elo_histogram.get)
        return (min_bucket, min_bucket + 200)


def filter_time_control(game_record) -> bool:
    """Check if a game matches our target time controls."""
    tc = game_record.time_control
    for time_class, controls in TARGET_TIME_CONTROLS.items():
        for control in controls:
            if tc == control or tc.startswith(control):
                return True
    return False


def discover_opponents(games, tracker, max_discover: int = 20) -> list[str]:
    """Extract opponent usernames from games for spidering."""
    opponents = set()
    for game in games:
        for username in [game.white_username, game.black_username]:
            username_lower = username.lower()
            if (
                username_lower not in tracker.players_processed
                and username_lower not in tracker.players_queued
            ):
                opponents.add(username_lower)
                if len(opponents) >= max_discover:
                    return list(opponents)
    return list(opponents)


def ingest_player(
    client: ChessComClient,
    parser: GameParser,
    db: Database,
    username: str,
    tracker: IngestionTracker,
    games_per_player: int = 200,
    time_class: str = None,
) -> int:
    """
    Ingest games for a single player.
    Returns number of new games stored.
    """
    tracker.players_processed.add(username.lower())
    tracker.players_queued.discard(username.lower())

    logger.info(f"Fetching games for {username}...")

    try:
        result = client.fetch_player_games(
            username=username,
            time_class=time_class,
            max_games=games_per_player,
            rated_only=True,
        )
    except Exception as e:
        logger.error(f"Failed to fetch {username}: {e}")
        tracker.errors.append(f"{username}: {e}")
        return 0

    if not result.games:
        logger.info(f"  No games found for {username}")
        return 0

    # Filter to our target time controls
    filtered = [g for g in result.games if filter_time_control(g)]
    logger.info(f"  Fetched {result.total_fetched}, {len(filtered)} match target time controls")

    if not filtered:
        return 0

    # Parse games
    parsed = parser.parse_many(filtered)
    if not parsed:
        return 0

    # Store in database
    store_result = db.store_many(parsed)
    stored = store_result["stored"]
    tracker.games_skipped += store_result["skipped"]

    # Track elo distribution
    for game in filtered[:stored] if stored > 0 else []:
        tracker.record_game(game.white_rating, game.black_rating, game.time_class)

    logger.info(
        f"  Stored {stored} new games, "
        f"skipped {store_result['skipped']} duplicates"
    )

    return stored


def run_ingestion(
    max_games: int = 10000,
    time_class: str = None,
    games_per_player: int = 200,
    test_mode: bool = False,
):
    """
    Main ingestion loop.

    1. Process seed players
    2. Spider to their opponents
    3. Repeat until we hit max_games
    """
    if test_mode:
        max_games = 50
        games_per_player = 10

    client = ChessComClient(rate_limit=1.2)  # Be nice to Chess.com
    parser = GameParser()
    db = Database(DB_PATH)
    tracker = IngestionTracker()

    logger.info(f"Starting ingestion: target={max_games} games, time_class={time_class or 'all'}")
    logger.info(f"Database: {DB_PATH}")

    # Check existing data
    existing_stats = db.get_stats()
    logger.info(f"Existing data: {existing_stats}")

    # Build the processing queue
    queue = list(SEED_PLAYERS)
    tracker.players_queued = set(p.lower() for p in queue)

    while tracker.games_ingested < max_games and queue:
        username = queue.pop(0)

        if username.lower() in tracker.players_processed:
            continue

        # Ingest this player's games
        # Alternate between blitz and rapid if no specific class requested
        if time_class:
            classes_to_fetch = [time_class]
        else:
            classes_to_fetch = ["blitz", "rapid"]

        all_games = []
        for tc in classes_to_fetch:
            stored = ingest_player(
                client, parser, db, username, tracker,
                games_per_player=games_per_player,
                time_class=tc,
            )
            if stored > 0:
                # Fetch the games again for opponent discovery
                result = client.fetch_player_games(
                    username=username, time_class=tc,
                    max_games=games_per_player,
                )
                all_games.extend(result.games)

        # Discover opponents and add to queue
        new_opponents = discover_opponents(all_games, tracker)
        for opp in new_opponents:
            if opp not in tracker.players_processed:
                queue.append(opp)
                tracker.players_queued.add(opp)

        # Status update every 5 players
        if len(tracker.players_processed) % 5 == 0:
            tracker.print_status()

        # Check if we've hit the target
        if tracker.games_ingested >= max_games:
            logger.info(f"Reached target of {max_games} games!")
            break

    # Final status
    tracker.print_status()

    # Print database stats
    final_stats = db.get_stats()
    logger.info(f"Final database stats: {final_stats}")

    # Save tracker state
    state_path = os.path.join(os.path.dirname(DB_PATH), "ingestion_state.json")
    with open(state_path, "w") as f:
        json.dump({
            "games_ingested": tracker.games_ingested,
            "players_processed": list(tracker.players_processed),
            "elo_histogram": dict(tracker.elo_histogram),
            "time_class_counts": dict(tracker.time_class_counts),
        }, f, indent=2)
    logger.info(f"State saved to {state_path}")


def main():
    p = argparse.ArgumentParser(description="Cassandra bulk data ingestion")
    p.add_argument("--max-games", type=int, default=10000, help="Target number of games")
    p.add_argument("--time-class", type=str, default=None, help="Filter: blitz, rapid, or bullet")
    p.add_argument("--games-per-player", type=int, default=200, help="Max games per player")
    p.add_argument("--test", action="store_true", help="Quick test mode (50 games)")
    args = p.parse_args()

    run_ingestion(
        max_games=args.max_games,
        time_class=args.time_class,
        games_per_player=args.games_per_player,
        test_mode=args.test,
    )


if __name__ == "__main__":
    main()
