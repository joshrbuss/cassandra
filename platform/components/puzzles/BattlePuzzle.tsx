"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import dynamic from "next/dynamic";
import { BoardSkeleton } from "@/components/Skeleton";
import type { PieceDropHandlerArgs } from "@/components/ChessBoardWrapper";

const ChessBoardWrapper = dynamic(() => import("@/components/ChessBoardWrapper"), {
  ssr: false,
  loading: () => <BoardSkeleton />,
});

interface BattlePuzzleProps {
  puzzleId: string;
  solvingFen: string;
  solutionMoves: string;
  boardOrientation?: "white" | "black";
  /** Called when the player finishes (solved or timeout) */
  onComplete: (success: boolean, solveTimeMs: number) => void;
  /** Auto-submit after this many ms (default 120_000) */
  timeoutMs?: number;
}

type Phase = "playing" | "opponent" | "solved" | "wrong";

export default function BattlePuzzle({
  solvingFen,
  solutionMoves,
  boardOrientation = "white",
  onComplete,
  timeoutMs = 120_000,
}: BattlePuzzleProps) {
  const solution = solutionMoves.trim().split(/\s+/);
  const [chess] = useState(() => new Chess(solvingFen));
  const [fen, setFen] = useState(solvingFen);
  const [moveIndex, setMoveIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [lastSquares, setLastSquares] = useState<Record<string, React.CSSProperties>>({});
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const startRef = useRef(Date.now());
  const completedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startRef.current);
    }, 200);

    const autoTimeout = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        clearInterval(intervalRef.current!);
        onComplete(false, timeoutMs);
      }
    }, timeoutMs);

    return () => {
      clearInterval(intervalRef.current!);
      clearTimeout(autoTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish(success: boolean) {
    if (completedRef.current) return;
    completedRef.current = true;
    clearInterval(intervalRef.current!);
    const ms = Date.now() - startRef.current;
    onComplete(success, ms);
  }

  const applyOpponentMove = useCallback(
    (nextIdx: number, currentChess: Chess) => {
      if (nextIdx >= solution.length) {
        setPhase("solved");
        finish(true);
        return;
      }
      setPhase("opponent");
      setTimeout(() => {
        const uci = solution[nextIdx];
        currentChess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
        setFen(currentChess.fen());
        setLastSquares({
          [uci.slice(0, 2)]: { backgroundColor: "rgba(255,255,0,0.4)" },
          [uci.slice(2, 4)]: { backgroundColor: "rgba(255,255,0,0.4)" },
        });
        setMoveIndex(nextIdx + 1);
        if (nextIdx + 1 >= solution.length) {
          setPhase("solved");
          finish(true);
        } else {
          setPhase("playing");
        }
      }, 400);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [solution]
  );

  function handleDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (phase !== "playing" || !targetSquare) return false;
    const result = chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
    if (!result) return false;

    const uci = `${sourceSquare}${targetSquare}${result.promotion ?? ""}`;
    if (uci !== solution[moveIndex]) {
      setFen(chess.fen());
      setPhase("wrong");
      setTimeout(() => {
        chess.undo();
        setFen(chess.fen());
        setPhase("playing");
      }, 700);
      return true;
    }

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

  function handleSquareClick({ square }: { piece: unknown; square: string }) {
    if (phase !== "playing") return;

    if (selectedSquare) {
      const result = chess.move({ from: selectedSquare, to: square, promotion: "q" });
      setSelectedSquare(null);

      if (!result) {
        const moves = chess.moves({ square: square as never, verbose: true });
        if (moves.length > 0) setSelectedSquare(square);
        return;
      }

      const uci = `${selectedSquare}${square}${result.promotion ?? ""}`;
      if (uci !== solution[moveIndex]) {
        setFen(chess.fen());
        setPhase("wrong");
        setTimeout(() => {
          chess.undo();
          setFen(chess.fen());
          setPhase("playing");
        }, 700);
        return;
      }

      setFen(chess.fen());
      setLastSquares({
        [selectedSquare]: { backgroundColor: "rgba(0,200,0,0.35)" },
        [square]: { backgroundColor: "rgba(0,200,0,0.35)" },
      });
      const nextIdx = moveIndex + 1;
      setMoveIndex(nextIdx);
      applyOpponentMove(nextIdx, chess);
    } else {
      const moves = chess.moves({ square: square as never, verbose: true });
      if (moves.length > 0) setSelectedSquare(square);
    }
  }

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

  const remaining = Math.max(0, timeoutMs - elapsedMs);
  const pct = (remaining / timeoutMs) * 100;
  const timerColor = remaining < 20_000 ? "bg-red-500" : remaining < 45_000 ? "bg-yellow-400" : "bg-green-500";

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Time bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-200 rounded-full ${timerColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="w-full aspect-square">
        <ChessBoardWrapper
          position={fen}
          interactive={phase === "playing"}
          onPieceDrop={handleDrop}
          onSquareClick={handleSquareClick}
          boardOrientation={boardOrientation}
          squareStyles={{ ...lastSquares, ...getClickStyles() }}
        />
      </div>

      <div className="text-center text-sm font-medium h-5">
        {phase === "playing" && (
          <span className="text-gray-600">Find the best move!</span>
        )}
        {phase === "opponent" && (
          <span className="text-blue-600 animate-pulse">Opponent responding…</span>
        )}
        {phase === "wrong" && (
          <span className="text-red-600">Not the best move — try again</span>
        )}
        {phase === "solved" && (
          <span className="text-green-600 font-bold">Solved!</span>
        )}
      </div>
    </div>
  );
}
