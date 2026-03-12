"""
Cassandra API — FastAPI endpoints for the visualization frontend.

Provides REST endpoints for:
- Fetching/ingesting games
- Querying position data and move distributions
- Running analysis (transpositions, elo profiles, tactics)
- Getting Cassandra's move recommendation
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

app = FastAPI(
    title="Cassandra Chess Engine",
    description="Chess engine that exploits human tendencies",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Will lock down for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# These get initialized on startup
db = None
evaluator = None
human_model = None
graph = None


@app.get("/")
def root():
    return {"engine": "Cassandra", "version": "0.1.0", "status": "operational"}


@app.get("/stats")
def get_stats():
    """Get database statistics."""
    if db is None:
        raise HTTPException(503, "Database not initialized")
    return db.get_stats()


# ── Data ingestion ────────────────────────────────────────────────

@app.post("/ingest/player/{username}")
def ingest_player_games(
    username: str,
    time_class: Optional[str] = Query(None),
    max_games: int = Query(100, le=10000),
):
    """Fetch and store games for a Chess.com player."""
    from ..data import ChessComClient, GameParser

    client = ChessComClient()
    parser = GameParser()

    result = client.fetch_player_games(
        username=username,
        time_class=time_class,
        max_games=max_games,
    )

    parsed = parser.parse_many(result.games)
    store_result = db.store_many(parsed)

    return {
        "player": username,
        "fetched": result.total_fetched,
        "parsed": len(parsed),
        **store_result,
    }


# ── Position queries ──────────────────────────────────────────────

@app.get("/position/{position_hash}/moves")
def get_position_moves(
    position_hash: str,
    elo_bracket: Optional[str] = Query(None),
):
    """Get move frequency distribution for a position."""
    moves = db.get_move_frequencies(position_hash, elo_bracket=elo_bracket)
    return {"position_hash": position_hash, "moves": moves}


@app.get("/position/{position_hash}/ancestors")
def get_position_ancestors(
    position_hash: str,
    max_depth: int = Query(10, le=30),
):
    """Retrograde analysis: how is this position reached?"""
    ancestors = db.get_position_ancestors(position_hash, max_depth=max_depth)
    return {"position_hash": position_hash, "ancestors": ancestors}


# ── Analysis endpoints ────────────────────────────────────────────

@app.get("/analysis/opening/{eco}")
def analyze_opening(eco: str):
    """Transposition-aware opening analysis."""
    from ..analysis import OpeningAnalyzer

    analyzer = OpeningAnalyzer(db, graph)
    stats = analyzer.analyze_opening(eco)
    return {
        "eco": stats.eco,
        "name": stats.name,
        "total_games": stats.total_games,
        "naive_win_rate": stats.naive_win_rate,
        "adjusted_win_rate": stats.adjusted_win_rate,
        "transposition_rate": stats.transposition_rate,
        "transposes_to": stats.transposes_to,
    }


@app.get("/analysis/elo/{elo_bracket}")
def analyze_elo_bracket(elo_bracket: str):
    """Error profile for an elo bracket."""
    from ..analysis import EloProfiler

    profiler = EloProfiler(db, human_model)
    profile = profiler.profile_bracket(elo_bracket)
    return {
        "elo_bracket": profile.elo_bracket,
        "total_positions": profile.total_positions_analyzed,
        "avg_centipawn_loss": round(profile.avg_centipawn_loss, 1),
        "blunder_rate": round(profile.blunder_rate, 4),
        "mistake_rate": round(profile.mistake_rate, 4),
        "opening_avg_loss": round(profile.opening_avg_loss, 1),
        "middlegame_avg_loss": round(profile.middlegame_avg_loss, 1),
        "endgame_avg_loss": round(profile.endgame_avg_loss, 1),
    }


# ── Cassandra engine endpoint ────────────────────────────────────

@app.get("/engine/suggest")
def suggest_move(
    fen: str = Query(..., description="Position FEN"),
    target_elo: str = Query("1200-1400", description="Target elo bracket"),
):
    """Get Cassandra's move recommendation for exploiting a human opponent."""
    import chess
    from ..engine import CassandraEngine

    try:
        board = chess.Board(fen)
    except ValueError:
        raise HTTPException(400, "Invalid FEN")

    if evaluator is None:
        raise HTTPException(503, "Stockfish not initialized")

    engine = CassandraEngine(
        evaluator=evaluator,
        human_model=human_model,
        target_elo_bracket=target_elo,
    )

    move = engine.select_move(board)
    if move is None:
        raise HTTPException(404, "No move found")

    return {
        "move_uci": move.move_uci,
        "move_san": move.move_san,
        "exploit_score": round(move.exploit_score, 1),
        "expected_human_response": move.expected_human_response,
        "human_response_probability": round(move.human_response_probability, 3),
        "human_expected_eval_loss": round(move.human_expected_eval_loss, 1),
        "reasoning": move.reasoning,
        "stockfish_best_move": move.stockfish_best_move,
    }
