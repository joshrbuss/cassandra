#!/usr/bin/env python3
"""
Cassandra Database Analysis

Runs analysis on the ingested game database and outputs
JSON data files for the frontend dashboard.

Analyses:
1. Elo distribution and error profiling
2. Opening statistics with transposition detection
3. Move frequency heatmaps for common positions
4. Position hub identification (Pareto positions)

Usage:
    python3 scripts/analyze_database.py
    python3 scripts/analyze_database.py --quick   # Faster, less thorough
"""

import sys
import os
import argparse
import logging
import json
import time
from collections import defaultdict, Counter

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cassandra.data.db import Database, Position, Game, ELO_BRACKETS, elo_to_bracket
from sqlalchemy import func, and_, distinct

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("analyze")

DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "cassandra.db",
)
OUTPUT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "frontend", "data",
)


def ensure_output_dir():
    os.makedirs(OUTPUT_DIR, exist_ok=True)


# ── Analysis 1: Elo Distribution ─────────────────────────────

def analyze_elo_distribution(db):
    """Compute elo distribution and per-bracket stats."""
    logger.info("Analyzing elo distribution...")
    session = db.get_session()
    try:
        brackets = []
        for low, high, label in ELO_BRACKETS:
            game_count = session.query(func.count(distinct(Position.game_id))).filter(
                Position.player_elo >= low,
                Position.player_elo < high,
            ).scalar() or 0

            position_count = session.query(func.count(Position.id)).filter(
                Position.player_elo >= low,
                Position.player_elo < high,
            ).scalar() or 0

            brackets.append({
                "label": label,
                "low": low,
                "high": high,
                "games": game_count,
                "positions": position_count,
            })

        return {"brackets": brackets}
    finally:
        session.close()


# ── Analysis 2: Opening Statistics ────────────────────────────

def analyze_openings(db, min_games=50):
    """Top openings by frequency with win rates."""
    logger.info("Analyzing openings...")
    session = db.get_session()
    try:
        # Get opening counts first
        openings_raw = session.query(
            Game.opening_eco,
            Game.opening_name,
            Game.result,
        ).filter(
            Game.opening_eco.isnot(None),
            Game.opening_eco != "",
        ).all()

        # Aggregate in Python (avoids SQLAlchemy case() version headaches)
        from collections import defaultdict
        eco_stats = defaultdict(lambda: {"name": "", "total": 0, "wins": 0, "losses": 0, "draws": 0})
        for eco, name, result in openings_raw:
            eco_stats[eco]["name"] = name or eco
            eco_stats[eco]["total"] += 1
            if result == "win":
                eco_stats[eco]["wins"] += 1
            elif result == "loss":
                eco_stats[eco]["losses"] += 1
            else:
                eco_stats[eco]["draws"] += 1

        openings = []
        for eco, s in eco_stats.items():
            if s["total"] < min_games:
                continue
            total = s["total"]
            openings.append({
                "eco": eco,
                "name": s["name"],
                "games": total,
                "white_win_rate": round(s["wins"] / total, 4),
                "black_win_rate": round(s["losses"] / total, 4),
                "draw_rate": round(s["draws"] / total, 4),
            })

        openings.sort(key=lambda x: x["games"], reverse=True)
        return {"openings": openings[:50]}
    finally:
        session.close()


# ── Analysis 3: Transposition Detection ───────────────────────

def analyze_transpositions(db, max_move=15, min_visits=20, min_openings=2):
    """Find positions reached by multiple openings."""
    logger.info("Analyzing transpositions (this may take a minute)...")
    session = db.get_session()
    try:
        # For each position in the first 15 moves, find which openings reach it
        # We do this by joining positions to games
        results = session.query(
            Position.position_hash,
            Position.fen,
            func.count(distinct(Position.game_id)).label("game_count"),
            func.count(distinct(Game.opening_eco)).label("opening_count"),
            func.avg(Position.move_number).label("avg_move"),
        ).join(
            Game, Position.game_id == Game.id
        ).filter(
            Position.move_number <= max_move,
            Game.opening_eco.isnot(None),
            Game.opening_eco != "",
        ).group_by(
            Position.position_hash
        ).having(
            and_(
                func.count(distinct(Position.game_id)) >= min_visits,
                func.count(distinct(Game.opening_eco)) >= min_openings,
            )
        ).order_by(
            func.count(distinct(Game.opening_eco)).desc(),
            func.count(distinct(Position.game_id)).desc(),
        ).limit(100).all()

        hubs = []
        for r in results:
            # Get the actual opening ECOs for this position
            opening_ecos = session.query(
                distinct(Game.opening_eco)
            ).join(
                Position, Position.game_id == Game.id
            ).filter(
                Position.position_hash == r.position_hash,
                Game.opening_eco.isnot(None),
            ).all()

            eco_list = [e[0] for e in opening_ecos if e[0]]

            hubs.append({
                "position_hash": r.position_hash,
                "fen": r.fen,
                "games": r.game_count,
                "openings": len(eco_list),
                "opening_ecos": eco_list[:10],
                "avg_move_number": round(r.avg_move, 1),
            })

        return {
            "hubs": hubs,
            "total_transposition_hubs": len(hubs),
        }
    finally:
        session.close()


