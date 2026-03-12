"""
Database Layer

SQLite-backed storage for games and positions, optimized for
Cassandra's query patterns:

1. Position lookup by hash (transposition detection)
2. Move frequency queries per position + elo bracket
3. Opening lineage tracking
4. Elo-segmented aggregations

Uses SQLAlchemy for the ORM with raw SQL escape hatches for
performance-critical analytical queries.
"""

import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Text,
    func,
    and_,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Session,
    sessionmaker,
    relationship,
)

logger = logging.getLogger(__name__)


# ── ORM Models ────────────────────────────────────────────────────

class Base(DeclarativeBase):
    pass


class Game(Base):
    """A single chess game."""
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, autoincrement=True)
    url = Column(String, unique=True, nullable=False)
    white_username = Column(String, nullable=False)
    black_username = Column(String, nullable=False)
    white_elo = Column(Integer, nullable=False)
    black_elo = Column(Integer, nullable=False)
    result = Column(String, nullable=False)  # win/loss/draw from white's perspective
    time_class = Column(String, nullable=False)
    time_control = Column(String)
    opening_eco = Column(String)
    opening_name = Column(String)
    total_moves = Column(Integer)
    pgn = Column(Text)
    end_time = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

    positions = relationship("Position", back_populates="game", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_game_elo_range", "white_elo", "black_elo"),
        Index("idx_game_time_class", "time_class"),
        Index("idx_game_opening", "opening_eco"),
    )


class Position(Base):
    """A position encountered in a game, linked to the move played."""
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    position_hash = Column(String(16), nullable=False, index=True)
    fen = Column(String, nullable=False)
    move_played_uci = Column(String(5), nullable=False)
    move_played_san = Column(String(10), nullable=False)
    move_number = Column(Integer, nullable=False)
    is_white_to_move = Column(Boolean, nullable=False)
    player_elo = Column(Integer, nullable=False)
    opponent_elo = Column(Integer, nullable=False)
    game_result = Column(String, nullable=False)  # from moving player's perspective

    # Stockfish evaluation (populated later by the eval layer)
    eval_before = Column(Float, nullable=True)  # centipawn eval before the move
    eval_after = Column(Float, nullable=True)   # centipawn eval after the move
    eval_best_move_uci = Column(String(5), nullable=True)
    eval_loss = Column(Float, nullable=True)    # eval_before - eval_after (positive = mistake)
    is_blunder = Column(Boolean, nullable=True)
    is_mistake = Column(Boolean, nullable=True)
    is_inaccuracy = Column(Boolean, nullable=True)

    game = relationship("Game", back_populates="positions")

    __table_args__ = (
        # THE key index: look up all moves played from a given position
        Index("idx_position_hash", "position_hash"),
        # For elo-segmented queries
        Index("idx_position_elo", "position_hash", "player_elo"),
        # For move frequency analysis
        Index("idx_position_move", "position_hash", "move_played_uci"),
    )


class PositionStats(Base):
    """
    Aggregated statistics for a position, precomputed for fast lookups.
    Think of this as a materialized view.
    """
    __tablename__ = "position_stats"

    id = Column(Integer, primary_key=True, autoincrement=True)
    position_hash = Column(String(16), nullable=False)
    elo_bracket = Column(String, nullable=False)  # e.g., "1000-1200", "1200-1400"
    total_games = Column(Integer, default=0)
    white_wins = Column(Integer, default=0)
    black_wins = Column(Integer, default=0)
    draws = Column(Integer, default=0)

    # Most popular moves from this position in this elo bracket
    top_move_1_uci = Column(String(5))
    top_move_1_freq = Column(Float)  # percentage
    top_move_2_uci = Column(String(5))
    top_move_2_freq = Column(Float)
    top_move_3_uci = Column(String(5))
    top_move_3_freq = Column(Float)

    avg_eval_loss = Column(Float)  # average centipawn loss per move

    __table_args__ = (
        Index("idx_stats_hash_elo", "position_hash", "elo_bracket", unique=True),
    )


# ── Database Manager ──────────────────────────────────────────────

# Elo brackets for segmentation
ELO_BRACKETS = [
    (0, 800, "0-800"),
    (800, 1000, "800-1000"),
    (1000, 1200, "1000-1200"),
    (1200, 1400, "1200-1400"),
    (1400, 1600, "1400-1600"),
    (1600, 1800, "1600-1800"),
    (1800, 2000, "1800-2000"),
    (2000, 2200, "2000-2200"),
    (2200, 2500, "2200-2500"),
    (2500, 9999, "2500+"),
]


def elo_to_bracket(elo: int) -> str:
    """Map an elo rating to its bracket label."""
    for low, high, label in ELO_BRACKETS:
        if low <= elo < high:
            return label
    return "2500+"


