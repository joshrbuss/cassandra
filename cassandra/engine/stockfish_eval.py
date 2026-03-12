"""
Stockfish Evaluation Layer

Provides position evaluation and best-move analysis using Stockfish.
This is the "ground truth" layer — it tells us what's objectively
good or bad, which we then compare against what humans actually play.

Key metrics computed per position:
  - Centipawn evaluation (before and after human's move)
  - Best move according to Stockfish
  - Centipawn loss (how much the human's move cost them)
  - Classification: blunder / mistake / inaccuracy / good / excellent
"""

import logging
import signal
from dataclasses import dataclass
from typing import Optional

import chess
from stockfish import Stockfish


class _EvalTimeout(Exception):
    pass


def _timeout_handler(signum, frame):
    raise _EvalTimeout("Stockfish evaluation timed out")

logger = logging.getLogger(__name__)

# Thresholds for move classification (in centipawns)
BLUNDER_THRESHOLD = 200    # Lost 2+ pawns worth
MISTAKE_THRESHOLD = 100    # Lost 1+ pawn worth
INACCURACY_THRESHOLD = 50  # Lost 0.5+ pawn worth


@dataclass
class Evaluation:
    """Stockfish evaluation of a position + move."""
    fen: str
    eval_before: float  # centipawns, positive = white advantage
    eval_after: float
    best_move_uci: str
    best_move_san: str
    played_move_uci: str
    played_move_san: str
    eval_loss: float  # how much the played move cost (from mover's perspective)
    classification: str  # "blunder", "mistake", "inaccuracy", "good", "excellent", "book"
    is_best_move: bool
    top_3_moves: list[dict]  # [{"uci": "e2e4", "eval": 0.5}, ...]
    depth: int


class StockfishEvaluator:
    """
    Evaluates positions using Stockfish.

    Usage:
        evaluator = StockfishEvaluator(stockfish_path="/usr/bin/stockfish")
        result = evaluator.evaluate_position(
            fen="rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
            played_move_uci="e7e5"
        )
        print(f"Eval loss: {result.eval_loss}cp — {result.classification}")
    """

    def __init__(
        self,
        stockfish_path: str = "stockfish",
        depth: int = 20,
        threads: int = 4,
        hash_mb: int = 512,
    ):
        self.depth = depth
        self._stockfish_path = stockfish_path
        self._sf_params = {
            "Threads": threads,
            "Hash": hash_mb,
            "UCI_Elo": 3190,  # Max strength
        }
        try:
            self.sf = Stockfish(
                path=stockfish_path,
                depth=depth,
                parameters=self._sf_params,
            )
            logger.info(f"Stockfish initialized (depth={depth}, threads={threads})")
        except Exception as e:
            logger.error(f"Failed to initialize Stockfish: {e}")
            raise

    def _get_eval_cp(self) -> float:
        """Get evaluation in centipawns (from white's perspective)."""
        evaluation = self.sf.get_evaluation()
        if evaluation["type"] == "cp":
            return evaluation["value"]
        elif evaluation["type"] == "mate":
            # Convert mate score to large centipawn value
            mate_in = evaluation["value"]
            return 10000 if mate_in > 0 else -10000
        return 0.0

    def _eval_from_perspective(self, eval_cp: float, is_white: bool) -> float:
        """Convert eval to the moving player's perspective."""
        return eval_cp if is_white else -eval_cp

    def _classify_move(self, eval_loss: float, is_best: bool) -> str:
        """Classify a move based on centipawn loss."""
        if is_best:
            return "excellent"
        if eval_loss <= 0:
            return "good"  # Move was better than expected (or equal)
        if eval_loss < INACCURACY_THRESHOLD:
            return "good"
        if eval_loss < MISTAKE_THRESHOLD:
            return "inaccuracy"
        if eval_loss < BLUNDER_THRESHOLD:
            return "mistake"
        return "blunder"

    def evaluate_position(self, fen: str, played_move_uci: str, timeout_seconds: int = 30) -> Optional[Evaluation]:
        """
        Evaluate a position and the move played from it.

        Args:
            fen: Position in FEN notation
            played_move_uci: The move that was actually played (UCI format)
            timeout_seconds: Max seconds per position before skipping (default: 30)

        Returns:
            Evaluation with before/after evals and classification
        """
        # Set a per-position timeout so Stockfish can't hang the whole script
        old_handler = signal.signal(signal.SIGALRM, _timeout_handler)
        signal.alarm(timeout_seconds)
        try:
            board = chess.Board(fen)
            is_white = board.turn == chess.WHITE

            # Evaluate position BEFORE the move
            # get_eval_cp() returns from side-to-move perspective (UCI protocol).
            # Before the move, side-to-move IS the mover, so this is already
            # from the mover's perspective — no conversion needed.
            self.sf.set_fen_position(fen)
            eval_before = self._get_eval_cp()

            # Get top 3 moves (evals also from mover's perspective)
            top_moves_raw = self.sf.get_top_moves(3)
            top_3 = []
            best_move_uci = ""
            best_move_san = ""

            for i, m in enumerate(top_moves_raw):
                move_obj = chess.Move.from_uci(m["Move"])
                san = board.san(move_obj)
                move_eval = m.get("Centipawn", 0) or 0  # Already mover's perspective
                top_3.append({"uci": m["Move"], "san": san, "eval": move_eval})
                if i == 0:
                    best_move_uci = m["Move"]
                    best_move_san = san

            # Now make the played move and evaluate AFTER
            played_move = chess.Move.from_uci(played_move_uci)
            played_san = board.san(played_move)
            board.push(played_move)

            # After the move, side-to-move is the OPPONENT. get_eval_cp()
            # returns from the opponent's perspective, so negate to get
            # back to the original mover's perspective.
            self.sf.set_fen_position(board.fen())
            eval_after = -self._get_eval_cp()

            # Centipawn loss from the mover's perspective
            eval_loss = eval_before - eval_after
            is_best = played_move_uci == best_move_uci

            return Evaluation(
                fen=fen,
                eval_before=eval_before,
                eval_after=eval_after,
                best_move_uci=best_move_uci,
                best_move_san=best_move_san,
                played_move_uci=played_move_uci,
                played_move_san=played_san,
                eval_loss=eval_loss,
                classification=self._classify_move(eval_loss, is_best),
                is_best_move=is_best,
                top_3_moves=top_3,
                depth=self.depth,
            )

        except _EvalTimeout:
            logger.warning(f"Stockfish timed out ({timeout_seconds}s) on {fen} — skipping")
            # Restart Stockfish since it may be in a bad state
            try:
                self.sf = Stockfish(
                    path=self._stockfish_path,
                    depth=self.depth,
                    parameters=self._sf_params,
                )
            except Exception:
                pass
            return None
        except Exception as e:
            logger.error(f"Evaluation failed for {fen}: {e}")
            return None
        finally:
            signal.alarm(0)  # Cancel any pending alarm
            signal.signal(signal.SIGALRM, old_handler)

    def evaluate_game_positions(self, positions: list, batch_callback=None) -> list[Evaluation]:
        """
        Evaluate all positions in a game.

        Args:
            positions: List of PositionRecord objects
            batch_callback: Optional callback(index, total) for progress tracking

        Returns:
            List of Evaluations in order
        """
        evaluations = []
        total = len(positions)

        for i, pos in enumerate(positions):
            ev = self.evaluate_position(pos.fen, pos.move_played_uci)
            if ev:
                evaluations.append(ev)
            if batch_callback:
                batch_callback(i + 1, total)

        return evaluations
