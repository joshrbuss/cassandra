#!/usr/bin/env python3
"""
Quick verification that the eval perspective bug is fixed.

Tests puzzle #8's position: white has ONE bishop on d5, plays Bxb7.
If Stockfish also says Bxb7 is best, eval_loss should be ~0, not 461cp.

Usage:
    python3 scripts/verify_eval_fix.py --stockfish /opt/homebrew/bin/stockfish
"""

import sys
import os
import argparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cassandra.engine.stockfish_eval import StockfishEvaluator

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--stockfish", default="/opt/homebrew/bin/stockfish")
    p.add_argument("--depth", type=int, default=18)
    args = p.parse_args()

    evaluator = StockfishEvaluator(
        stockfish_path=args.stockfish,
        depth=args.depth,
    )

    # Puzzle #8: FEN where you played Bxb7 and it said Bxb7 was better (461cp loss)
    fen = "r3k2r/pbqp1ppp/1p3b2/3Bp3/1nNpP3/5N2/PPP2PPP/R2QR1K1 w kq - 4 12"
    played_move = "d5b7"  # Bxb7 (bishop on d5 captures b7)

    print(f"Position: {fen}")
    print(f"Played move: {played_move} (Bxb7)")
    print()

    ev = evaluator.evaluate_position(fen, played_move)
    if ev:
        print(f"Stockfish best move: {ev.best_move_uci} ({ev.best_move_san})")
        print(f"Eval before:  {ev.eval_before:.0f}cp")
        print(f"Eval after:   {ev.eval_after:.0f}cp")
        print(f"Eval loss:    {ev.eval_loss:.0f}cp")
        print(f"Is best move: {ev.is_best_move}")
        print(f"Classification: {ev.classification}")
        print()

        if ev.is_best_move and abs(ev.eval_loss) < 10:
            print("FIX VERIFIED: Bxb7 is the best move with ~0cp loss")
        elif ev.is_best_move and ev.eval_loss > 100:
            print("BUG STILL PRESENT: Same move flagged as big loss!")
        elif not ev.is_best_move:
            print(f"Stockfish prefers {ev.best_move_san} — Bxb7 is genuinely not the best here.")
            print(f"In that case the original puzzle was correct (different moves), "
                  f"but check if the eval_loss magnitude is reasonable.")
    else:
        print("Evaluation failed!")

    # Also test puzzle #9
    print("\n" + "="*60)
    fen2 = "2kr1b1r/ppp2ppp/2n1p3/5bN1/2B5/1P6/PBQP1PPP/R4K1R b - - 0 11"
    played2 = "f5c2"  # Bxc2 (bishop on f5 captures c2)

    print(f"Puzzle #9 Position: {fen2}")
    print(f"Played move: {played2} (Bxc2)")
    print()

    ev2 = evaluator.evaluate_position(fen2, played2)
    if ev2:
        print(f"Stockfish best move: {ev2.best_move_uci} ({ev2.best_move_san})")
        print(f"Eval before:  {ev2.eval_before:.0f}cp")
        print(f"Eval after:   {ev2.eval_after:.0f}cp")
        print(f"Eval loss:    {ev2.eval_loss:.0f}cp")
        print(f"Is best move: {ev2.is_best_move}")
        print(f"Classification: {ev2.classification}")


if __name__ == "__main__":
    main()
