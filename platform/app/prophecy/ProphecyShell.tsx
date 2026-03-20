"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import dynamic from "next/dynamic";
import { BoardSkeleton } from "@/components/Skeleton";
import type { PieceDropHandlerArgs } from "@/components/ChessBoardWrapper";
import { useTimer } from "@/hooks/useTimer";
import { formatTime } from "@/lib/benchmarks";
import Link from "next/link";
import { gtagEvent } from "@/lib/gtag";

const ChessBoardWrapper = dynamic(() => import("@/components/ChessBoardWrapper"), {
  ssr: false,
  loading: () => <BoardSkeleton />,
});

interface ProphecyShellProps {
  puzzleId: string;
  solvingFen: string;
  solutionMoves: string;
  themes: string;
  rating: number;
  alreadySolved: boolean;
  alreadySolvedSuccess: boolean;
}

/** Map Lichess theme tags to human-readable labels */
const THEME_LABELS: Record<string, string> = {
  fork: "A devastating fork",
  pin: "A crushing pin",
  skewer: "A deadly skewer",
  discoveredAttack: "A discovered attack",
  sacrifice: "A brilliant sacrifice",
  deflection: "A deflection tactic",
  decoy: "A decoy sacrifice",
  attraction: "An attraction sacrifice",
  clearance: "A clearance sacrifice",
  interference: "An interference move",
  xRayAttack: "An X-ray attack",
  zugzwang: "Zugzwang!",
  quietMove: "A quiet but lethal move",
  mateIn1: "Checkmate in one",
  mateIn2: "Checkmate in two",
  mateIn3: "Checkmate in three",
  backRankMate: "A back rank mate",
  hookMate: "A hook mate",
  smotheredMate: "A smothered mate",
  hangingPiece: "Winning a hanging piece",
  trappedPiece: "Trapping a piece",
  advancedPawn: "A powerful pawn advance",
  endgame: "An endgame finesse",
  promotion: "A pawn promotion tactic",
  doubleCheck: "A double check",
  brilliantMove: "A brilliant move",
};

function getThemeExplanation(themes: string): string {
  const tags = themes.split(/\s+/);
  // Skip generic/length tags, find the most interesting tactic
  const skipTags = new Set(["short", "long", "oneMove", "veryLong", "middlegame", "endgame", "opening", "crushing", "advantage", "mate"]);
  for (const tag of tags) {
    if (skipTags.has(tag)) continue;
    if (THEME_LABELS[tag]) return THEME_LABELS[tag];
  }
  return "A brilliant tactical idea";
}

/**
 * Find which player move in the solution sequence is the "brilliant" one.
 * Player moves are at even indices (0, 2, 4...). We pick the last player move
 * as the brilliant climax, but if there's only one player move, that's it.
 */
function getBrilliantMoveIndex(solutionLength: number): number {
  // Player moves are at indices 0, 2, 4...
  // The brilliant move is typically the key tactical blow
  // Pick the first player move (index 0) as the brilliant one
  // since it's the "find" moment
  return 0;
}

type Phase = "playing" | "opponent" | "solved" | "wrong" | "already_solved";

