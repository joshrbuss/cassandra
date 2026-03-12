#!/usr/bin/env python3
"""
Generate personalized puzzles from your Chess.com games.

Usage:
    # Basic (no Stockfish — just fetches and stores your games)
    python3 scripts/my_puzzles.py J_R_B_01

    # With Stockfish evaluation (generates actual puzzles)
    python3 scripts/my_puzzles.py J_R_B_01 --stockfish /opt/homebrew/bin/stockfish

    # Filter to blitz only, analyze last 50 games
    python3 scripts/my_puzzles.py J_R_B_01 --time-class blitz --max-games 50 --stockfish /opt/homebrew/bin/stockfish

    # Find your Stockfish path:
    #   which stockfish
    #   OR: brew install stockfish
"""

import sys
import os
import argparse
import logging
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cassandra.data import ChessComClient, GameParser, Database
from cassandra.analysis.personal_puzzles import PersonalPuzzleGenerator

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("my_puzzles")

DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "cassandra.db",
)


def main():
    p = argparse.ArgumentParser(description="Generate personalized chess puzzles")
    p.add_argument("username", help="Your Chess.com username")
    p.add_argument("--time-class", type=str, default=None, help="blitz, rapid, bullet")
    p.add_argument("--max-games", type=int, default=None, help="Max games to analyze")
    p.add_argument("--stockfish", type=str, default=None,
                    help="Path to Stockfish binary (e.g., /opt/homebrew/bin/stockfish)")
    p.add_argument("--depth", type=int, default=18,
                    help="Stockfish search depth (default: 18)")
    p.add_argument("--min-loss", type=float, default=80.0,
                    help="Min centipawn loss to create a puzzle (default: 80)")
    args = p.parse_args()

    client = ChessComClient()
    parser = GameParser()
    db = Database(DB_PATH)

    # Set up Stockfish if available
    evaluator = None
    if args.stockfish:
        try:
            from cassandra.engine.stockfish_eval import StockfishEvaluator
            evaluator = StockfishEvaluator(
                stockfish_path=args.stockfish,
                depth=args.depth,
            )
            logger.info(f"Stockfish loaded (depth={args.depth})")
        except Exception as e:
            logger.error(f"Failed to load Stockfish: {e}")
            logger.info("Continuing without evaluation — will fetch and store games only")

    if not evaluator:
        logger.info(
            "No Stockfish — will fetch and store your games.\n"
            "To generate puzzles, install Stockfish:\n"
            "  brew install stockfish\n"
            "Then re-run with: --stockfish $(which stockfish)"
        )

    # Generate puzzles
    gen = PersonalPuzzleGenerator(
        client=client,
        parser=parser,
        database=db,
        evaluator=evaluator,
        min_eval_loss=args.min_loss,
    )

    puzzle_set = gen.generate(
        username=args.username,
        time_class=args.time_class,
        max_games=args.max_games,
    )

    # Print results
    print(f"\n{'='*60}")
    print(f"PERSONAL PUZZLE REPORT FOR {args.username.upper()}")
    print(f"{'='*60}")
    print(f"Games analyzed:    {puzzle_set.total_games_analyzed}")
    print(f"Puzzles generated: {puzzle_set.total_puzzles_found}")

    if puzzle_set.puzzles:
        print(f"Average eval loss: {puzzle_set.avg_eval_loss:.0f} centipawns")
        print(f"Weakest phase:     {puzzle_set.weakest_phase}")

        if puzzle_set.patterns_summary:
            print(f"\nMistake patterns:")
            for pattern, count in sorted(
                puzzle_set.patterns_summary.items(),
                key=lambda x: x[1], reverse=True,
            ):
                print(f"  {pattern}: {count}")

        print(f"\n{'─'*60}")
        print(f"TOP 10 PUZZLES (by impact score)")
        print(f"{'─'*60}")

        for i, puzzle in enumerate(puzzle_set.top_puzzles(10), 1):
            print(f"\n  Puzzle #{i} — Impact: {puzzle.impact_score:.0f} [{puzzle.difficulty}]")
            print(f"  {puzzle.description}")
            print(f"  FEN: {puzzle.fen}")
            print(f"  You played: {puzzle.your_move_san} → Best: {puzzle.correct_move_san}")
            if puzzle.tactical_motif:
                print(f"  Motif: {puzzle.tactical_motif}")
            if puzzle.preceding_moves:
                context = " ".join(
                    f"{'>' if m['is_yours'] else ' '}{m['move_san']}"
                    for m in puzzle.preceding_moves[-4:]
                )
                print(f"  Context: ...{context} → [YOUR MOVE]")
            print(f"  Game: {puzzle.game_url}")

        # Save puzzles to JSON for the frontend
        output_path = os.path.join(
            os.path.dirname(DB_PATH),
            f"puzzles_{args.username}.json",
        )
        puzzles_json = []
        for puzzle in puzzle_set.puzzles:
            puzzles_json.append({
                "fen": puzzle.fen,
                "correct_move": puzzle.correct_move_san,
                "correct_move_uci": puzzle.correct_move_uci,
                "your_move": puzzle.your_move_san,
                "your_move_uci": puzzle.your_move_uci,
                "correct_eval": puzzle.correct_eval,
                "your_eval": puzzle.your_eval,
                "eval_loss": puzzle.eval_loss,
                "mistake_type": puzzle.mistake_type,
                "tactical_motif": puzzle.tactical_motif,
                "move_number": puzzle.move_number,
                "opening": puzzle.opening_name,
                "opponent": puzzle.opponent_username,
                "opponent_elo": puzzle.opponent_elo,
                "your_elo": puzzle.your_elo,
                "your_color": puzzle.your_color,
                "time_class": puzzle.time_class,
                "game_url": puzzle.game_url,
                "game_result": puzzle.game_result,
                "impact_score": puzzle.impact_score,
                "frequency": puzzle.frequency,
                "difficulty": puzzle.difficulty,
                "description": puzzle.description,
                "preceding_moves": puzzle.preceding_moves,
            })

        with open(output_path, "w") as f:
            json.dump(puzzles_json, f, indent=2)
        print(f"\nPuzzles saved to: {output_path}")

    else:
        print("\nNo puzzles generated (Stockfish required for evaluation).")
        stats = db.get_stats()
        print(f"Games stored in database: {stats['total_games']}")
        print(f"Positions indexed: {stats['total_positions']}")
        print(f"\nTo generate puzzles, install Stockfish and re-run:")
        print(f"  brew install stockfish")
        print(f"  python3 scripts/my_puzzles.py {args.username} --stockfish $(which stockfish)")

    print(f"\n{'='*60}")


if __name__ == "__main__":
    main()
