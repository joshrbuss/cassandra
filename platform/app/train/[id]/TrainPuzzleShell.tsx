"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "@/components/i18n/LocaleProvider";
import { Chess } from "chess.js";
import dynamic from "next/dynamic";
import { BoardSkeleton } from "@/components/Skeleton";
import type { PieceDropHandlerArgs } from "@/components/ChessBoardWrapper";
import { useTimer } from "@/hooks/useTimer";
import SolveResultCard from "@/components/SolveResultCard";
import type { AttemptResponse } from "@/app/api/puzzles/[id]/attempt/route";
import Link from "next/link";

const ChessBoardWrapper = dynamic(() => import("@/components/ChessBoardWrapper"), {
  ssr: false,
  loading: () => <BoardSkeleton />,
});

interface TrainPuzzleShellProps {
  puzzleId: string;
  solvingFen: string;
  solutionMoves: string;
  opponentUsername?: string | null;
  gameDate?: string | null;
  gameResult?: string | null;
  moveNumber?: number | null;
  evalCp?: number | null;
  playerColor?: string | null;
  gameUrl?: string | null;
}

type Phase = "playing" | "opponent" | "solved" | "wrong";

function formatEval(cp: number): string {
  const pawns = Math.abs(cp) / 100;
  const sign = cp >= 0 ? "+" : "−";
  return `${sign}${pawns.toFixed(1)}`;
}

export default function TrainPuzzleShell({
  puzzleId,
  solvingFen,
  solutionMoves,
  opponentUsername,
  gameDate,
  gameResult,
  moveNumber,
  evalCp,
  playerColor,
  gameUrl,
}: TrainPuzzleShellProps) {
  const { t } = useTranslation();
  const solution = solutionMoves.trim().split(/\s+/);
  // Use stored playerColor from the game; fall back to FEN turn for library puzzles
  const boardOrientation: "white" | "black" =
    playerColor === "white" || playerColor === "black"
      ? playerColor
      : solvingFen.split(" ")[1] === "b"
        ? "black"
        : "white";

  const [chess] = useState(() => new Chess(solvingFen));
  const [fen, setFen] = useState(solvingFen);
  const [moveIndex, setMoveIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [lastSquares, setLastSquares] = useState<Record<string, React.CSSProperties>>({});
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2>(0);

  const { elapsedMs, start, stop } = useTimer();
  const [attemptResult, setAttemptResult] = useState<AttemptResponse | null>(null);
  const submitLock = useRef(false);
  const hadWrongMove = useRef(false);

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
        body: JSON.stringify({ solveTimeMs, success }),
      });
      const data: AttemptResponse = await res.json();
      setAttemptResult(data);
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
    setLastSquares({
      [sourceSquare]: { backgroundColor: "rgba(0,200,0,0.35)" },
      [targetSquare]: { backgroundColor: "rgba(0,200,0,0.35)" },
    });

    const nextIdx = moveIndex + 1;
    setMoveIndex(nextIdx);
    applyOpponentMove(nextIdx, chess);
    return true;
  }

  const formattedDate = gameDate
    ? new Date(gameDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  const elapsedSec = Math.floor(elapsedMs / 1000);

  const evalLabel =
    evalCp === null || evalCp === undefined
      ? "—"
      : formatEval(evalCp);

  const evalSubLabel =
    evalCp === null || evalCp === undefined
      ? t("train.evaluation")
      : evalCp > 0
        ? t("train.pawnsUp")
        : evalCp < 0
          ? t("train.pawnsDown")
          : t("train.even");

  return (
    <div className="bg-white w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
            {t("train.fromYourGames")}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            {opponentUsername ? t("train.vsOpponent", { name: opponentUsername }) : t("train.yourGame")}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {formattedDate && <span>{formattedDate} · </span>}
            {t("train.findBestMove", { color: solvingFen.split(" ")[1] === "b" ? "black" : "white" })}
          </p>
        </div>
        {gameResult && (
          <span
            className={`mt-1 flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${
              gameResult === "win"
                ? "bg-green-100 text-green-700"
                : gameResult === "loss"
                  ? "bg-red-100 text-red-600"
                  : "bg-gray-100 text-gray-500"
            }`}
          >
            {gameResult === "win" ? t("train.youWon") : gameResult === "loss" ? t("train.youLost") : t("train.draw")}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="border border-gray-100 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-gray-900">{moveNumber ?? "—"}</p>
          <p className="text-[11px] text-gray-400 mt-0.5 uppercase tracking-wide">{t("train.position")}</p>
        </div>
        <div className="border border-gray-100 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-gray-900">{evalLabel}</p>
          <p className="text-[11px] text-gray-400 mt-0.5 uppercase tracking-wide">{evalSubLabel}</p>
        </div>
        <div className="border border-gray-100 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-gray-900">{elapsedSec}s</p>
          <p className="text-[11px] text-gray-400 mt-0.5 uppercase tracking-wide">{t("train.elapsed")}</p>
        </div>
      </div>

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

      {/* Status bar */}
      <div className="mt-3 min-h-[24px]">
        {phase === "opponent" && (
          <p className="text-sm text-blue-600 font-medium animate-pulse">
            {t("puzzle.opponentResponding")}
          </p>
        )}
        {phase === "wrong" && (
          <p className="text-sm text-red-500 font-medium">
            {t("puzzle.wrongMove")}
          </p>
        )}
      </div>

      {/* Footer */}
      {phase !== "solved" && (
        <div className="mt-4 flex items-end justify-between">
          <div className="flex flex-col gap-1">
            {hintLevel < 2 && (
              <button
                onClick={() => {
                  setHintLevel((l) => (Math.min(l + 1, 2) as 0 | 1 | 2));
                  hadWrongMove.current = true;
                }}
                className="text-sm text-gray-400 hover:text-gray-700 underline underline-offset-2 text-left"
              >
                {hintLevel === 0 ? t("train.hint") : t("train.showDestination")}
              </button>
            )}
            {gameUrl && (
              <a
                href={gameUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                {t("train.viewOriginalGame")}
              </a>
            )}
          </div>
          <Link
            href="/train"
            className="inline-flex items-center gap-1 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors"
          >
            {t("train.nextPuzzle")}
          </Link>
        </div>
      )}

      {/* Post-solve result card */}
      {phase === "solved" && attemptResult && (
        <div className="mt-4">
          <SolveResultCard
            puzzleId={puzzleId}
            solveTimeMs={attemptResult.solveTimeMs}
            percentile={attemptResult.percentile}
            bucket={attemptResult.bucket}
            avgSolveMs={attemptResult.avgSolveMs}
            top10PctMs={attemptResult.top10PctMs}
            totalAttempts={attemptResult.totalAttempts}
            userId={attemptResult.userId ?? ""}
          />
          <div className="mt-4 flex items-center justify-between">
            <Link href="/train" className="inline-flex items-center gap-1 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors">
              {t("train.nextPuzzle")}
            </Link>
            <Link href="/dashboard" className="text-sm text-gray-400 hover:underline">
              {t("train.doneForNow")}
            </Link>
          </div>
        </div>
      )}

      {phase === "solved" && !attemptResult && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-center">
          <p className="text-green-800 font-bold">{t("train.puzzleSolved")}</p>
          <div className="mt-2 h-4 w-32 mx-auto bg-green-200 animate-pulse rounded" />
        </div>
      )}
    </div>
  );
}
