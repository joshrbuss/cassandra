"""
Tactical Reachability / Retrograde Analysis

Bridges the gap between "solve this puzzle" and "how would this
position ever occur in a real game?"

For any tactical pattern (fork, pin, skewer, etc.), traces backwards
through the transposition graph to find:
1. Real game paths that led to this position
2. How likely each path is (based on human move model)
3. What common sequences "set up" the tactic

This makes tactics training actionable: instead of studying
decontextualized puzzles, learn the setups that create tactical
opportunities in positions you'll actually reach.
"""

import logging
from dataclasses import dataclass, field
from typing import Optional

import chess

logger = logging.getLogger(__name__)


@dataclass
class TacticalPattern:
    """A detected tactical motif in a position."""
    pattern_type: str  # "fork", "pin", "skewer", "discovered_attack", "back_rank", etc.
    position_hash: str
    fen: str
    winning_move_uci: str
    winning_move_san: str
    eval_gain: float  # centipawns gained by the tactic
    piece_involved: str  # "N", "B", "R", "Q", etc.
    target_squares: list[str] = field(default_factory=list)


@dataclass
class ReachabilityPath:
    """A real game path that leads to a tactical position."""
    moves: list[dict] = field(default_factory=list)
    # Each: {"move_san": str, "move_uci": str, "fen_after": str, "move_number": int}
    source_game_url: str = ""
    white_elo: int = 0
    black_elo: int = 0
    opening_eco: str = ""
    opening_name: str = ""
    path_probability: float = 0.0  # How likely is this path based on human model?


@dataclass
class TacticalInsight:
    """
    Complete analysis of a tactical pattern including how to reach it.
    This is what replaces a puzzle — context-rich tactical training.
    """
    pattern: TacticalPattern
    total_occurrences: int  # How often this tactic appeared in the database
    elo_distribution: dict = field(default_factory=dict)  # elo_bracket -> count
    common_paths: list[ReachabilityPath] = field(default_factory=list)
    setup_moves: list[dict] = field(default_factory=list)
    # Key moves that tend to precede this tactic
    # Each: {"move_san": str, "position_hash": str, "frequency": float}
    insight: str = ""


