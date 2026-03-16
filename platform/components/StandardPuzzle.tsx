"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "@/components/i18n/LocaleProvider";
import { Chess } from "chess.js";
import dynamic from "next/dynamic";
import { BoardSkeleton } from "./Skeleton";
import type { PieceDropHandlerArgs } from "./ChessBoardWrapper";
import { useTimer } from "@/hooks/useTimer";
import PuzzleTimer from "./PuzzleTimer";
import SolveResultCard from "./SolveResultCard";
import { getAnonId } from "@/lib/anonymous-id";
import type { AttemptResponse } from "@/app/api/puzzles/[id]/attempt/route";
import type { TimeControl } from "@/lib/benchmarks";

const ChessBoardWrapper = dynamic(() => import("./ChessBoardWrapper"), {
  ssr: false,
  loading: () => <BoardSkeleton />,
});

interface StandardPuzzleProps {
  puzzleId: string;
  solvingFen: string;
  /** Space-separated UCI moves that form the solution */
  solutionMoves: string;
  boardOrientation?: "white" | "black";
  timeControl?: TimeControl;
  /** Drill mode: countdown target in ms (0.75× global avg for this tactic) */
  drillTargetMs?: number | null;
}

type Phase = "playing" | "opponent" | "solved" | "wrong";

export default function StandardPuzzle({
  puzzleId,
  solvingFen,
  solutionMoves,
  boardOrientation = "white",
  timeControl,
  drillTargetMs,
}: StandardPuzzleProps) {
  const { t } = useTranslation();
  const solution = solutionMoves.trim().split(/\s+/);
  const [chess] = useState(() => new Chess(solvingFen));
  const [fen, setFen] = useState(solvingFen);
  const [moveIndex, setMoveIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [lastSquares, setLastSquares] = useState<Record<string, React.CSSProperties>>({});

  const { elapsedMs, isRunning, start, stop } = useTimer();
  const [attemptResult, setAttemptResult] = useState<AttemptResponse | null>(null);
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2>(0);
  const userId = useRef(getAnonId());
  const submitLock = useRef(false);
  const hadWrongMove = useRef(false);

  // Start timer when component mounts (board is ready)
  useEffect(() => {
    start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitAttempt(solveTimeMs: number, success: boolean) {
    if (submitLock.current) return;
    submitLock.current = true;
    try {
      const res = await fetch(`/api/puzzles/${puzzleId}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId.current,
          solveTimeMs,
          success,
        }),
      });
      const data: AttemptResponse = await res.json();
      setAttemptResult(data);
    } catch {
      // Silently ignore — don't break the solve experience
    }
  }

  const applyOpponentMove = useCallback(
    (nextIdx: number, currentChess: Chess) => {
      if (nextIdx >= solution.length) {
        // Puzzle complete — stop timer and record
        const finalMs = stop();
        setPhase("solved");
        submitAttempt(finalMs, !hadWrongMove.current);
        return;
      }
      setPhase("opponent");
      setTimeout(() => {
        const uci = solution[nextIdx];
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promotion = uci.length > 4 ? uci[4] : undefined;
        currentChess.move({ from, to, promotion });
        setFen(currentChess.fen());
        setLastSquares({
          [from]: { backgroundColor: "rgba(255,255,0,0.4)" },
          [to]: { backgroundColor: "rgba(255,255,0,0.4)" },
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

    const moveResult = chess.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });
    if (!moveResult) return false;

    const uci = `${sourceSquare}${targetSquare}${moveResult.promotion ?? ""}`;
    const expected = solution[moveIndex];

    if (uci !== expected) {
      // Wrong move — mark as incorrect, show briefly then revert
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

    // Correct player move — clear any hint
    setHintLevel(0);
    setFen(chess.fen());
    setLastSquares({
      [sourceSquare]: { backgroundColor: "rgba(0,200,0,0.35)" },
      [targetSquare]: { backgroundColor: "rgba(0,200,0,0.35)" },
    });

    const nextIdx = moveIndex + 1;
    setMoveIndex(nextIdx);
    applyOpponentMove(nextIdx, chess);
    return true;
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-[500px] mx-auto">
      {/* Timer */}
      <PuzzleTimer
        elapsedMs={elapsedMs}
        isRunning={isRunning}
        timeControl={timeControl}
        drillTargetMs={drillTargetMs}
      />

      {/* Board */}
      <div className="w-full aspect-square">
        <ChessBoardWrapper
          position={fen}
          interactive={phase === "playing"}
          onPieceDrop={handleDrop}
          boardOrientation={boardOrientation}
          squareStyles={{
            ...lastSquares,
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

      {/* Status messages */}
      {phase === "playing" && (
        <div className="flex items-center justify-between w-full">
          <p className="text-sm text-gray-600 font-medium">
            {t("puzzle.findBestMove", { color: boardOrientation })}
          </p>
          {hintLevel < 2 && (
            <button
              onClick={() => {
                setHintLevel((l) => (Math.min(l + 1, 2) as 0 | 1 | 2));
                hadWrongMove.current = true;
              }}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              {hintLevel === 0 ? t("puzzle.hint") : t("puzzle.showDestination")}
            </button>
          )}
        </div>
      )}
      {phase === "opponent" && (
        <p className="text-sm text-blue-600 font-medium animate-pulse">
          {t("puzzle.opponentResponding")}
        </p>
      )}
      {phase === "wrong" && (
        <p className="text-sm text-red-600 font-medium">
          {t("puzzle.wrongMove")}
        </p>
      )}

      {/* Post-solve result card */}
      {phase === "solved" && attemptResult && (
        <SolveResultCard
          puzzleId={puzzleId}
          solveTimeMs={attemptResult.solveTimeMs}
          percentile={attemptResult.percentile}
          bucket={attemptResult.bucket}
          avgSolveMs={attemptResult.avgSolveMs}
          top10PctMs={attemptResult.top10PctMs}
          totalAttempts={attemptResult.totalAttempts}
          timeControl={timeControl}
          userId={userId.current}
        />
      )}

      {/* Solved but waiting for API response */}
      {phase === "solved" && !attemptResult && (
        <div className="w-full rounded-xl border border-green-200 bg-green-50 p-4 text-center">
          <p className="text-green-800 font-bold">{t("puzzle.solved")}</p>
          <div className="mt-2 h-4 w-32 mx-auto bg-green-200 animate-pulse rounded" />
        </div>
      )}
    </div>
  );
}
