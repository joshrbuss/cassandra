"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "@/components/i18n/LocaleProvider";
import { Chess } from "chess.js";
import dynamic from "next/dynamic";
import { BoardSkeleton } from "@/components/Skeleton";
import type { PieceDropHandlerArgs } from "@/components/ChessBoardWrapper";
import { useTimer } from "@/hooks/useTimer";
import type { AttemptResponse } from "@/app/api/puzzles/[id]/attempt/route";
import type { LeaderboardEntry } from "@/app/api/puzzles/[id]/leaderboard/route";
import { formatTime } from "@/lib/benchmarks";
import ShareButton from "@/components/marketing/ShareButton";
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
  stripeLink?: string | null;
  footerText?: string;
}

type Phase = "playing" | "opponent" | "solved" | "wrong";

function formatEval(cp: number): string {
  const pawns = Math.abs(cp) / 100;
  const sign = cp >= 0 ? "+" : "\u2212";
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
  stripeLink,
  footerText,
}: TrainPuzzleShellProps) {
  const { t } = useTranslation();
  const solution = solutionMoves.trim().split(/\s+/);
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

  // Session accuracy tracking
  const [sessionStats, setSessionStats] = useState({ solved: 0, total: 0 });
  // Daily accuracy tracking (resets at midnight via date key)
  const dailyKey = `cassandra_daily_stats_${new Date().toISOString().split("T")[0]}`;
  const [dailyStats, setDailyStats] = useState({ solved: 0, total: 0 });
  useEffect(() => {
    const key = "cassandra_session_stats";
    const prev = JSON.parse(sessionStorage.getItem(key) ?? '{"solved":0,"total":0}');
    setSessionStats(prev);
    const dayPrev = JSON.parse(localStorage.getItem(dailyKey) ?? '{"solved":0,"total":0}');
    setDailyStats(dayPrev);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leaderboard (loaded after solve)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(false);

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

      // Update session + daily stats — only count first attempts for accuracy
      if (data.attemptNumber === 1) {
        const sKey = "cassandra_session_stats";
        const prev = JSON.parse(sessionStorage.getItem(sKey) ?? '{"solved":0,"total":0}');
        const next = {
          solved: prev.solved + (data.recorded && success ? 1 : 0),
          total: prev.total + 1,
        };
        sessionStorage.setItem(sKey, JSON.stringify(next));
        setSessionStats(next);

        const dayPrev = JSON.parse(localStorage.getItem(dailyKey) ?? '{"solved":0,"total":0}');
        const dayNext = {
          solved: dayPrev.solved + (data.recorded && success ? 1 : 0),
          total: dayPrev.total + 1,
        };
        localStorage.setItem(dailyKey, JSON.stringify(dayNext));
        setDailyStats(dayNext);
      }

      // Load leaderboard after attempt is saved
      setLoadingBoard(true);
      const userId = data.userId ?? "";
      fetch(`/api/puzzles/${puzzleId}/leaderboard?userId=${encodeURIComponent(userId)}`)
        .then((r) => r.json())
        .then((d) => setLeaderboard(d.entries ?? []))
        .catch(() => {})
        .finally(() => setLoadingBoard(false));
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

  const isSolved = phase === "solved";
  const formattedDate = gameDate
    ? new Date(gameDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const evalLabel =
    evalCp === null || evalCp === undefined ? "\u2014" : formatEval(evalCp);
  const evalSubLabel =
    evalCp === null || evalCp === undefined
      ? t("train.evaluation")
      : evalCp > 0
        ? t("train.pawnsUp")
        : evalCp < 0
          ? t("train.pawnsDown")
          : t("train.even");

  return (
    <div className="w-full">
      {/* Nav bar */}
      <nav className="bg-[#0e0e0e] pl-4 pr-14 py-3 flex items-center justify-between">
        <Link href="/home" className="text-sm font-medium text-[#c8942a] hover:text-[#e0ad3a] transition-colors">
          {t("train.dashboard")}
        </Link>
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          {t("train.fromYourGames")}
        </span>
        {stripeLink ? (
          <a
            href={stripeLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-medium text-[#c8942a] bg-[#c8942a]/10 border border-[#c8942a]/30 px-2.5 py-1 rounded-full hover:bg-[#c8942a]/20 transition-colors"
          >
            Ad-free
          </a>
        ) : (
          <span className="w-16" />
        )}
      </nav>

      {/* Game context strip */}
      <div className="bg-[#eeebe6] border-b border-[#e8e4de] px-4 py-2.5 flex flex-wrap items-center gap-2">
        {gameResult && (
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
            gameResult === "win"
              ? "bg-green-100 text-green-700"
              : gameResult === "loss"
                ? "bg-red-100 text-red-600"
                : "bg-gray-200 text-gray-500"
          }`}>
            {gameResult === "win" ? t("train.youWon") : gameResult === "loss" ? t("train.youLost") : t("train.draw")}
          </span>
        )}
        {opponentUsername && (
          <span className="text-[11px] text-[#1a1a1a] font-medium">
            vs {opponentUsername}
          </span>
        )}
        {formattedDate && (
          <span className="text-[11px] text-[#999]">{formattedDate}</span>
        )}
        <span className="flex-1" />
        {gameUrl && (
          <a
            href={gameUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-medium text-[#c8942a] hover:text-[#a67720] transition-colors"
          >
            {t("train.viewOriginalGame")}
          </a>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 pb-6">
        {/* Obsidian top panel */}
        <div className="bg-[#0e0e0e] rounded-xl px-5 py-4 mb-4">
          {isSolved ? (
            <>
              <p className="text-[#c8942a] font-bold text-lg">Puzzle solved! Chess On!</p>
              <p className="text-gray-500 text-sm mt-0.5">
                {attemptResult
                  ? t("solve.solvedIn", { time: formatTime(attemptResult.solveTimeMs) })
                  : "Calculating..."}
              </p>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                  <p className="text-[#c8942a] font-mono font-bold text-lg">
                    {attemptResult ? formatTime(attemptResult.solveTimeMs) : `${elapsedSec}s`}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Your time</p>
                </div>
                <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                  <p className="text-white font-mono font-bold text-lg">
                    {attemptResult?.avgSolveMs != null && attemptResult.totalAttempts >= 3
                      ? formatTime(attemptResult.avgSolveMs)
                      : "\u2014"}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">{t("solve.avgSolve")}</p>
                </div>
                <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                  <p className="text-[#c8942a] font-bold text-lg">
                    {dailyStats.total > 0
                      ? `${Math.round((dailyStats.solved / dailyStats.total) * 100)}%`
                      : sessionStats.total > 0
                        ? `${Math.round((sessionStats.solved / sessionStats.total) * 100)}%`
                        : "\u2014"}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">
                    {dailyStats.total > 0
                      ? `Today (${dailyStats.solved}/${dailyStats.total})`
                      : `Session (${sessionStats.solved}/${sessionStats.total})`}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <Link
                  href="/unlearned"
                  className="flex-1 text-center bg-[#c8942a] text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#b5852a] transition-colors"
                >
                  {t("train.nextPuzzle")}
                </Link>
                <Link
                  href="/home"
                  className="flex-1 text-center bg-[#2a2a2a] text-gray-400 px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#333] hover:text-gray-300 transition-colors"
                >
                  {t("train.doneForNow")}
                </Link>
              </div>

              <div className="mt-3 text-center">
                <ShareButton
                  text="I just solved a chess puzzle on Cassandra Chess!"
                  className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-white transition-colors"
                >
                  Share on <span className="text-[#c8942a] font-bold">X</span>
                </ShareButton>
              </div>
            </>
          ) : (
            <>
              <p className="text-[#c8942a] font-bold text-lg">
                {t("train.findBestMove", { color: boardOrientation })}
              </p>
              <p className="text-gray-500 text-sm mt-0.5">
                Playing as {boardOrientation}{moveNumber ? ` \u00b7 Move ${moveNumber}` : ""}
              </p>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                  <p className="text-[#c8942a] font-mono font-bold text-lg">{elapsedSec}s</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">{t("train.elapsed")}</p>
                </div>
                <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                  <p className="text-white font-bold text-lg">{evalLabel}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">{evalSubLabel}</p>
                </div>
                <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                  <p className="text-[#c8942a] font-bold text-lg">
                    {dailyStats.total > 0
                      ? `${Math.round((dailyStats.solved / dailyStats.total) * 100)}%`
                      : sessionStats.total > 0
                        ? `${Math.round((sessionStats.solved / sessionStats.total) * 100)}%`
                        : "\u2014"}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">
                    {dailyStats.total > 0
                      ? `Today (${dailyStats.solved}/${dailyStats.total})`
                      : `Session (${sessionStats.solved}/${sessionStats.total})`}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                {hintLevel < 2 ? (
                  <button
                    onClick={() => {
                      setHintLevel((l) => (Math.min(l + 1, 2) as 0 | 1 | 2));
                      hadWrongMove.current = true;
                    }}
                    className="flex-1 text-center bg-[#c8942a] text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#b5852a] transition-colors"
                  >
                    {hintLevel === 0 ? t("train.hint") : t("train.showDestination")}
                  </button>
                ) : (
                  <span className="flex-1" />
                )}
                <Link
                  href="/unlearned"
                  className="flex-1 text-center bg-[#2a2a2a] text-gray-400 px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#333] hover:text-gray-300 transition-colors"
                >
                  Skip puzzle
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Board label strip */}
        <div className="mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#999]">
            {isSolved ? "Position for reference" : "Drag or click to make your move"}
          </p>
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

        {/* Status bar (playing only) */}
        {!isSolved && (
          <div className="mt-3 min-h-[24px]">
            {phase === "opponent" && (
              <p className="text-sm text-[#c8942a] font-medium animate-pulse">
                {t("puzzle.opponentResponding")}
              </p>
            )}
            {phase === "wrong" && (
              <p className="text-sm text-red-500 font-medium">
                {t("puzzle.wrongMove")}
              </p>
            )}
          </div>
        )}

        {/* Leaderboard (solved only) */}
        {isSolved && (
          <div className="bg-[#eeebe6] border border-[#e8e4de] rounded-xl p-4 mt-4">
            <p className="text-xs font-semibold text-[#666] uppercase tracking-wide mb-2.5">
              {t("solve.top10Fastest")}
            </p>
            {loadingBoard ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-6 rounded bg-[#e8e4de] animate-pulse"
                    style={{ animationDelay: `${i * 80}ms` }}
                  />
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <p className="text-sm text-[#777] italic">
                {t("solve.firstSolver")}
              </p>
            ) : (
              <ol className="space-y-1">
                {leaderboard.map((entry) => (
                  <li
                    key={entry.rank}
                    className={`flex items-center justify-between text-sm rounded-lg px-3 py-1.5 ${
                      entry.isCurrentUser
                        ? "bg-[#c8942a]/10 border border-[#c8942a]/30"
                        : ""
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-5 text-right text-xs text-[#999] font-mono">
                        {entry.rank}.
                      </span>
                      <span className="font-medium text-[#1a1a1a]">
                        {entry.displayName}
                      </span>
                      {entry.isCurrentUser && (
                        <span className="text-[9px] font-bold text-[#c8942a] bg-[#c8942a]/10 border border-[#c8942a]/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          YOU
                        </span>
                      )}
                    </span>
                    <span className={`font-mono text-xs ${entry.isCurrentUser ? "text-[#c8942a] font-bold" : "text-[#666]"}`}>
                      {entry.formattedTime}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-10 pt-6 border-t border-[#e8e4de] text-center">
          <p className="text-xs text-[#999]">{footerText ?? "Cassandra Chess \u00b7 Puzzles from the Lichess open database (CC0)"}</p>
        </footer>
      </div>
    </div>
  );
}
