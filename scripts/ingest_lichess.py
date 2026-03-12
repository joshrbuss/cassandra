#!/usr/bin/env python3
"""
Lichess Bulk Ingestion for Cassandra

Streams and processes Lichess monthly PGN database dumps.
Handles .pgn.zst (Zstandard compressed) files by streaming
decompression — no need to decompress the full file first.

Filters to target time controls (blitz 3|0, 3|2 and rapid 10|0)
and samples across the full elo spectrum.

Usage:
    # Process with defaults (blitz + rapid, all elos, 100k games)
    python3 scripts/ingest_lichess.py data/lichess_2025-10.pgn.zst

    # Limit to 10k games for testing
    python3 scripts/ingest_lichess.py data/lichess_2025-10.pgn.zst --max-games 10000

    # Only blitz
    python3 scripts/ingest_lichess.py data/lichess_2025-10.pgn.zst --time-class blitz

    # Process an uncompressed PGN
    python3 scripts/ingest_lichess.py data/games.pgn

Dependencies:
    pip3 install zstandard python-chess sqlalchemy numpy tqdm
"""

import sys
import os
import io
import argparse
import logging
import time
import json
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import chess
import chess.pgn
from tqdm import tqdm

from cassandra.data.game_parser import _position_hash, _result_for_player, PositionRecord, ParsedGame
from cassandra.data.db import Database

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("ingest_lichess")


# ── Configuration ─────────────────────────────────────────────────

# Target time controls (Lichess format)
# Lichess TimeControl header: "180+0" (3|0), "180+2" (3|2), "600+0" (10|0)
TARGET_TIME_CONTROLS = {
    "180+0",    # 3|0 blitz
    "180+2",    # 3|2 blitz
    "600+0",    # 10|0 rapid
}

# Map Lichess time controls to our labels
TIME_CONTROL_LABELS = {
    "180+0": "blitz",
    "180+2": "blitz",
    "600+0": "rapid",
}

DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "cassandra.db",
)


# ── Streaming PGN reader ─────────────────────────────────────────

def stream_pgn_file(filepath: str):
    """
    Generator that yields one chess.pgn.Game at a time from a file.
    Handles both .pgn and .pgn.zst files.
    """
    if filepath.endswith(".zst"):
        try:
            import zstandard as zstd
        except ImportError:
            logger.error("zstandard not installed. Run: pip3 install zstandard")
            sys.exit(1)

        dctx = zstd.ZstdDecompressor()
        with open(filepath, "rb") as compressed:
            with dctx.stream_reader(compressed) as reader:
                text_stream = io.TextIOWrapper(reader, encoding="utf-8", errors="replace")
                while True:
                    game = chess.pgn.read_game(text_stream)
                    if game is None:
                        break
                    yield game
    else:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            while True:
                game = chess.pgn.read_game(f)
                if game is None:
                    break
                yield game


# ── Game parsing (Lichess format) ─────────────────────────────────

def parse_lichess_result(result_str: str, termination: str = "") -> str:
    """Convert Lichess result string to our format (from white's perspective)."""
    if result_str == "1-0":
        return "win"
    elif result_str == "0-1":
        return "loss"
    else:
        return "draw"


