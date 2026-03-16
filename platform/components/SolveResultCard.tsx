"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/components/i18n/LocaleProvider";
import ShareButton from "@/components/marketing/ShareButton";
import { formatTime, type PercentileBucket } from "@/lib/benchmarks";
import type { LeaderboardEntry } from "@/app/api/puzzles/[id]/leaderboard/route";

interface SolveResultCardProps {
  puzzleId: string;
  solveTimeMs: number;
  percentile: number;
  bucket: PercentileBucket;
  avgSolveMs: number | null;
  top10PctMs: number | null;
  totalAttempts: number;
  userId: string;
  /** Game context for pills */
  opponentUsername?: string | null;
  gameDate?: string | null;
  gameResult?: string | null;
  gameUrl?: string | null;
}

export default function SolveResultCard({
  puzzleId,
  solveTimeMs,
  avgSolveMs,
  top10PctMs,
  totalAttempts,
  userId,
  opponentUsername,
  gameDate,
  gameResult,
  gameUrl,
}: SolveResultCardProps) {
  const { t } = useTranslation();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(true);

  // Track session accuracy
  const [sessionStats, setSessionStats] = useState({ solved: 0, total: 0 });
  useEffect(() => {
    const key = "cassandra_session_stats";
    const prev = JSON.parse(sessionStorage.getItem(key) ?? '{"solved":0,"total":0}');
    const next = { solved: prev.solved + 1, total: prev.total + 1 };
    sessionStorage.setItem(key, JSON.stringify(next));
    setSessionStats(next);
  }, []);

  useEffect(() => {
    fetch(`/api/puzzles/${puzzleId}/leaderboard?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d) => setLeaderboard(d.entries ?? []))
      .catch(() => {})
      .finally(() => setLoadingBoard(false));
  }, [puzzleId, userId]);

  const formattedDate = gameDate
    ? new Date(gameDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  const sessionAccuracy = sessionStats.total > 0
    ? Math.round((sessionStats.solved / sessionStats.total) * 100)
    : 0;

  return (
    <div className="w-full space-y-3">
      {/* ── Obsidian result panel ── */}
      <div className="bg-[#0e0e0e] rounded-xl px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white font-bold text-lg">{t("solve.puzzleSolved")}</p>
            <p className="text-[#c8942a] text-sm font-medium">
              {t("solve.solvedIn", { time: formatTime(solveTimeMs) })}
            </p>
          </div>
          <ShareButton
            text="I just solved a chess puzzle on Cassandra Chess!"
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.252 5.622 5.912-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            {t("solve.share")}
          </ShareButton>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-white font-mono font-bold text-lg">{formatTime(solveTimeMs)}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Your time</p>
          </div>
          <div className="text-center">
            <p className="text-white font-mono font-bold text-lg">
              {avgSolveMs !== null && totalAttempts >= 3 ? formatTime(avgSolveMs) : "—"}
            </p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">{t("solve.avgSolve")}</p>
          </div>
          <div className="text-center">
            <p className="text-[#c8942a] font-bold text-lg">{sessionAccuracy}%</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">
              Session ({sessionStats.solved}/{sessionStats.total})
            </p>
          </div>
        </div>
      </div>

      {/* ── Game context pills ── */}
      <div className="flex flex-wrap items-center gap-2">
        {opponentUsername && (
          <span className="text-xs bg-[#eeebe6] text-[#1a1a1a] px-2.5 py-1 rounded-full border border-[#d8d4ce]">
            vs {opponentUsername}
          </span>
        )}
        {formattedDate && (
          <span className="text-xs bg-[#eeebe6] text-[#666] px-2.5 py-1 rounded-full border border-[#d8d4ce]">
            {formattedDate}
          </span>
        )}
        {gameResult && (
          <span className={`text-xs px-2.5 py-1 rounded-full border ${
            gameResult === "win"
              ? "bg-green-50 text-green-700 border-green-200"
              : gameResult === "loss"
                ? "bg-red-50 text-red-600 border-red-200"
                : "bg-gray-50 text-gray-500 border-gray-200"
          }`}>
            {gameResult === "win" ? t("train.youWon") : gameResult === "loss" ? t("train.youLost") : t("train.draw")}
          </span>
        )}
        {gameUrl && (
          <a
            href={gameUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#c8942a] hover:text-[#a67720] px-2.5 py-1 rounded-full border border-[#c8942a]/30 bg-[#c8942a]/5 transition-colors"
          >
            {t("train.viewOriginalGame")}
          </a>
        )}
      </div>

      {/* ── Leaderboard ── */}
      <div className="bg-[#eeebe6] border border-[#d8d4ce] rounded-xl p-4">
        <p className="text-xs font-semibold text-[#666] uppercase tracking-wide mb-2.5">
          {t("solve.top10Fastest")}
        </p>
        {loadingBoard ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-6 rounded bg-[#d8d4ce] animate-pulse"
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
                  <span className={`font-medium ${entry.isCurrentUser ? "text-[#1a1a1a]" : "text-[#1a1a1a]"}`}>
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
    </div>
  );
}
