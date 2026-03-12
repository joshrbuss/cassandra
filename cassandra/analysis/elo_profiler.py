"""
Elo Profiler

Segments chess mistakes by elo bracket to understand how different
skill levels err differently.

Key questions:
- Do 1200s blunder tactically while 1800s blunder positionally?
- Are there "signature mistakes" for each elo range?
- What positions cause the most trouble for a specific elo bracket?
- How does move entropy (decision uncertainty) vary by elo?
"""

import logging
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class EloProfile:
    """Error profile for an elo bracket."""
    elo_bracket: str
    total_positions_analyzed: int = 0
    avg_centipawn_loss: float = 0.0
    blunder_rate: float = 0.0  # % of moves that are blunders
    mistake_rate: float = 0.0
    inaccuracy_rate: float = 0.0
    # Breakdown by game phase
    opening_avg_loss: float = 0.0  # moves 1-10
    middlegame_avg_loss: float = 0.0  # moves 11-25
    endgame_avg_loss: float = 0.0  # moves 26+
    # Behavioral patterns
    avg_move_entropy: float = 0.0  # How "predictable" are moves?
    top_mistake_positions: list[dict] = field(default_factory=list)
    # Positions where this elo bracket most often goes wrong


@dataclass
class ComparativeInsight:
    """Insight comparing two elo brackets."""
    bracket_a: str
    bracket_b: str
    dimension: str  # e.g., "blunder_rate", "opening_avg_loss"
    value_a: float
    value_b: float
    insight: str


class EloProfiler:
    """
    Profiles chess errors by elo bracket.

    Usage:
        profiler = EloProfiler(database)
        profile = profiler.profile_bracket("1200-1400")
        print(f"Avg centipawn loss: {profile.avg_centipawn_loss:.1f}")
        print(f"Blunder rate: {profile.blunder_rate:.1%}")

        comparison = profiler.compare_brackets("1200-1400", "1800-2000")
    """

    def __init__(self, database, human_model=None):
        self.db = database
        self.human_model = human_model

    def profile_bracket(self, elo_bracket: str) -> EloProfile:
        """Generate a complete error profile for an elo bracket."""
        session = self.db.get_session()
        try:
            from ..data.db import Position, ELO_BRACKETS
            from sqlalchemy import func, and_

            # Find elo range
            min_elo, max_elo = 0, 9999
            for low, high, label in ELO_BRACKETS:
                if label == elo_bracket:
                    min_elo, max_elo = low, high
                    break

            # Query evaluated positions in this bracket
            base_query = session.query(Position).filter(
                Position.player_elo >= min_elo,
                Position.player_elo < max_elo,
                Position.eval_loss.isnot(None),
            )

            total = base_query.count()
            if total == 0:
                return EloProfile(elo_bracket=elo_bracket)

            profile = EloProfile(
                elo_bracket=elo_bracket,
                total_positions_analyzed=total,
            )

            # Average centipawn loss
            profile.avg_centipawn_loss = session.query(
                func.avg(Position.eval_loss)
            ).filter(
                Position.player_elo >= min_elo,
                Position.player_elo < max_elo,
                Position.eval_loss.isnot(None),
            ).scalar() or 0.0

            # Error rates
            profile.blunder_rate = session.query(func.count()).filter(
                Position.player_elo >= min_elo,
                Position.player_elo < max_elo,
                Position.is_blunder == True,
            ).scalar() / max(total, 1)

            profile.mistake_rate = session.query(func.count()).filter(
                Position.player_elo >= min_elo,
                Position.player_elo < max_elo,
                Position.is_mistake == True,
            ).scalar() / max(total, 1)

            profile.inaccuracy_rate = session.query(func.count()).filter(
                Position.player_elo >= min_elo,
                Position.player_elo < max_elo,
                Position.is_inaccuracy == True,
            ).scalar() / max(total, 1)

            # Phase breakdown
            for phase, (mn, mx), attr in [
                ("opening", (1, 10), "opening_avg_loss"),
                ("middlegame", (11, 25), "middlegame_avg_loss"),
                ("endgame", (26, 999), "endgame_avg_loss"),
            ]:
                avg = session.query(func.avg(Position.eval_loss)).filter(
                    Position.player_elo >= min_elo,
                    Position.player_elo < max_elo,
                    Position.eval_loss.isnot(None),
                    Position.move_number >= mn,
                    Position.move_number <= mx,
                ).scalar() or 0.0
                setattr(profile, attr, avg)

            # Top mistake positions (most frequent blunders)
            mistake_positions = session.query(
                Position.position_hash,
                Position.fen,
                func.count().label("mistake_count"),
                func.avg(Position.eval_loss).label("avg_loss"),
            ).filter(
                Position.player_elo >= min_elo,
                Position.player_elo < max_elo,
                Position.is_blunder == True,
            ).group_by(
                Position.position_hash
            ).order_by(
                func.count().desc()
            ).limit(10).all()

            profile.top_mistake_positions = [
                {
                    "position_hash": mp.position_hash,
                    "fen": mp.fen,
                    "mistake_count": mp.mistake_count,
                    "avg_loss": round(mp.avg_loss, 1),
                }
                for mp in mistake_positions
            ]

            return profile

        finally:
            session.close()

    def compare_brackets(self, bracket_a: str, bracket_b: str) -> list[ComparativeInsight]:
        """Compare error patterns between two elo brackets."""
        profile_a = self.profile_bracket(bracket_a)
        profile_b = self.profile_bracket(bracket_b)

        insights = []

        dimensions = [
            ("avg_centipawn_loss", "Average centipawn loss per move"),
            ("blunder_rate", "Blunder rate"),
            ("opening_avg_loss", "Opening phase average loss"),
            ("middlegame_avg_loss", "Middlegame phase average loss"),
            ("endgame_avg_loss", "Endgame phase average loss"),
        ]

        for dim, label in dimensions:
            val_a = getattr(profile_a, dim, 0)
            val_b = getattr(profile_b, dim, 0)

            if val_a > 0 and val_b > 0:
                ratio = val_a / val_b
                if ratio > 1.2:
                    insight_text = f"{bracket_a} has {ratio:.1f}x higher {label} than {bracket_b}"
                elif ratio < 0.8:
                    insight_text = f"{bracket_b} has {1/ratio:.1f}x higher {label} than {bracket_a}"
                else:
                    insight_text = f"{label} is similar between {bracket_a} and {bracket_b}"
            else:
                insight_text = f"Insufficient data to compare {label}"

            insights.append(ComparativeInsight(
                bracket_a=bracket_a,
                bracket_b=bracket_b,
                dimension=dim,
                value_a=val_a,
                value_b=val_b,
                insight=insight_text,
            ))

        return insights

    def find_signature_mistakes(self, elo_bracket: str, min_frequency: int = 10) -> list[dict]:
        """
        Find mistakes that are disproportionately common in this elo bracket
        compared to the overall population. These are "signature" errors.
        """
        bracket_profile = self.profile_bracket(elo_bracket)

        # Positions where this bracket blunders much more than average
        signatures = []
        for pos in bracket_profile.top_mistake_positions:
            # Would compare against overall blunder rate at this position
            # For now, return the top mistakes as candidates
            signatures.append({
                "position_hash": pos["position_hash"],
                "fen": pos["fen"],
                "frequency": pos["mistake_count"],
                "avg_loss": pos["avg_loss"],
                "type": "frequent_blunder",
            })

        return signatures