class Database:
    """
    Database manager for Cassandra.

    Usage:
        db = Database("cassandra.db")
        db.store_parsed_game(parsed_game)

        # Query move frequencies for a position
        moves = db.get_move_frequencies("a1b2c3d4e5f6g7h8", elo_bracket="1200-1400")
    """

    def __init__(self, db_path: str = "cassandra.db"):
        self.engine = create_engine(f"sqlite:///{db_path}", echo=False)
        Base.metadata.create_all(self.engine)
        self.SessionFactory = sessionmaker(bind=self.engine)
        logger.info(f"Database initialized at {db_path}")

    def get_session(self) -> Session:
        return self.SessionFactory()

    # ── Write operations ──────────────────────────────────────────

    def store_parsed_game(self, parsed_game) -> Optional[int]:
        """
        Store a ParsedGame and all its positions in the database.

        Returns:
            The game ID, or None if the game already exists.
        """
        session = self.get_session()
        try:
            # Check for duplicate
            existing = session.query(Game).filter_by(url=parsed_game.game_url).first()
            if existing:
                logger.debug(f"Game already exists: {parsed_game.game_url}")
                return None

            game = Game(
                url=parsed_game.game_url,
                white_username=parsed_game.white_username,
                black_username=parsed_game.black_username,
                white_elo=parsed_game.white_elo,
                black_elo=parsed_game.black_elo,
                result=parsed_game.result,
                time_class=parsed_game.time_class,
                opening_eco=parsed_game.opening_eco,
                opening_name=parsed_game.opening_name,
                total_moves=parsed_game.total_moves,
            )
            session.add(game)
            session.flush()  # Get the game ID

            for pos in parsed_game.positions:
                position = Position(
                    game_id=game.id,
                    position_hash=pos.position_hash,
                    fen=pos.fen,
                    move_played_uci=pos.move_played_uci,
                    move_played_san=pos.move_played_san,
                    move_number=pos.move_number,
                    is_white_to_move=pos.is_white_to_move,
                    player_elo=pos.player_elo,
                    opponent_elo=pos.opponent_elo,
                    game_result=pos.game_result,
                )
                session.add(position)

            session.commit()
            return game.id

        except Exception as e:
            session.rollback()
            logger.error(f"Failed to store game: {e}")
            raise
        finally:
            session.close()

    def store_many(self, parsed_games: list) -> dict:
        """Store multiple parsed games. Returns counts."""
        stored = 0
        skipped = 0
        failed = 0

        for pg in parsed_games:
            try:
                game_id = self.store_parsed_game(pg)
                if game_id:
                    stored += 1
                else:
                    skipped += 1
            except Exception:
                failed += 1

        result = {"stored": stored, "skipped": skipped, "failed": failed}
        logger.info(f"Bulk store: {result}")
        return result

    # ── Read operations ───────────────────────────────────────────

    def get_move_frequencies(
        self,
        position_hash: str,
        elo_bracket: Optional[str] = None,
        min_elo: Optional[int] = None,
        max_elo: Optional[int] = None,
    ) -> list[dict]:
        """
        Get move frequency distribution for a position.

        Returns list of dicts sorted by frequency:
        [{"move_uci": "e2e4", "move_san": "e4", "count": 1234, "freq": 0.45,
          "win_rate": 0.52, "avg_elo": 1450}, ...]
        """
        session = self.get_session()
        try:
            query = session.query(
                Position.move_played_uci,
                Position.move_played_san,
                func.count().label("count"),
                func.avg(Position.player_elo).label("avg_elo"),
            ).filter(Position.position_hash == position_hash)

            if min_elo is not None:
                query = query.filter(Position.player_elo >= min_elo)
            if max_elo is not None:
                query = query.filter(Position.player_elo < max_elo)
            if elo_bracket:
                for low, high, label in ELO_BRACKETS:
                    if label == elo_bracket:
                        query = query.filter(
                            and_(Position.player_elo >= low, Position.player_elo < high)
                        )
                        break

            query = query.group_by(Position.move_played_uci)

            rows = query.all()
            total = sum(r.count for r in rows)

            results = []
            for row in rows:
                # Get win rate for this move
                win_count = session.query(func.count()).filter(
                    Position.position_hash == position_hash,
                    Position.move_played_uci == row.move_played_uci,
                    Position.game_result == "win",
                ).scalar()

                results.append({
                    "move_uci": row.move_played_uci,
                    "move_san": row.move_played_san,
                    "count": row.count,
                    "freq": row.count / total if total > 0 else 0,
                    "win_rate": win_count / row.count if row.count > 0 else 0,
                    "avg_elo": round(row.avg_elo) if row.avg_elo else 0,
                })

            results.sort(key=lambda x: x["count"], reverse=True)
            return results

        finally:
            session.close()

    def get_position_ancestors(self, position_hash: str, max_depth: int = 10) -> list[dict]:
        """
        Find positions that lead to the given position (retrograde analysis).
        Uses the game records to trace back move sequences.

        Returns list of ancestor positions with transition probabilities.
        """
        session = self.get_session()
        try:
            # Find all games that contain this position
            positions_at_target = session.query(Position).filter(
                Position.position_hash == position_hash
            ).all()

            # For each game, look at the position N moves before
            ancestors = {}
            for pos in positions_at_target:
                prev_positions = session.query(Position).filter(
                    Position.game_id == pos.game_id,
                    Position.move_number < pos.move_number,
                    Position.move_number >= max(1, pos.move_number - max_depth),
                ).order_by(Position.move_number.desc()).all()

                for prev in prev_positions:
                    depth = pos.move_number - prev.move_number
                    key = prev.position_hash
                    if key not in ancestors:
                        ancestors[key] = {
                            "position_hash": prev.position_hash,
                            "fen": prev.fen,
                            "count": 0,
                            "min_depth": depth,
                            "max_depth": depth,
                        }
                    ancestors[key]["count"] += 1
                    ancestors[key]["min_depth"] = min(ancestors[key]["min_depth"], depth)
                    ancestors[key]["max_depth"] = max(ancestors[key]["max_depth"], depth)

            result = sorted(ancestors.values(), key=lambda x: x["count"], reverse=True)
            return result

        finally:
            session.close()

    def get_stats(self) -> dict:
        """Get database statistics."""
        session = self.get_session()
        try:
            return {
                "total_games": session.query(func.count(Game.id)).scalar(),
                "total_positions": session.query(func.count(Position.id)).scalar(),
                "unique_positions": session.query(
                    func.count(func.distinct(Position.position_hash))
                ).scalar(),
                "evaluated_positions": session.query(func.count(Position.id)).filter(
                    Position.eval_before.isnot(None)
                ).scalar(),
            }
        finally:
            session.close()