class TacticalReachability:
    """
    Analyzes how tactical positions are reached in real games.

    Usage:
        tr = TacticalReachability(database, transposition_graph)

        # Find all forks in the database and how they're reached
        forks = tr.find_tactical_patterns("fork", min_eval_gain=200)

        # For a specific tactic, trace how it's reached
        paths = tr.trace_reachability(position_hash, max_depth=10)

        # Get complete tactical insights for training
        insights = tr.generate_training_set(
            pattern_types=["fork", "pin"],
            elo_bracket="1200-1400",
            max_insights=20
        )
    """

    def __init__(self, database, transposition_graph=None, human_model=None):
        self.db = database
        self.graph = transposition_graph
        self.human_model = human_model

    def detect_tactical_motif(self, fen: str, move_uci: str, eval_gain: float) -> Optional[str]:
        """
        Attempt to classify a strong move as a tactical motif.
        Uses heuristics based on piece movement and board state.

        Returns pattern type or None.
        """
        board = chess.Board(fen)
        move = chess.Move.from_uci(move_uci)

        if not board.is_legal(move):
            return None

        piece = board.piece_at(move.from_square)
        if not piece:
            return None

        is_capture = board.is_capture(move)
        gives_check = board.gives_check(move)

        # Make the move to analyze the resulting position
        board.push(move)

        # Fork detection: piece attacks 2+ valuable pieces
        attacked_squares = board.attacks(move.to_square)
        valuable_targets = []
        for sq in attacked_squares:
            target = board.piece_at(sq)
            if target and target.color != piece.color:
                if target.piece_type in (chess.QUEEN, chess.ROOK, chess.KING):
                    valuable_targets.append(sq)

        board.pop()

        if len(valuable_targets) >= 2 and piece.piece_type == chess.KNIGHT:
            return "knight_fork"
        if len(valuable_targets) >= 2:
            return "fork"

        # Pin detection (simplified)
        if eval_gain >= 200 and not is_capture and not gives_check:
            if piece.piece_type in (chess.BISHOP, chess.ROOK):
                return "pin"

        # Back rank threats
        if gives_check and piece.piece_type in (chess.QUEEN, chess.ROOK):
            board.push(move)
            if board.is_checkmate():
                board.pop()
                return "back_rank_mate"
            board.pop()

        # Discovered attack (piece moves, revealing an attack)
        if eval_gain >= 200:
            return "tactical_blow"

        return None

    def find_tactical_patterns(
        self,
        pattern_type: Optional[str] = None,
        min_eval_gain: float = 150.0,
        elo_bracket: Optional[str] = None,
        limit: int = 100,
    ) -> list[TacticalPattern]:
        """
        Find tactical patterns in the evaluated game database.

        Scans positions where eval_loss is high (opponent blundered or
        there was a strong tactical shot) and classifies the motif.
        """
        session = self.db.get_session()
        try:
            from ..data.db import Position

            query = session.query(Position).filter(
                Position.eval_loss.isnot(None),
                Position.eval_loss >= min_eval_gain,
            )

            if elo_bracket:
                from ..data.db import ELO_BRACKETS
                for low, high, label in ELO_BRACKETS:
                    if label == elo_bracket:
                        query = query.filter(
                            Position.player_elo >= low,
                            Position.player_elo < high,
                        )
                        break

            query = query.order_by(Position.eval_loss.desc()).limit(limit * 3)

            patterns = []
            for pos in query:
                motif = self.detect_tactical_motif(
                    pos.fen, pos.eval_best_move_uci or "", pos.eval_loss
                )
                if motif and (pattern_type is None or motif == pattern_type):
                    patterns.append(TacticalPattern(
                        pattern_type=motif,
                        position_hash=pos.position_hash,
                        fen=pos.fen,
                        winning_move_uci=pos.eval_best_move_uci or "",
                        winning_move_san="",  # Would need board context to compute
                        eval_gain=pos.eval_loss,
                        piece_involved="",
                    ))
                    if len(patterns) >= limit:
                        break

            return patterns

        finally:
            session.close()

    def trace_reachability(
        self,
        position_hash: str,
        max_depth: int = 10,
        max_paths: int = 10,
    ) -> list[ReachabilityPath]:
        """
        Trace backwards from a tactical position to find real game
        paths that led there. This is the retrograde analysis.

        Returns the most common paths (sorted by frequency).
        """
        ancestors = self.db.get_position_ancestors(position_hash, max_depth=max_depth)

        paths = []
        session = self.db.get_session()
        try:
            from ..data.db import Position, Game

            # Find games that contain this position
            target_positions = session.query(Position).filter(
                Position.position_hash == position_hash
            ).limit(max_paths * 5).all()

            for target_pos in target_positions[:max_paths]:
                # Get the full move sequence leading to this position
                game_positions = session.query(Position).filter(
                    Position.game_id == target_pos.game_id,
                    Position.move_number <= target_pos.move_number,
                ).order_by(Position.move_number).all()

                game = session.query(Game).get(target_pos.game_id)

                moves = []
                for gp in game_positions:
                    moves.append({
                        "move_san": gp.move_played_san,
                        "move_uci": gp.move_played_uci,
                        "fen_after": gp.fen,
                        "move_number": gp.move_number,
                    })

                path = ReachabilityPath(
                    moves=moves,
                    source_game_url=game.url if game else "",
                    white_elo=game.white_elo if game else 0,
                    black_elo=game.black_elo if game else 0,
                    opening_eco=game.opening_eco if game else "",
                    opening_name=game.opening_name if game else "",
                )
                paths.append(path)

        finally:
            session.close()

        return paths

    def generate_training_set(
        self,
        pattern_types: list[str] = None,
        elo_bracket: str = "1200-1400",
        max_insights: int = 20,
    ) -> list[TacticalInsight]:
        """
        Generate a set of tactical insights for training.
        Each insight includes the tactic AND how to reach it.

        This is Cassandra's alternative to decontextualized puzzles.
        """
        if pattern_types is None:
            pattern_types = ["fork", "knight_fork", "pin", "back_rank_mate"]

        insights = []
        for pt in pattern_types:
            patterns = self.find_tactical_patterns(
                pattern_type=pt,
                elo_bracket=elo_bracket,
                limit=max_insights,
            )

            for pattern in patterns:
                paths = self.trace_reachability(pattern.position_hash)

                insight = TacticalInsight(
                    pattern=pattern,
                    total_occurrences=len(paths),
                    common_paths=paths[:5],
                    insight=(
                        f"This {pattern.pattern_type} appears in real games at the "
                        f"{elo_bracket} level. Here are {len(paths)} real game paths "
                        f"that led to this tactical opportunity."
                    ),
                )
                insights.append(insight)

                if len(insights) >= max_insights:
                    return insights

        return insights
