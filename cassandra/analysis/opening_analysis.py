"""
Opening Analysis

Transposition-aware opening statistics that challenge naive
win/loss attribution.

Key insight: if the Italian Game and Scotch Game frequently
transpose into the same middlegame position, attributing
win rates to one opening vs the other is misleading.
"""

import logging
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class OpeningStats:
    """Statistics for a single opening, with transposition awareness."""
    eco: str
    name: str
    total_games: int = 0
    naive_win_rate: float = 0.0  # Traditional W/L calculation
    adjusted_win_rate: float = 0.0  # After accounting for transpositions
    transposition_rate: float = 0.0  # % of games that transpose
    transposes_to: list[str] = field(default_factory=list)  # ECO codes
    transposes_from: list[str] = field(default_factory=list)
    avg_game_length: float = 0.0
    elo_performance: dict = field(default_factory=dict)  # elo_bracket -> win_rate


class OpeningAnalyzer:
    """
    Transposition-aware opening analysis.

    Usage:
        analyzer = OpeningAnalyzer(database, transposition_graph)
        stats = analyzer.analyze_opening("B90")  # Sicilian Najdorf
        print(f"Naive win rate: {stats.naive_win_rate:.1%}")
        print(f"Adjusted win rate: {stats.adjusted_win_rate:.1%}")
        print(f"Transposition rate: {stats.transposition_rate:.1%}")
    """

    def __init__(self, database, transposition_graph=None):
        self.db = database
        self.graph = transposition_graph

    def analyze_opening(self, eco_code: str) -> OpeningStats:
        """Full analysis of an opening with transposition correction."""
        session = self.db.get_session()
        try:
            from ..data.db import Game

            games = session.query(Game).filter(Game.opening_eco == eco_code).all()

            stats = OpeningStats(
                eco=eco_code,
                name=games[0].opening_name if games else "",
                total_games=len(games),
            )

            if not games:
                return stats

            # Naive win rate
            wins = sum(1 for g in games if g.result == "win")
            draws = sum(1 for g in games if g.result == "draw")
            stats.naive_win_rate = (wins + 0.5 * draws) / len(games)

            # Transposition analysis (if graph is built)
            if self.graph:
                report = self.graph.opening_attribution_report(eco_code)
                stats.transposition_rate = report["transposition_rate"]
                stats.transposes_to = report["transposes_with_openings"]

            return stats

        finally:
            session.close()

    def compare_openings(self, eco_codes: list[str]) -> list[OpeningStats]:
        """Compare multiple openings side by side."""
        return [self.analyze_opening(eco) for eco in eco_codes]

    def find_overrated_openings(self, min_games: int = 100) -> list[dict]:
        """
        Find openings whose naive win rate is significantly different
        from their transposition-adjusted win rate.

        These are openings getting credit (or blame) for positions
        that are actually reached via other openings too.
        """
        session = self.db.get_session()
        try:
            from ..data.db import Game
            from sqlalchemy import func

            eco_counts = session.query(
                Game.opening_eco,
                func.count().label("count"),
            ).group_by(Game.opening_eco).having(
                func.count() >= min_games
            ).all()

            overrated = []
            for eco, count in eco_counts:
                if not eco:
                    continue
                stats = self.analyze_opening(eco)
                if stats.transposition_rate > 0.2:  # >20% transposition
                    overrated.append({
                        "eco": eco,
                        "name": stats.name,
                        "naive_win_rate": stats.naive_win_rate,
                        "transposition_rate": stats.transposition_rate,
                        "games": count,
                    })

            overrated.sort(key=lambda x: x["transposition_rate"], reverse=True)
            return overrated

        finally:
            session.close()
