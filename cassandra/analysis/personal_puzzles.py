"""
Personal Puzzle Generator

Generates puzzles from YOUR actual games — not random positions
you'll never reach, but moments where you had a tactic and missed it.

Each puzzle includes:
  - The position where you went wrong
  - The correct move (what you should have played)
  - What you actually played and why it was worse
  - The full game context (opening, how you reached this position)
  - An "impact score" — how often you reach similar positions

This is Cassandra's answer to Chess.com puzzles: relevant, personal,
and connected to your actual playing patterns.
"""

import logging
from dataclasses import dataclass, field
from typing import Optional
from collections import defaultdict

logger = logging.getLogger(__name__)


@dataclass
class PersonalPuzzle:
    """A puzzle generated from your own game."""
    # The position
    fen: str
    position_hash: str

    # The solution
    correct_move_uci: str
    correct_move_san: str
    correct_eval: float  # eval after the correct move

    # What you actually played
    your_move_uci: str
    your_move_san: str
    your_eval: float  # eval after your move
    eval_loss: float  # how much your move cost you (centipawns)

    # Classification
    mistake_type: str  # "blunder", "mistake", "missed_tactic"
    tactical_motif: Optional[str] = None  # "fork", "pin", "skewer", etc.

    # Game context
    game_url: str = ""
    your_color: str = ""  # "white" or "black"
    your_elo: int = 0
    opponent_elo: int = 0
    opponent_username: str = ""
    opening_eco: str = ""
    opening_name: str = ""
    move_number: int = 0
    time_class: str = ""
    game_result: str = ""  # did you win/lose/draw this game?

    # The moves leading up to this position (for "how did I get here?")
    preceding_moves: list[dict] = field(default_factory=list)
    # Each: {"move_san": str, "move_number": int, "is_yours": bool}

    # Impact scoring
    impact_score: float = 0.0  # higher = more valuable to study
    frequency: int = 0  # how often you reach this type of position
    times_missed: int = 0  # how many times you've missed this pattern

    @property
    def difficulty(self) -> str:
        """Rough difficulty based on eval loss and motif."""
        if self.eval_loss > 500:
            return "easy"  # Big tactic, should be findable
        elif self.eval_loss > 200:
            return "medium"
        else:
            return "hard"  # Subtle advantage, harder to spot

    @property
    def description(self) -> str:
        phase = "opening" if self.move_number <= 10 else "middlegame" if self.move_number <= 25 else "endgame"
        return (
            f"Move {self.move_number} ({phase}) — You played {self.your_move_san} "
            f"but {self.correct_move_san} was better "
            f"({self.eval_loss:.0f}cp loss). "
            f"vs {self.opponent_username} ({self.opponent_elo}), {self.time_class}."
        )


@dataclass
class PuzzleSet:
    """A curated set of puzzles for a player."""
    username: str
    total_games_analyzed: int = 0
    total_puzzles_found: int = 0
    puzzles: list[PersonalPuzzle] = field(default_factory=list)

    # Aggregate insights
    weakest_phase: str = ""  # "opening", "middlegame", or "endgame"
    most_common_mistake_type: str = ""
    avg_eval_loss: float = 0.0
    patterns_summary: dict = field(default_factory=dict)
    # e.g., {"missed_fork": 12, "missed_pin": 5, "opening_blunder": 8}

    def top_puzzles(self, n: int = 10) -> list[PersonalPuzzle]:
        """Get the N highest-impact puzzles."""
        return sorted(self.puzzles, key=lambda p: p.impact_score, reverse=True)[:n]

    def by_phase(self, phase: str) -> list[PersonalPuzzle]:
        """Get puzzles from a specific game phase."""
        ranges = {"opening": (1, 10), "middlegame": (11, 25), "endgame": (26, 999)}
        lo, hi = ranges.get(phase, (1, 999))
        return [p for p in self.puzzles if lo <= p.move_number <= hi]

    def by_motif(self, motif: str) -> list[PersonalPuzzle]:
        """Get puzzles of a specific tactical type."""
        return [p for p in self.puzzles if p.tactical_motif == motif]