# ── Analysis 4: Most Common Positions ─────────────────────────

def analyze_common_positions(db, max_positions=50):
    """Find the most frequently occurring positions (Pareto positions)."""
    logger.info("Finding Pareto positions...")
    session = db.get_session()
    try:
        top_positions = session.query(
            Position.position_hash,
            Position.fen,
            func.count().label("total_visits"),
            func.count(distinct(Position.game_id)).label("unique_games"),
            func.avg(Position.move_number).label("avg_move_number"),
        ).group_by(
            Position.position_hash
        ).order_by(
            func.count().desc()
        ).limit(max_positions).all()

        positions = []
        for p in top_positions:
            # Get move distribution for this position
            moves = session.query(
                Position.move_played_san,
                Position.move_played_uci,
                func.count().label("count"),
            ).filter(
                Position.position_hash == p.position_hash,
            ).group_by(
                Position.move_played_uci,
            ).order_by(
                func.count().desc()
            ).limit(5).all()

            total_moves = sum(m.count for m in moves)
            move_dist = []
            for m in moves:
                move_dist.append({
                    "san": m.move_played_san,
                    "uci": m.move_played_uci,
                    "count": m.count,
                    "freq": round(m.count / max(total_moves, 1), 4),
                })

            positions.append({
                "position_hash": p.position_hash,
                "fen": p.fen,
                "total_visits": p.total_visits,
                "unique_games": p.unique_games,
                "avg_move_number": round(p.avg_move_number, 1),
                "top_moves": move_dist,
            })

        return {"pareto_positions": positions}
    finally:
        session.close()


# ── Analysis 5: Move Diversity by Elo ─────────────────────────

def analyze_move_diversity_by_elo(db, sample_positions=20):
    """
    For common positions, compare how move diversity changes across elo.
    Lower elo = more scattered? Higher elo = more concentrated?
    """
    logger.info("Analyzing move diversity by elo...")
    session = db.get_session()
    try:
        # Get the most common positions
        top_hashes = session.query(
            Position.position_hash,
        ).group_by(
            Position.position_hash
        ).order_by(
            func.count().desc()
        ).limit(sample_positions).all()

        import math
        diversity_data = []

        for (pos_hash,) in top_hashes:
            elo_diversity = {}
            for low, high, label in ELO_BRACKETS:
                moves = session.query(
                    Position.move_played_uci,
                    func.count().label("count"),
                ).filter(
                    Position.position_hash == pos_hash,
                    Position.player_elo >= low,
                    Position.player_elo < high,
                ).group_by(
                    Position.move_played_uci,
                ).all()

                total = sum(m.count for m in moves)
                if total < 10:
                    continue

                # Shannon entropy
                entropy = 0
                for m in moves:
                    p = m.count / total
                    if p > 0:
                        entropy -= p * math.log2(p)

                # Concentration (top move frequency)
                top_freq = max(m.count for m in moves) / total if moves else 0

                elo_diversity[label] = {
                    "entropy": round(entropy, 3),
                    "concentration": round(top_freq, 3),
                    "unique_moves": len(moves),
                    "total_observations": total,
                }

            if elo_diversity:
                # Get FEN for reference
                fen = session.query(Position.fen).filter(
                    Position.position_hash == pos_hash
                ).first()

                diversity_data.append({
                    "position_hash": pos_hash,
                    "fen": fen[0] if fen else "",
                    "by_elo": elo_diversity,
                })

        return {"move_diversity": diversity_data}
    finally:
        session.close()


