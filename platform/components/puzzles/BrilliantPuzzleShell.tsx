"use client";

import { useState } from "react";
import { Chess } from "chess.js";
import { type Puzzle } from "@prisma/client";
import PuzzleShell from "@/app/puzzles/[id]/PuzzleShell";

interface BrilliantPuzzleShellProps {
  puzzle: Puzzle;
}

/** Convert space-separated UCI moves to SAN notation starting from a given FEN. */
function uciMovesToSan(startFen: string, uciMovesStr: string): string[] {
  const uciMoves = uciMovesStr.trim().split(/\s+/).filter(Boolean);
  const chess = new Chess(startFen);
  const sans: string[] = [];
  for (const uci of uciMoves) {
    try {
      const move = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4] || undefined,
      });
      if (!move) break;
      sans.push(move.san);
    } catch {
      break;
    }
  }
  return sans;
}

export default function BrilliantPuzzleShell({ puzzle }: BrilliantPuzzleShellProps) {
  const [showLine, setShowLine] = useState(false);

  // Compute SAN continuation from the solving position
  const solutionSan = uciMovesToSan(puzzle.solvingFen, puzzle.solutionMoves);

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-3xl" role="img" aria-label="diamond">💎</span>
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
              Brilliant Move
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            Find the Brilliant Move
          </h1>
          <p className="text-zinc-400 text-sm mt-2">
            A computer-class sacrifice or sacrifice sequence. Only the sharpest find it.
          </p>
        </div>

        {/* Rating badge */}
        <div className="flex justify-end mb-3">
          <span className="text-xs text-zinc-500 font-mono">
            ★ {puzzle.rating}
          </span>
        </div>

        {/* Puzzle player — reuse existing shell */}
        <div className="rounded-2xl overflow-hidden ring-1 ring-zinc-700">
          <PuzzleShell puzzle={puzzle} />
        </div>

        {/* Engine continuation reveal */}
        {solutionSan.length > 0 && (
          <div className="mt-6">
            {showLine ? (
              <div className="bg-zinc-800 rounded-xl p-4 ring-1 ring-zinc-700">
                <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wide mb-2">
                  💎 Engine continuation
                </p>
                <div className="flex flex-wrap gap-2">
                  {solutionSan.map((san, i) => (
                    <span
                      key={i}
                      className={`text-sm font-mono px-2 py-0.5 rounded ${
                        i === 0
                          ? "bg-cyan-500 text-zinc-900 font-bold"
                          : "bg-zinc-700 text-zinc-300"
                      }`}
                    >
                      {i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : ""}{san}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => setShowLine(false)}
                  className="mt-3 text-xs text-zinc-500 hover:text-zinc-400 underline"
                >
                  Hide
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLine(true)}
                className="w-full py-3 rounded-xl border border-zinc-700 text-zinc-400 text-sm hover:border-cyan-500 hover:text-cyan-400 transition-colors"
              >
                Show engine continuation →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
