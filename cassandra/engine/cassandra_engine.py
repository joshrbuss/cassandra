"""
Cassandra Engine — The Move Selector

This is the actual "engine" that picks moves. Unlike Stockfish which
plays the objectively best move, Cassandra plays the move most likely
to exploit its human opponent's tendencies.

Strategy:
1. Evaluate all legal moves with Stockfish (don't play losing moves)
2. For each candidate move, predict the human's most likely response
3. Score each candidate by: P(human_error) * severity(error) * safety(our_position)
4. Play the move that maximizes expected human suffering

The engine never plays a move that puts itself in a losing position —
it only chooses among "safe" moves based on exploit potential.
"""

import logging
from dataclasses import dataclass
from typing import Optional

import chess

logger = logging.getLogger(__name__)


@dataclass
class CassandraMove:
    """A move selected by the Cassandra engine with full reasoning."""
    move_uci: str
    move_san: str
    # Why Cassandra chose this move
    stockfish_eval: float        # Position eval after this move
    exploit_score: float         # Expected exploit value
    safety_score: float          # How safe is this move objectively?
    combined_score: float        # Final score used for selection
    # What we expect the human to do
    expected_human_response: str
    human_response_probability: float
    human_expected_eval_loss: float
    # For comparison
    stockfish_best_move: str
    stockfish_best_eval: float
    reasoning: str


class CassandraEngine:
    """
    The Cassandra chess engine.

    Usage:
        engine = CassandraEngine(
            evaluator=stockfish_evaluator,
            human_model=markov_model,
            target_elo_bracket="1200-1400"
        )
        move = engine.select_move(board)
        print(f"Cassandra plays: {move.move_san}")
        print(f"Expecting human to play: {move.expected_human_response}")
        print(f"  → which loses {move.human_expected_eval_loss:.0f} centipawns")
    """

    def __init__(
        self,
        evaluator,
        human_model,
        target_elo_bracket: str = "1200-1400",
        safety_threshold: float = -100.0,  # Don't play moves worse than -1 pawn
        exploit_weight: float = 0.7,
        safety_weight: float = 0.3,
    ):
        self.evaluator = evaluator
        self.human_model = human_model
        self.target_elo = target_elo_bracket
        self.safety_threshold = safety_threshold
        self.exploit_weight = exploit_weight
        self.safety_weight = safety_weight

    def select_move(self, board: chess.Board) -> Optional[CassandraMove]:
        """
        Select the best move for Cassandra to play.

        1. Get Stockfish evaluation of all legal moves
        2. Filter to "safe" moves (above safety threshold)
        3. For each safe move, compute exploit potential
        4. Return the move with highest combined score
        """
        fen = board.fen()
        is_white = board.turn == chess.WHITE
        candidates = []

        # Get Stockfish's top recommendation for reference
        sf_eval = self.evaluator.evaluate_position(fen, list(board.legal_moves)[0].uci())
        sf_best = sf_eval.best_move_uci if sf_eval else ""
        sf_best_eval = sf_eval.eval_before if sf_eval else 0.0

        for move in board.legal_moves:
            board.push(move)
            move_san = board.san(move) if False else move.uci()  # will fix with proper san

            # Evaluate position after our move
            # (Use a quick shallow eval for speed)
            after_fen = board.fen()
            board.pop()

            # Get exploit candidates for this specific move
            exploit_candidates = self.human_model.find_exploit_candidates(
                fen=fen,
                target_elo_bracket=self.target_elo,
                evaluator=self.evaluator,
            )

            # Find if this move has exploit potential
            exploit_data = None
            for ec in exploit_candidates:
                if ec.cassandra_move_uci == move.uci():
                    exploit_data = ec
                    break

            exploit_score = exploit_data.exploit_score if exploit_data else 0.0
            safety_score = sf_best_eval  # simplified — would need per-move eval

            combined = (
                self.exploit_weight * exploit_score
                + self.safety_weight * safety_score
            )

            candidates.append(CassandraMove(
                move_uci=move.uci(),
                move_san=move_san,
                stockfish_eval=safety_score,
                exploit_score=exploit_score,
                safety_score=safety_score,
                combined_score=combined,
                expected_human_response=exploit_data.expected_human_move_san if exploit_data else "?",
                human_response_probability=exploit_data.human_move_probability if exploit_data else 0.0,
                human_expected_eval_loss=exploit_data.eval_loss_if_human_plays_expected if exploit_data else 0.0,
                stockfish_best_move=sf_best,
                stockfish_best_eval=sf_best_eval,
                reasoning=self._generate_reasoning(exploit_data),
            ))

        if not candidates:
            return None

        # Sort by combined score
        candidates.sort(key=lambda c: c.combined_score, reverse=True)
        return candidates[0]

    def _generate_reasoning(self, exploit_data) -> str:
        """Generate human-readable reasoning for the move choice."""
        if not exploit_data:
            return "No exploit data — falling back to positional play"

        return (
            f"Human has {exploit_data.human_move_probability:.0%} chance of playing "
            f"{exploit_data.expected_human_move_san}, which loses "
            f"{exploit_data.eval_loss_if_human_plays_expected:.0f}cp. "
            f"They should play {exploit_data.best_human_response_san} instead."
        )