export default function ProphecyShell({
  puzzleId,
  solvingFen,
  solutionMoves,
  themes,
  rating,
  alreadySolved,
  alreadySolvedSuccess,
}: ProphecyShellProps) {
  const solution = solutionMoves.trim().split(/\s+/);
  const boardOrientation: "white" | "black" =
    solvingFen.split(" ")[1] === "b" ? "black" : "white";

  const brilliantIdx = getBrilliantMoveIndex(solution.length);
  const brilliantUci = solution[brilliantIdx];
  const themeExplanation = getThemeExplanation(themes);

  const [chess] = useState(() => new Chess(solvingFen));
  const [fen, setFen] = useState(solvingFen);
  const [moveIndex, setMoveIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(alreadySolved ? "already_solved" : "playing");
  const [lastSquares, setLastSquares] = useState<Record<string, React.CSSProperties>>({});
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2>(0);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  const { elapsedMs, start, stop } = useTimer();
  const [solveTimeMs, setSolveTimeMs] = useState<number | null>(null);
  const submitLock = useRef(false);
  const hadWrongMove = useRef(false);

  // For already-solved state: show the brilliant move highlighted on the board
  useEffect(() => {
    if (alreadySolved && brilliantUci) {
      // Replay moves up to the brilliant move to show correct position
      const replay = new Chess(solvingFen);
      for (let i = 0; i <= brilliantIdx; i++) {
        const uci = solution[i];
        replay.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci.length > 4 ? uci[4] : undefined,
        });
      }
      setFen(replay.fen());
      setLastSquares({
        [brilliantUci.slice(0, 2)]: { backgroundColor: "rgba(200, 148, 42, 0.6)" },
        [brilliantUci.slice(2, 4)]: { backgroundColor: "rgba(200, 148, 42, 0.6)" },
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadySolved]);

  useEffect(() => {
    if (!alreadySolved) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitAttempt(ms: number, success: boolean) {
    if (submitLock.current) return;
    submitLock.current = true;
    setSolveTimeMs(ms);
    if (success) {
      gtagEvent("puzzle_solved", { mode: "prophecy", puzzle_id: puzzleId });
      gtagEvent("prophecy_completed");
    }
    try {
      await fetch(`/api/puzzles/${puzzleId}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solveTimeMs: ms, success }),
      });
    } catch {
      // Silently ignore
    }
  }

  const applyOpponentMove = useCallback(
    (nextIdx: number, currentChess: Chess) => {
      if (nextIdx >= solution.length) {
        const finalMs = stop();
        setPhase("solved");
        submitAttempt(finalMs, !hadWrongMove.current);
        return;
      }
      setPhase("opponent");
      setTimeout(() => {
        const uci = solution[nextIdx];
        currentChess.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci.length > 4 ? uci[4] : undefined,
        });
        setFen(currentChess.fen());
        setLastSquares({
          [uci.slice(0, 2)]: { backgroundColor: "rgba(255,255,0,0.4)" },
          [uci.slice(2, 4)]: { backgroundColor: "rgba(255,255,0,0.4)" },
        });
        setMoveIndex(nextIdx + 1);
        if (nextIdx + 1 >= solution.length) {
          const finalMs = stop();
          setPhase("solved");
          submitAttempt(finalMs, !hadWrongMove.current);
        } else {
          setPhase("playing");
        }
      }, 500);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [solution, stop]
  );

  function handleDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (phase !== "playing" || !targetSquare) return false;
    const moveResult = chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
    if (!moveResult) return false;

    const uci = `${sourceSquare}${targetSquare}${moveResult.promotion ?? ""}`;
    const expected = solution[moveIndex];

    if (uci !== expected) {
      hadWrongMove.current = true;
      setFen(chess.fen());
      setPhase("wrong");
      setTimeout(() => {
        chess.undo();
        setFen(chess.fen());
        setPhase("playing");
      }, 800);
      return true;
    }

    setHintLevel(0);
    setFen(chess.fen());

    // Highlight brilliant move in gold, others in green
    const isBrilliant = moveIndex === brilliantIdx;
    const color = isBrilliant ? "rgba(200, 148, 42, 0.6)" : "rgba(0,200,0,0.35)";
    setLastSquares({
      [sourceSquare]: { backgroundColor: color },
      [targetSquare]: { backgroundColor: color },
    });

    const nextIdx = moveIndex + 1;
    setMoveIndex(nextIdx);
    applyOpponentMove(nextIdx, chess);
    return true;
  }

  /** Click-to-move: first click selects piece, second click moves */
  function handleSquareClick({ square }: { piece: unknown; square: string }) {
    if (phase !== "playing") return;

    if (selectedSquare) {
      const moveResult = chess.move({ from: selectedSquare, to: square, promotion: "q" });
      setSelectedSquare(null);

      if (!moveResult) {
        const moves = chess.moves({ square: square as never, verbose: true });
        if (moves.length > 0) setSelectedSquare(square);
        return;
      }

      const uci = `${selectedSquare}${square}${moveResult.promotion ?? ""}`;
      const expected = solution[moveIndex];

      if (uci !== expected) {
        hadWrongMove.current = true;
        setFen(chess.fen());
        setPhase("wrong");
        setTimeout(() => {
          chess.undo();
          setFen(chess.fen());
          setPhase("playing");
        }, 800);
        return;
      }

      setHintLevel(0);
      setFen(chess.fen());

      const isBrilliant = moveIndex === brilliantIdx;
      const color = isBrilliant ? "rgba(200, 148, 42, 0.6)" : "rgba(0,200,0,0.35)";
      setLastSquares({
        [selectedSquare]: { backgroundColor: color },
        [square]: { backgroundColor: color },
      });
      const nextIdx = moveIndex + 1;
      setMoveIndex(nextIdx);
      applyOpponentMove(nextIdx, chess);
    } else {
      const moves = chess.moves({ square: square as never, verbose: true });
      if (moves.length > 0) setSelectedSquare(square);
    }
  }

  /** Build square styles for selected piece + legal move dots */
  function getClickStyles(): Record<string, React.CSSProperties> {
    if (!selectedSquare || phase !== "playing") return {};
    const styles: Record<string, React.CSSProperties> = {
      [selectedSquare]: { backgroundColor: "rgba(255, 200, 0, 0.5)" },
    };
    const moves = chess.moves({ square: selectedSquare as never, verbose: true });
    for (const m of moves) {
      styles[m.to] = {
        background: "radial-gradient(circle, rgba(0,0,0,0.2) 25%, transparent 25%)",
        borderRadius: "50%",
      };
    }
    return styles;
  }

  const isSolved = phase === "solved";
  const isAlreadySolved = phase === "already_solved";
  const isRevealed = isSolved || isAlreadySolved;

  return (
    <div className="w-full min-h-screen bg-[#0e0e0e]">
      {/* ━━ Nav bar ━━ */}
      <nav className="bg-[#0e0e0e] border-b border-[#1a1a1a] px-4 py-3 flex items-center justify-between">
        <Link href="/home" className="text-sm font-medium text-[#c8942a] hover:text-[#e0ad3a] transition-colors">
          &larr; Home
        </Link>
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-600">
          {isRevealed ? "Cassandra's Prophecy" : "Daily Puzzle"}
        </span>
        <span className="w-16" />
      </nav>

      <div className="max-w-lg mx-auto px-4 pt-4 pb-6">
        {/* ━━ Top panel ━━ */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-5 py-4 mb-4">
          {isAlreadySolved ? (
            <>
              <p className="text-[#c8942a] font-bold text-lg">
                You saw what Cassandra saw.
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Come back tomorrow for a new prophecy.
              </p>
              <div className="mt-3 bg-[#c8942a]/10 border border-[#c8942a]/30 rounded-lg px-4 py-3">
                <p className="text-[#c8942a] text-xs font-semibold uppercase tracking-wide mb-1">
                  The brilliant move
                </p>
                <p className="text-white text-sm">
                  {brilliantUci.slice(0, 2)} &rarr; {brilliantUci.slice(2, 4)}
                  {" — "}{themeExplanation}
                </p>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    // Reset state for replay
                    chess.load(solvingFen);
                    setFen(solvingFen);
                    setMoveIndex(0);
                    setLastSquares({});
                    setHintLevel(0);
                    setSelectedSquare(null);
                    hadWrongMove.current = true; // replays don't count as clean
                    submitLock.current = false;
                    setPhase("playing");
                    start();
                  }}
                  className="flex-1 text-center bg-[#c8942a] text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#b5852a] transition-colors"
                >
                  Replay puzzle
                </button>
                <Link
                  href="/home"
                  className="flex-1 text-center bg-[#2a2a2a] text-gray-400 px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#333] hover:text-gray-300 transition-colors"
                >
                  Home
                </Link>
              </div>
            </>
          ) : isSolved ? (
            <>
              <p className="text-[#c8942a] font-bold text-lg">
                Cassandra&apos;s Prophecy
              </p>
              <p className="text-white text-sm mt-1">
                You found the brilliant move!
              </p>

              {/* Reveal the brilliant move */}
              <div className="mt-3 bg-[#c8942a]/10 border border-[#c8942a]/30 rounded-lg px-4 py-3">
                <p className="text-[#c8942a] text-xs font-semibold uppercase tracking-wide mb-1">
                  The brilliant move
                </p>
                <p className="text-white text-sm">
                  {brilliantUci.slice(0, 2)} &rarr; {brilliantUci.slice(2, 4)}
                  {" — "}{themeExplanation}
                </p>
              </div>

              {/* Solve time */}
              <div className="mt-3 flex items-center gap-4">
                <div>
                  <p className="text-[#c8942a] font-mono font-bold text-lg">
                    {solveTimeMs ? formatTime(solveTimeMs) : `${Math.floor(elapsedMs / 1000)}s`}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Your time</p>
                </div>
                <div>
                  <p className="text-gray-400 font-mono text-lg">{rating}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Difficulty</p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-4">
                <Link
                  href="/unlearned"
                  className="flex-1 text-center bg-[#c8942a] text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#b5852a] transition-colors"
                >
                  Keep training
                </Link>
                <Link
                  href="/home"
                  className="flex-1 text-center bg-[#2a2a2a] text-gray-400 px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#333] hover:text-gray-300 transition-colors"
                >
                  Done for now
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* Solving — no special badge, just a normal puzzle */}
              <p className="text-white font-bold text-lg">
                Find the best move
              </p>
              <p className="text-gray-500 text-sm mt-0.5">
                Playing as {boardOrientation}
              </p>

              {/* Timer + rating */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-[#0e0e0e] rounded-lg p-3 text-center">
                  <p className="text-[#c8942a] font-mono font-bold text-lg">
                    {Math.floor(elapsedMs / 1000)}s
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Elapsed</p>
                </div>
                <div className="bg-[#0e0e0e] rounded-lg p-3 text-center">
                  <p className="text-gray-400 font-mono font-bold text-lg">{rating}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Difficulty</p>
                </div>
              </div>

              {/* Hint buttons */}
              <div className="flex gap-3 mt-4">
                {hintLevel < 2 ? (
                  <button
                    onClick={() => {
                      setHintLevel((l) => (Math.min(l + 1, 2) as 0 | 1 | 2));
                      hadWrongMove.current = true;
                    }}
                    className="flex-1 text-center bg-[#c8942a] text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#b5852a] transition-colors"
                  >
                    {hintLevel === 0 ? "Hint" : "Show destination"}
                  </button>
                ) : (
                  <span className="flex-1" />
                )}
                <Link
                  href="/home"
                  className="flex-1 text-center bg-[#2a2a2a] text-gray-400 px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#333] hover:text-gray-300 transition-colors"
                >
                  Skip
                </Link>
              </div>
            </>
          )}
        </div>

        {/* ━━ Board label ━━ */}
        <div className="mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">
            {isRevealed ? "The brilliant move is highlighted" : "Drag or click to make your move"}
          </p>
        </div>

        {/* ━━ Board ━━ */}
        <div className="w-full aspect-square">
          <ChessBoardWrapper
            position={fen}
            interactive={phase === "playing"}
            onPieceDrop={handleDrop}
            onSquareClick={handleSquareClick}
            boardOrientation={boardOrientation}
            squareStyles={{
              ...lastSquares,
              ...getClickStyles(),
              ...(hintLevel >= 1 && phase === "playing" && solution[moveIndex]
                ? {
                    [solution[moveIndex].slice(0, 2)]: {
                      backgroundColor: "rgba(255, 200, 0, 0.7)",
                      borderRadius: "50%",
                    },
                  }
                : {}),
              ...(hintLevel >= 2 && phase === "playing" && solution[moveIndex]
                ? {
                    [solution[moveIndex].slice(2, 4)]: {
                      backgroundColor: "rgba(255, 140, 0, 0.65)",
                      borderRadius: "50%",
                    },
                  }
                : {}),
            }}
          />
        </div>

        {/* ━━ Status bar (playing only) ━━ */}
        {!isRevealed && (
          <div className="mt-3 min-h-[24px]">
            {phase === "opponent" && (
              <p className="text-sm text-[#c8942a] font-medium animate-pulse">
                Opponent responding...
              </p>
            )}
            {phase === "wrong" && (
              <p className="text-sm text-red-500 font-medium">
                Not quite — try again
              </p>
            )}
          </div>
        )}

        {/* ━━ Footer ━━ */}
        <footer className="mt-10 pt-6 border-t border-[#1a1a1a] text-center">
          <p className="text-xs text-gray-600">
            Cassandra &middot; Puzzles from the Lichess open database (CC0)
          </p>
        </footer>
      </div>
    </div>
  );
}
