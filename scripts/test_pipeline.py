#!/usr/bin/env python3
"""
End-to-end pipeline test for Cassandra.

Tests the data pipeline: Chess.com API → Parser → Database
without requiring Stockfish (that layer is tested separately).
"""

import sys
import os
import logging

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(level=logging.INFO, format="%(name)s | %(message)s")
logger = logging.getLogger("test_pipeline")


def test_chesscom_client():
    """Test fetching games from Chess.com API."""
    from cassandra.data import ChessComClient

    logger.info("=" * 60)
    logger.info("Testing Chess.com API Client")
    logger.info("=" * 60)

    client = ChessComClient()

    # Test player profile
    profile = client.get_player_profile("hikaru")
    if profile:
        logger.info(f"Player: {profile.username}")
        logger.info(f"  Blitz: {profile.rating_blitz}")
        logger.info(f"  Rapid: {profile.rating_rapid}")
    else:
        logger.warning("Could not fetch player profile")

    # Test game fetch (small batch)
    logger.info("\nFetching 5 recent blitz games...")
    result = client.fetch_player_games("hikaru", time_class="blitz", max_games=5)
    logger.info(f"  Fetched: {result.total_fetched} games")
    logger.info(f"  Archives processed: {result.archives_processed}")
    if result.errors:
        logger.warning(f"  Errors: {result.errors}")

    for game in result.games[:3]:
        logger.info(
            f"  {game.white_username} ({game.white_rating}) vs "
            f"{game.black_username} ({game.black_rating}) — {game.result}"
        )

    return result.games


def test_game_parser(games):
    """Test parsing PGN games into position sequences."""
    from cassandra.data import GameParser

    logger.info("\n" + "=" * 60)
    logger.info("Testing Game Parser")
    logger.info("=" * 60)

    parser = GameParser()
    parsed_games = parser.parse_many(games)

    logger.info(f"Parsed {len(parsed_games)} games")
    for pg in parsed_games[:2]:
        logger.info(
            f"  {pg.white_username} vs {pg.black_username}: "
            f"{pg.total_moves} half-moves, {len(pg.positions)} positions"
        )
        if pg.positions:
            first = pg.positions[0]
            logger.info(f"    First position hash: {first.position_hash}")
            logger.info(f"    First move: {first.move_played_san}")

            # Check for transpositions (same position hash in different games)
            hashes = [p.position_hash for p in pg.positions]
            logger.info(f"    Unique positions: {len(set(hashes))}/{len(hashes)}")

    return parsed_games


def test_database(parsed_games):
    """Test storing and querying games in the database."""
    from cassandra.data import Database

    logger.info("\n" + "=" * 60)
    logger.info("Testing Database Layer")
    logger.info("=" * 60)

    # Use in-memory database for testing
    db = Database(":memory:")

    # Store games
    result = db.store_many(parsed_games)
    logger.info(f"Store result: {result}")

    # Get stats
    stats = db.get_stats()
    logger.info(f"Database stats: {stats}")

    # Test move frequency query
    if parsed_games and parsed_games[0].positions:
        # Query the starting position
        start_hash = parsed_games[0].positions[0].position_hash
        moves = db.get_move_frequencies(start_hash)
        logger.info(f"\nMove frequencies from starting position:")
        for m in moves[:5]:
            logger.info(
                f"  {m['move_san']}: {m['count']} times "
                f"({m['freq']:.0%}), win rate: {m['win_rate']:.0%}"
            )

    # Test duplicate handling
    result2 = db.store_many(parsed_games)
    logger.info(f"\nDuplicate store result: {result2}")
    assert result2["skipped"] == result["stored"], "Duplicates should be skipped"
    logger.info("Duplicate detection: PASSED")

    return db


def test_transposition_detection(parsed_games):
    """Check if we can detect transpositions across games."""
    logger.info("\n" + "=" * 60)
    logger.info("Testing Transposition Detection")
    logger.info("=" * 60)

    # Collect all position hashes across all games
    from collections import Counter
    hash_counter = Counter()
    hash_to_opening = {}

    for pg in parsed_games:
        for pos in pg.positions:
            hash_counter[pos.position_hash] += 1
            if pos.position_hash not in hash_to_opening:
                hash_to_opening[pos.position_hash] = set()
            hash_to_opening[pos.position_hash].add(pg.opening_eco or "unknown")

    # Find shared positions
    shared = {h: c for h, c in hash_counter.items() if c > 1}
    logger.info(f"Total unique positions: {len(hash_counter)}")
    logger.info(f"Positions appearing in multiple games: {len(shared)}")

    # Find transpositions (same position, different openings)
    transpositions = {
        h: hash_to_opening[h]
        for h in shared
        if len(hash_to_opening[h]) > 1
    }
    logger.info(f"Transposition positions (multiple openings): {len(transpositions)}")

    for h, openings in list(transpositions.items())[:3]:
        logger.info(f"  Position {h[:12]}... reached via: {openings}")


def main():
    logger.info("CASSANDRA CHESS ENGINE — Pipeline Test")
    logger.info("=" * 60)

    # Step 1: Fetch games
    games = test_chesscom_client()
    if not games:
        logger.error("No games fetched — cannot continue")
        return

    # Step 2: Parse games
    parsed = test_game_parser(games)
    if not parsed:
        logger.error("No games parsed — cannot continue")
        return

    # Step 3: Database operations
    db = test_database(parsed)

    # Step 4: Transposition detection
    test_transposition_detection(parsed)

    logger.info("\n" + "=" * 60)
    logger.info("ALL TESTS PASSED")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
