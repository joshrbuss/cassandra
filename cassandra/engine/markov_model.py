"""
Human Move Probability Model (Markov Chain)

Models how humans actually play chess as a probabilistic process.
For each position, instead of asking "what's the best move?", we ask
"what will a human of rating X most likely play?"

This is the core of Cassandra's thesis: if we can predict human moves,
we can steer the game into positions where the most probable human
response is also a significant mistake.

The model is segmented by elo bracket, so a 1200-rated player's
move distribution looks very different from a 2000-rated player's.
"""

import logging
from dataclasses import dataclass, field
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class MoveDistribution:
    """Probability distribution over moves from a position."""
    position_hash: str
    elo_bracket: str
    total_observations: int
    moves: list[dict] = field(default_factory=list)
    # Each move: {"uci": str, "san": str, "prob": float, "win_rate": float,
    #             "avg_eval_loss": float, "count": int}

    @property
    def entropy(self) -> float:
        """Shannon entropy of the move distribution (higher = more uncertain)."""
        probs = [m["prob"] for m in self.moves if m["prob"] > 0]
        if not probs:
            return 0.0
        return -sum(p * np.log2(p) for p in probs)

    @property
    def top_move(self) -> Optional[dict]:
        return self.moves[0] if self.moves else None

    @property
    def concentration(self) -> float:
        """How concentrated play is on the top move (0-1). High = humans all play the same thing."""
        if not self.moves:
            return 0.0
        return self.moves[0]["prob"]


@dataclass
class ExploitCandidate:
    """
    A move that Cassandra might play to exploit human tendencies.

    The idea: play a move where the most likely human response
    leads to a significantly worse position for them.
    """
    cassandra_move_uci: str
    cassandra_move_san: str
    resulting_position_hash: str
    # What humans will probably play in response
    expected_human_move_uci: str
    expected_human_move_san: str
    human_move_probability: float
    # How bad is the expected human response?
    eval_loss_if_human_plays_expected: float
    # What should the human play instead?
    best_human_response_uci: str
    best_human_response_san: str
    # The "exploit score" — higher means more exploitable
    exploit_score: float