# ── Analysis 6: Game Length Distribution ──────────────────────

def analyze_game_lengths(db):
    """Game length distribution by elo and time control."""
    logger.info("Analyzing game lengths...")
    session = db.get_session()
    try:
        length_data = {}
        for tc in ["blitz", "rapid"]:
            lengths = session.query(
                Game.total_moves,
            ).filter(
                Game.time_class == tc,
                Game.total_moves.isnot(None),
            ).all()

            if lengths:
                moves_list = [l[0] for l in lengths if l[0]]
                length_data[tc] = {
                    "count": len(moves_list),
                    "avg": round(sum(moves_list) / len(moves_list), 1),
                    "median": sorted(moves_list)[len(moves_list) // 2],
                    "min": min(moves_list),
                    "max": max(moves_list),
                    # Histogram buckets
                    "histogram": dict(Counter(
                        (m // 10) * 10 for m in moves_list
                    )),
                }

        return {"game_lengths": length_data}
    finally:
        session.close()


# ── Main ──────────────────────────────────────────────────────

def main():
    p = argparse.ArgumentParser(description="Cassandra database analysis")
    p.add_argument("--quick", action="store_true", help="Run faster with fewer analyses")
    args = p.parse_args()

    ensure_output_dir()
    db = Database(DB_PATH)

    stats = db.get_stats()
    logger.info(f"Database: {stats}")

    if stats["total_games"] == 0:
        logger.error("No games in database. Run ingestion first.")
        return

    all_results = {"generated_at": time.strftime("%Y-%m-%d %H:%M:%S")}
    all_results["db_stats"] = stats

    # Run analyses
    start = time.time()

    all_results.update(analyze_elo_distribution(db))
    all_results.update(analyze_openings(db))
    all_results.update(analyze_common_positions(db))
    all_results.update(analyze_game_lengths(db))

    if not args.quick:
        all_results.update(analyze_transpositions(db))
        all_results.update(analyze_move_diversity_by_elo(db))

    elapsed = time.time() - start
    logger.info(f"Analysis complete in {elapsed:.1f}s")

    # Save results
    output_path = os.path.join(OUTPUT_DIR, "analysis.json")
    with open(output_path, "w") as f:
        json.dump(all_results, f, indent=2)
    logger.info(f"Results saved to {output_path}")

    # Print summary
    print(f"\n{'='*60}")
    print(f"CASSANDRA DATABASE ANALYSIS")
    print(f"{'='*60}")
    print(f"Games:     {stats['total_games']:,}")
    print(f"Positions: {stats['total_positions']:,}")
    print(f"Unique:    {stats['unique_positions']:,}")

    if "openings" in all_results:
        print(f"\nTop 10 Openings:")
        for o in all_results["openings"][:10]:
            print(f"  {o['eco']} {o['name'][:35]:35} {o['games']:>5} games  "
                  f"W:{o['white_win_rate']:.0%} B:{o['black_win_rate']:.0%} D:{o['draw_rate']:.0%}")

    if "hubs" in all_results:
        print(f"\nTransposition Hubs: {all_results['total_transposition_hubs']}")
        for h in all_results["hubs"][:5]:
            print(f"  {h['fen'][:40]:40} {h['games']:>5} games, "
                  f"{h['openings']} openings: {', '.join(h['opening_ecos'][:4])}")

    if "pareto_positions" in all_results:
        print(f"\nPareto Positions (most visited):")
        for pp in all_results["pareto_positions"][:5]:
            top_move = pp["top_moves"][0] if pp["top_moves"] else {"san": "?", "freq": 0}
            print(f"  {pp['fen'][:40]:40} {pp['total_visits']:>6} visits  "
                  f"Top: {top_move['san']} ({top_move['freq']:.0%})")

    if "move_diversity" in all_results and all_results["move_diversity"]:
        print(f"\nMove Diversity (entropy by elo for top positions):")
        sample = all_results["move_diversity"][0]
        for elo, data in sorted(sample["by_elo"].items()):
            print(f"  {elo:>10}: entropy={data['entropy']:.2f}  "
                  f"concentration={data['concentration']:.0%}  "
                  f"unique_moves={data['unique_moves']}")

    print(f"\nOutput: {output_path}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
