"""
Game Parser

Converts PGN game records into structured position data.
Each game becomes a sequence of positions with:
  - FEN (board state)
  - Move played
  - Move number
  - Player elo at time of game
  - Position hash (for transposition detection)

This is the bridge between raw Chess.com data and the analysis modules.
"""

import logging
from dataclasses import dataclass, field
from typing import Optional

import chess
import chess.pgn
import io

logger = logging.getLogger(__name__)


@dataclass
class PositionRecord:
    """A single position encountered in a game."""
    fen: str
    position_hash: str  # Zobrist-like hash for transposition matching
    move_played_uci: str  # The move that was played FROM this position
    move_played_san: str  # Human-readable move notation
    move_number: int
    is_white_to_move: bool
    player_elo: int  # Elo of the player whose turn it is
    opponent_elo: int
    game_result: str  # "win", "loss", "draw" from the moving player's perspective
    game_url: str
    time_class: str


@dataclass
class ParsedGame:
    """A fully parsed game as a sequence of positions."""
    positions: list[PositionRecord] = field(default_factory=list)
    white_username: str = ""
    black_username: str = ""
    white_elo: int = 0
    black_elo: int = 0
    result: str = ""
    opening_eco: str = ""
    opening_name: str = ""
    time_class: str = ""
    game_url: str = ""
    total_moves: int = 0


def _position_hash(board: chess.Board) -> str:
    """
    Create a canonical position hash that catches transpositions.

    Uses the board's Zobrist hash which accounts for:
    - Piece placement
    - Side to move
    - Castling rights
    - En passant square

    This means two games reaching the same position via different
    move orders will produce the same hash.
    """
    # Use board FEN without move counters as a stable position hash
    # (works across all python-chess versions)
    parts = board.fen().split()
    position_fen = ' '.join(parts[:4])  # piece placement + side + castling + en passant
    return format(hash(position_fen) & 0xFFFFFFFFFFFFFFFF, '016x')


def _result_for_player(game_result: str, is_white: bool) -> str:
    """Convert game result to perspective of the moving player."""
    if game_result == "draw":
        return "draw"
    if is_white:
        return game_result  # already from white's perspective
    else:
        # Flip for black
        if game_result == "win":
            return "loss"
        elif game_result == "loss":
            return "win"
        return "draw"


class GameParser:
    """
    Parses PGN game records into sequences of PositionRecords.

    Usage:
        parser = GameParser()
        parsed = parser.parse_game(game_record)
        for pos in parsed.positions:
            print(pos.fen, pos.move_played_san, pos.position_hash)
    """

    def __init__(self, include_opening_only: bool = False, opening_depth: int = 15):
        """
        Args:
            include_opening_only: If True, only parse the first N moves
            opening_depth: Number of half-moves to include when include_opening_only=True
        """
        self.include_opening_only = include_opening_only
        self.opening_depth = opening_depth

    def parse_pgn(self, pgn_text: str) -> Optional[chess.pgn.Game]:
        """Parse a PGN string into a python-chess Game object."""
        try:
            pgn_io = io.StringIO(pgn_text)
            game = chess.pgn.read_game(pgn_io)
            return game
        except Exception as e:
            logger.warning(f"Failed to parse PGN: {e}")
            return None

    def parse_game(self, game_record) -> Optional[ParsedGame]:
        """
        Parse a GameRecord into a ParsedGame with position sequence.

        Args:
            game_record: A GameRecord from ChessComClient

        Returns:
            ParsedGame with all positions, or None if parsing fails
        """
        chess_game = self.parse_pgn(game_record.pgn)
        if chess_game is None:
            return None

        parsed = ParsedGame(
            white_username=game_record.white_username,
            black_username=game_record.black_username,
            white_elo=game_record.white_rating,
            black_elo=game_record.black_rating,
            result=game_record.result,
            opening_eco=chess_game.headers.get("ECO", ""),
            opening_name=chess_game.headers.get("Opening", ""),
            time_class=game_record.time_class,
            game_url=game_record.url,
        )

        board = chess_game.board()
        half_move = 0

        for move in chess_game.mainline_moves():
            is_white = board.turn == chess.WHITE
            move_number = (half_move // 2) + 1

            # Determine elo and result from the moving player's perspective
            if is_white:
                player_elo = game_record.white_rating
                opponent_elo = game_record.black_rating
            else:
                player_elo = game_record.black_rating
                opponent_elo = game_record.white_rating

            player_result = _result_for_player(game_record.result, is_white)

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
                game_url=game_record.url,
                time_class=game_record.time_class,
            )

            parsed.positions.append(position)
            board.push(move)
            half_move += 1

            if self.include_opening_only and half_move >= self.opening_depth:
                break

        parsed.total_moves = half_move
        return parsed

    def parse_many(self, game_records: list) -> list[ParsedGame]:
        """Parse a batch of game records, skipping failures."""
        parsed_games = []
        failed = 0

        for record in game_records:
            result = self.parse_game(record)
            if result:
                parsed_games.append(result)
            else:
                failed += 1

        if failed:
            logger.warning(f"Failed to parse {failed}/{len(game_records)} games")

        logger.info(
            f"Parsed {len(parsed_games)} games, "
            f"{sum(len(g.positions) for g in parsed_games)} total positions"
        )
        return parsed_games