class HumanMoveModel:
    """
    Markov chain model of human chess play.

    Built from observed game data. For any position, provides
    a probability distribution over moves conditioned on elo bracket.

    Usage:
        model = HumanMoveModel(database)
        dist = model.get_distribution("a1b2c3d4e5f6g7h8", elo_bracket="1200-1400")
        print(f"Most likely move: {dist.top_move['san']} ({dist.top_move['prob']:.1%})")
        print(f"Position entropy: {dist.entropy:.2f} bits")

        # Find exploitable positions
        candidates = model.find_exploit_candidates(
            fen="current_position_fen",
            target_elo_bracket="1200-1400"
        )
    """

    def __init__(self, database):
        """
        Args:
            database: A Database instance with populated position data
        """
        self.db = database
        self._cache = {}  # (position_hash, elo_bracket) -> MoveDistribution

    def get_distribution(
        self,
        position_hash: str,
        elo_bracket: Optional[str] = None,
        min_observations: int = 5,
    ) -> Optional[MoveDistribution]:
        """
        Get the human move probability distribution for a position.

        Args:
            position_hash: The position's Zobrist hash
            elo_bracket: Filter to a specific elo range (e.g., "1200-1400")
            min_observations: Minimum game count to return a distribution

        Returns:
            MoveDistribution or None if insufficient data
        """
        cache_key = (position_hash, elo_bracket or "all")
        if cache_key in self._cache:
            return self._cache[cache_key]

        # Query move frequencies from the database
        if elo_bracket:
            from .db import ELO_BRACKETS
            min_elo, max_elo = None, None
            for low, high, label in ELO_BRACKETS:
                if label == elo_bracket:
                    min_elo, max_elo = low, high
                    break
            moves_data = self.db.get_move_frequencies(
                position_hash, min_elo=min_elo, max_elo=max_elo
            )
        else:
            moves_data = self.db.get_move_frequencies(position_hash)

        total = sum(m["count"] for m in moves_data)
        if total < min_observations:
            return None

        moves = []
        for m in moves_data:
            moves.append({
                "uci": m["move_uci"],
                "san": m["move_san"],
                "prob": m["freq"],
                "win_rate": m["win_rate"],
                "avg_eval_loss": 0.0,  # Populated after Stockfish eval
                "count": m["count"],
            })

        dist = MoveDistribution(
            position_hash=position_hash,
            elo_bracket=elo_bracket or "all",
            total_observations=total,
            moves=moves,
        )

        self._cache[cache_key] = dist
        return dist

    def find_exploit_candidates(
        self,
        fen: str,
        target_elo_bracket: str,
        evaluator=None,
        min_human_prob: float = 0.3,
        min_eval_loss: float = 50.0,
    ) -> list[ExploitCandidate]:
        """
        Find moves where the most likely human response is a significant mistake.

        This is Cassandra's core algorithm:
        1. For each legal move Cassandra could play:
           a. Look at the resulting position
           b. Query the human move model for what humans actually play
           c. If the most likely human move is also a significant mistake → exploit candidate

        Args:
            fen: Current position FEN
            target_elo_bracket: What elo bracket is our opponent?
            evaluator: StockfishEvaluator for position assessment
            min_human_prob: Minimum probability that the human plays the exploitable move
            min_eval_loss: Minimum centipawn loss to consider a move "exploitable"

        Returns:
            List of ExploitCandidates sorted by exploit_score (descending)
        """
        import chess
        from ..data.game_parser import _position_hash

        if evaluator is None:
            logger.warning("No evaluator provided — returning empty candidates")
            return []

        board = chess.Board(fen)
        candidates = []

        for move in board.legal_moves:
            board.push(move)
            result_hash = _position_hash(board)
            result_fen = board.fen()

            # What will the human probably play?
            human_dist = self.get_distribution(result_hash, elo_bracket=target_elo_bracket)

            if human_dist and human_dist.top_move:
                top = human_dist.top_move
                if top["prob"] >= min_human_prob:
                    # Evaluate how bad this "likely human move" actually is
                    ev = evaluator.evaluate_position(result_fen, top["uci"])

                    if ev and ev.eval_loss >= min_eval_loss:
                        # Calculate exploit score:
                        # P(human plays this) * eval_loss * log(observations)
                        obs_weight = np.log(max(human_dist.total_observations, 1) + 1)
                        exploit_score = top["prob"] * ev.eval_loss * obs_weight

                        candidates.append(ExploitCandidate(
                            cassandra_move_uci=move.uci(),
                            cassandra_move_san=board.san(move) if False else move.uci(),
                            resulting_position_hash=result_hash,
                            expected_human_move_uci=top["uci"],
                            expected_human_move_san=top["san"],
                            human_move_probability=top["prob"],
                            eval_loss_if_human_plays_expected=ev.eval_loss,
                            best_human_response_uci=ev.best_move_uci,
                            best_human_response_san=ev.best_move_san,
                            exploit_score=exploit_score,
                        ))

            board.pop()

        candidates.sort(key=lambda c: c.exploit_score, reverse=True)
        return candidates

    def get_position_entropy_map(self, position_hashes: list[str], elo_bracket: str) -> dict:
        """
        For a set of positions, compute the entropy of human play.
        High entropy = humans are uncertain, play many different moves.
        Low entropy = humans converge on a single move.

        Useful for finding "critical decision points" in the game tree.
        """
        entropy_map = {}
        for ph in position_hashes:
            dist = self.get_distribution(ph, elo_bracket=elo_bracket)
            if dist:
                entropy_map[ph] = {
                    "entropy": dist.entropy,
                    "concentration": dist.concentration,
                    "observations": dist.total_observations,
                }
        return entropy_map
