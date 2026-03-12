"""
Cassandra Chess Engine

A chess engine that exploits common human tendencies by modeling
how players actually behave, not how they should behave.

Modules:
    data     - Chess.com API client, PGN parsing, database layer
    engine   - Stockfish evaluation, Markov model, Cassandra move selector
    analysis - Transposition graph, opening analysis, tactical reachability, elo profiling
    api      - FastAPI endpoints for the visualization frontend
"""

__version__ = "0.1.0"