def parse_lichess_game(game: chess.pgn.Game) -> ParsedGame:
    """
    Parse a Lichess PGN game into our ParsedGame format.

    Lichess headers include:
        Event, Site, Date, Round, White, Black, Result,
        WhiteElo, BlackElo, WhiteRatingDiff, BlackRatingDiff,
        ECO, Opening, TimeControl, Termination
    """
    headers = game.headers

    white_elo = int(headers.get("WhiteElo", "0") or "0")
    black_elo = int(headers.get("BlackElo", "0") or "0")
    result_str = headers.get("Result", "*")
    result = parse_lichess_result(result_str)
    tc = headers.get("TimeControl", "")
    time_class = TIME_CONTROL_LABELS.get(tc, "other")
    game_url = headers.get("Site", "")

    parsed = ParsedGame(
        white_username=headers.get("White", ""),
        black_username=headers.get("Black", ""),
        white_elo=white_elo,
        black_elo=black_elo,
        result=result,
        opening_eco=headers.get("ECO", ""),
        opening_name=headers.get("Opening", ""),
        time_class=time_class,
        game_url=game_url,
        total_moves=0,
    )

    board = game.board()
    half_move = 0

    for move in game.mainline_moves():
        is_white = board.turn == chess.WHITE
        move_number = (half_move // 2) + 1

        if is_white:
            player_elo = white_elo
            opponent_elo = black_elo
        else:
            player_elo = black_elo
            opponent_elo = white_elo

        player_result = _result_for_player(result, is_white)

        position = PositionRecord(
            fen=board.fen(),
            position_hash=_position_hash(board),
            move_played_uci=move.uci(),
            move_played_san=board.san(move),
            move_number=move_number,
            is_white_to_move=is_white,
            player_elo=player_elo,
            opponent_elo=opponent_elo,
            game_result=player_result,
            game_url=game_url,
            time_class=time_class,
        )

        parsed.positions.append(position)
        board.push(move)
        half_move += 1

    parsed.total_moves = half_move
    return parsed


# ── Main ingestion ────────────────────────────────────────────────

class IngestionStats:
    """Track ingestion progress."""

    def __init__(self):
        self.games_processed = 0
        self.games_stored = 0
        self.games_skipped_tc = 0      # Wrong time control
        self.games_skipped_dup = 0     # Duplicate
        self.games_skipped_short = 0   # Too short
        self.games_skipped_other = 0
        self.positions_stored = 0
        self.elo_histogram = defaultdict(int)
        self.time_class_counts = defaultdict(int)
        self.start_time = time.time()

    def print_summary(self):
        elapsed = time.time() - self.start_time
        rate = self.games_stored / max(elapsed, 1)

        logger.info(f"\n{'='*60}")
        logger.info(f"INGESTION COMPLETE")
        logger.info(f"  Time elapsed:       {elapsed/60:.1f} minutes")
        logger.info(f"  Games scanned:      {self.games_processed:,}")
        logger.info(f"  Games stored:       {self.games_stored:,}")
        logger.info(f"  Positions stored:   {self.positions_stored:,}")
        logger.info(f"  Skipped (time ctrl):{self.games_skipped_tc:,}")
        logger.info(f"  Skipped (too short):{self.games_skipped_short:,}")
        logger.info(f"  Skipped (duplicate):{self.games_skipped_dup:,}")
        logger.info(f"  Ingestion rate:     {rate:.0f} games/sec")

        logger.info(f"\n  Time controls:")
        for tc, count in sorted(self.time_class_counts.items()):
            logger.info(f"    {tc}: {count:,} games")

        logger.info(f"\n  Elo distribution:")
        for bucket in sorted(self.elo_histogram.keys()):
            count = self.elo_histogram[bucket]
            bar = "█" * min(count // 500, 50) if count > 0 else ""
            logger.info(f"    {bucket:>4}-{bucket+199:<4}: {count:>7,} {bar}")

        logger.info(f"{'='*60}\n")


def run_ingestion(
    filepath: str,
    max_games: int = 100_000,
    time_class_filter: str = None,
    min_moves: int = 10,
    batch_size: int = 500,
):
    """
    Stream-ingest a Lichess PGN file into the Cassandra database.

    Args:
        filepath: Path to .pgn or .pgn.zst file
        max_games: Stop after storing this many games
        time_class_filter: Optional filter ("blitz" or "rapid")
        min_moves: Skip games shorter than this many half-moves
        batch_size: Commit to DB every N games
    """
    if not os.path.exists(filepath):
        logger.error(f"File not found: {filepath}")
        sys.exit(1)

    file_size = os.path.getsize(filepath)
    logger.info(f"File: {filepath} ({file_size / 1e9:.1f} GB)")
    logger.info(f"Target: {max_games:,} games")
    logger.info(f"Time controls: {time_class_filter or 'blitz + rapid (3|0, 3|2, 10|0)'}")

    db = Database(DB_PATH)
    stats = IngestionStats()
    batch = []

    existing = db.get_stats()
    logger.info(f"Existing database: {existing}")

    pbar = tqdm(total=max_games, desc="Ingesting", unit=" games")

    try:
        for game in stream_pgn_file(filepath):
            stats.games_processed += 1

            # ── Filter: time control ──
            tc = game.headers.get("TimeControl", "")
            if tc not in TARGET_TIME_CONTROLS:
                stats.games_skipped_tc += 1
                continue

            tc_label = TIME_CONTROL_LABELS.get(tc, "other")
            if time_class_filter and tc_label != time_class_filter:
                stats.games_skipped_tc += 1
                continue

            # ── Filter: game not abandoned / too short ──
            result = game.headers.get("Result", "*")
            if result == "*":
                stats.games_skipped_other += 1
                continue

            # Quick move count check before full parse
            move_count = sum(1 for _ in game.mainline_moves())
            if move_count < min_moves:
                stats.games_skipped_short += 1
                continue

            # ── Parse the game ──
            try:
                parsed = parse_lichess_game(game)
            except Exception as e:
                stats.games_skipped_other += 1
                continue

            batch.append(parsed)

            # ── Batch commit ──
            if len(batch) >= batch_size:
                result = db.store_many(batch)
                stored = result["stored"]
                stats.games_stored += stored
                stats.games_skipped_dup += result["skipped"]
                stats.positions_stored += sum(len(g.positions) for g in batch[:stored])

                # Track elo distribution
                for g in batch[:stored] if stored > 0 else batch:
                    for elo in [g.white_elo, g.black_elo]:
                        bucket = (elo // 200) * 200
                        stats.elo_histogram[bucket] += 1
                    stats.time_class_counts[g.time_class] += 1

                pbar.update(stored)
                batch = []

            # ── Check if done ──
            if stats.games_stored >= max_games:
                break

            # ── Progress logging ──
            if stats.games_processed % 50000 == 0:
                elapsed = time.time() - stats.start_time
                scan_rate = stats.games_processed / max(elapsed, 1)
                logger.info(
                    f"  Scanned {stats.games_processed:,} games "
                    f"({scan_rate:.0f}/sec), stored {stats.games_stored:,}"
                )

    except KeyboardInterrupt:
        logger.info("\nInterrupted by user — saving progress...")

    # Flush remaining batch
    if batch:
        result = db.store_many(batch)
        stats.games_stored += result["stored"]
        stats.games_skipped_dup += result["skipped"]
        pbar.update(result["stored"])

    pbar.close()
    stats.print_summary()

    # Save final database stats
    final = db.get_stats()
    logger.info(f"Final database: {final}")

    # Save state
    state_path = os.path.join(os.path.dirname(DB_PATH), "ingestion_state.json")
    with open(state_path, "w") as f:
        json.dump({
            "source_file": filepath,
            "games_stored": stats.games_stored,
            "positions_stored": stats.positions_stored,
            "elo_histogram": dict(stats.elo_histogram),
            "time_class_counts": dict(stats.time_class_counts),
        }, f, indent=2)
    logger.info(f"State saved to {state_path}")


def main():
    p = argparse.ArgumentParser(description="Cassandra Lichess ingestion")
    p.add_argument("file", help="Path to .pgn or .pgn.zst file")
    p.add_argument("--max-games", type=int, default=100_000,
                    help="Max games to store (default: 100,000)")
    p.add_argument("--time-class", type=str, default=None,
                    help="Filter: 'blitz' or 'rapid'")
    p.add_argument("--min-moves", type=int, default=10,
                    help="Skip games shorter than N half-moves (default: 10)")
    p.add_argument("--batch-size", type=int, default=500,
                    help="DB commit batch size (default: 500)")
    args = p.parse_args()

    run_ingestion(
        filepath=args.file,
        max_games=args.max_games,
        time_class_filter=args.time_class,
        min_moves=args.min_moves,
        batch_size=args.batch_size,
    )


if __name__ == "__main__":
    main()