class PersonalPuzzleGenerator:
    """
    Generates personalized puzzles from a player's games.

    Usage:
        from cassandra.data import ChessComClient, GameParser, Database
        from cassandra.engine import StockfishEvaluator

        client = ChessComClient()
        parser = GameParser()
        db = Database("cassandra.db")
        evaluator = StockfishEvaluator()

        gen = PersonalPuzzleGenerator(client, parser, db, evaluator)
        puzzle_set = gen.generate("J_R_B_01", max_games=100)

        print(f"Found {puzzle_set.total_puzzles_found} puzzles!")
        for puzzle in puzzle_set.top_puzzles(5):
            print(puzzle.description)
    """

    def __init__(
        self,
        client,
        parser,
        database,
        evaluator=None,
        min_eval_loss: float = 80.0,  # Minimum centipawn loss to create a puzzle
        max_puzzles_per_game: int = 3,  # Don't overload from one game
    ):
        self.client = client
        self.parser = parser
        self.db = database
        self.evaluator = evaluator
        self.min_eval_loss = min_eval_loss
        self.max_puzzles_per_game = max_puzzles_per_game

    def generate(
        self,
        username: str,
        time_class: Optional[str] = None,
        max_games: Optional[int] = None,
        include_wins: bool = True,
    ) -> PuzzleSet:
        """
        Generate personalized puzzles for a player.

        Args:
            username: Chess.com username
            time_class: Filter to "blitz", "rapid", etc.
            max_games: Max games to analyze
            include_wins: Include mistakes from games you won too
                         (these are often the most instructive)
        """
        puzzle_set = PuzzleSet(username=username)

        # Step 1: Fetch games
        logger.info(f"Fetching games for {username}...")
        result = self.client.fetch_player_games(
            username=username,
            time_class=time_class,
            max_games=max_games,
        )
        logger.info(f"Fetched {result.total_fetched} games")

        if not result.games:
            return puzzle_set

        # Step 2: Parse games
        logger.info("Parsing games...")
        parsed_games = self.parser.parse_many(result.games)
        puzzle_set.total_games_analyzed = len(parsed_games)

        # Step 3: Store in database (for cross-referencing with Lichess data later)
        self.db.store_many(parsed_games)

        # Step 4: Evaluate and find mistakes
        if self.evaluator is None:
            logger.warning(
                "No Stockfish evaluator — storing games but can't generate puzzles yet. "
                "Initialize with a StockfishEvaluator to enable puzzle generation."
            )
            return puzzle_set

        logger.info("Evaluating positions with Stockfish...")
        phase_losses = {"opening": [], "middlegame": [], "endgame": []}
        motif_counts = defaultdict(int)

        for i, (parsed, game_record) in enumerate(zip(parsed_games, result.games)):
            if (i + 1) % 10 == 0:
                logger.info(f"  Analyzing game {i+1}/{len(parsed_games)}...")

            # Determine which color the player is
            is_white = game_record.white_username.lower() == username.lower()
            player_color = "white" if is_white else "black"

            game_puzzles = []

            for j, pos in enumerate(parsed.positions):
                # Only look at the player's moves
                if pos.is_white_to_move != is_white:
                    continue

                # Skip if we don't want winning game mistakes
                if not include_wins and pos.game_result == "win":
                    continue

                # Evaluate position
                ev = self.evaluator.evaluate_position(pos.fen, pos.move_played_uci)
                if ev is None:
                    continue

                # Track phase losses
                if pos.move_number <= 10:
                    phase_losses["opening"].append(ev.eval_loss)
                elif pos.move_number <= 25:
                    phase_losses["middlegame"].append(ev.eval_loss)
                else:
                    phase_losses["endgame"].append(ev.eval_loss)

                # Safety: skip if player already played the best move
                # (this can happen if eval_loss is nonzero due to search depth variance)
                if pos.move_played_uci == ev.best_move_uci:
                    continue

                # Is this a puzzle-worthy mistake?
                if ev.eval_loss >= self.min_eval_loss and len(game_puzzles) < self.max_puzzles_per_game:
                    # Try to detect the tactical motif
                    from .tactical_reachability import TacticalReachability
                    tr = TacticalReachability(self.db)
                    motif = tr.detect_tactical_motif(
                        pos.fen, ev.best_move_uci, ev.eval_loss
                    )

                    if motif:
                        motif_counts[motif] += 1

                    # Build the preceding moves for context
                    preceding = []
                    start = max(0, j - 6)  # Show up to 6 moves before
                    for k in range(start, j):
                        prev_pos = parsed.positions[k]
                        preceding.append({
                            "move_san": prev_pos.move_played_san,
                            "move_number": prev_pos.move_number,
                            "is_yours": prev_pos.is_white_to_move == is_white,
                        })

                    # Determine mistake type
                    if ev.eval_loss >= 200:
                        mistake_type = "blunder"
                    elif motif:
                        mistake_type = "missed_tactic"
                    else:
                        mistake_type = "mistake"

                    puzzle = PersonalPuzzle(
                        fen=pos.fen,
                        position_hash=pos.position_hash,
                        correct_move_uci=ev.best_move_uci,
                        correct_move_san=ev.best_move_san,
                        correct_eval=ev.eval_before,
                        your_move_uci=pos.move_played_uci,
                        your_move_san=pos.move_played_san,
                        your_eval=ev.eval_after,
                        eval_loss=ev.eval_loss,
                        mistake_type=mistake_type,
                        tactical_motif=motif,
                        game_url=game_record.url,
                        your_color=player_color,
                        your_elo=pos.player_elo,
                        opponent_elo=pos.opponent_elo,
                        opponent_username=(
                            game_record.black_username if is_white
                            else game_record.white_username
                        ),
                        opening_eco=parsed.opening_eco,
                        opening_name=parsed.opening_name,
                        move_number=pos.move_number,
                        time_class=game_record.time_class,
                        game_result=pos.game_result,
                        preceding_moves=preceding,
                    )

                    game_puzzles.append(puzzle)

            puzzle_set.puzzles.extend(game_puzzles)

        puzzle_set.total_puzzles_found = len(puzzle_set.puzzles)

        # Compute aggregate insights
        if puzzle_set.puzzles:
            puzzle_set.avg_eval_loss = sum(
                p.eval_loss for p in puzzle_set.puzzles
            ) / len(puzzle_set.puzzles)

            # Find weakest phase
            phase_avgs = {}
            for phase, losses in phase_losses.items():
                if losses:
                    phase_avgs[phase] = sum(losses) / len(losses)
            if phase_avgs:
                puzzle_set.weakest_phase = max(phase_avgs, key=phase_avgs.get)

            puzzle_set.patterns_summary = dict(motif_counts)

        # Compute impact scores
        self._score_puzzles(puzzle_set)

        logger.info(
            f"Generated {puzzle_set.total_puzzles_found} puzzles from "
            f"{puzzle_set.total_games_analyzed} games"
        )

        return puzzle_set

    def _score_puzzles(self, puzzle_set: PuzzleSet):
        """
        Score puzzles by impact — how valuable is it to study this position?

        Impact = eval_loss * recurrence * phase_weight

        High impact means: big mistake, in a position type you see often,
        during a phase where you're weakest.
        """
        # Count position hash frequency (how often do you reach similar positions?)
        hash_freq = defaultdict(int)
        for p in puzzle_set.puzzles:
            hash_freq[p.position_hash] += 1

        # Phase weights (your weakest phase gets highest weight)
        phase_weights = {"opening": 1.0, "middlegame": 1.0, "endgame": 1.0}
        if puzzle_set.weakest_phase:
            phase_weights[puzzle_set.weakest_phase] = 1.5

        for puzzle in puzzle_set.puzzles:
            phase = (
                "opening" if puzzle.move_number <= 10
                else "middlegame" if puzzle.move_number <= 25
                else "endgame"
            )

            frequency_bonus = hash_freq[puzzle.position_hash]
            phase_weight = phase_weights.get(phase, 1.0)

            # Impact = eval_loss * sqrt(frequency) * phase_weight
            import math
            puzzle.impact_score = (
                puzzle.eval_loss
                * math.sqrt(max(frequency_bonus, 1))
                * phase_weight
            )
            puzzle.frequency = frequency_bonus
