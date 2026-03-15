"use client";

import { useEffect, useState, useRef } from "react";
import EmailSignup from "@/components/marketing/EmailSignup";
import ShareButton from "@/components/marketing/ShareButton";
import {
  formatTime,
  BENCHMARKS,
  TIME_CONTROL_LABELS,
  type TimeControl,
  type PercentileBucket,
} from "@/lib/benchmarks";
import type { LeaderboardEntry } from "@/app/api/puzzles/[id]/leaderboard/route";

interface SolveResultCardProps {
  puzzleId: string;
  solveTimeMs: number;
  percentile: number;
  bucket: PercentileBucket;
  avgSolveMs: number | null;
  top10PctMs: number | null;
  totalAttempts: number;
  timeControl?: TimeControl;
  userId: string;
}

export default function SolveResultCard({
  puzzleId,
  solveTimeMs,
  percentile,
  bucket,
  avgSolveMs,
  top10PctMs,
  totalAttempts,
  timeControl,
  userId,
}: SolveResultCardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [showSignup, setShowSignup] = useState(false);
  const counted = useRef(false);

  useEffect(() => {
    // Track session solve count in sessionStorage; show signup after 3rd solve
    if (!counted.current) {
      counted.current = true;
      const key = "cassandra_session_solves";
      const prev = parseInt(sessionStorage.getItem(key) ?? "0", 10);
      const next = prev + 1;
      sessionStorage.setItem(key, String(next));
      if (next >= 3) setShowSignup(true);
    }
  }, []);

  useEffect(() => {
    fetch(`/api/puzzles/${puzzleId}/leaderboard?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d) => setLeaderboard(d.entries ?? []))
      .catch(() => {})
      .finally(() => setLoadingBoard(false));
  }, [puzzleId, userId]);

  const benchmark = timeControl ? BENCHMARKS[timeControl] : null;

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-green-50 border-b border-green-100 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-green-800 font-bold text-base">Puzzle solved!</p>
          <p className="text-green-700 text-sm">
            You solved this in{" "}
            <span className="font-mono font-bold">{formatTime(solveTimeMs)}</span>
          </p>
        </div>
          <ShareButton
            text="I just solved a chess puzzle on Cassandra Chess!"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.252 5.622 5.912-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share
          </ShareButton>
      </div>

      {/* Stats row */}
      {totalAttempts >= 3 && (
        <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Average solve
            </p>
            <p className="font-mono font-bold text-gray-800">
              {avgSolveMs !== null ? formatTime(avgSolveMs) : "—"}
            </p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Top 10% solve in
            </p>
            <p className="font-mono font-bold text-gray-800">
              {top10PctMs !== null ? `under ${formatTime(top10PctMs)}` : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Time control context */}
      {benchmark && timeControl && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-700">
          For a{" "}
          <span className="font-semibold">{TIME_CONTROL_LABELS[timeControl]}</span>{" "}
          player, this type of position should take{" "}
          <span className="font-semibold">{benchmark.label}</span>.
        </div>
      )}

      {/* Leaderboard */}
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Top 10 fastest
        </p>
        {loadingBoard ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-6 rounded bg-gray-100 animate-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            No recorded solves yet — you&apos;re the first!
          </p>
        ) : (
          <ol className="space-y-1">
            {leaderboard.map((entry) => (
              <li
                key={entry.rank}
                className={`flex items-center justify-between text-sm rounded px-2 py-1 ${
                  entry.isCurrentUser
                    ? "bg-blue-50 text-blue-800 font-semibold"
                    : "text-gray-700"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-5 text-right text-xs text-gray-400 font-mono">
                    {entry.rank}.
                  </span>
                  <span>{entry.displayName}</span>
                  {entry.isCurrentUser && (
                    <span className="text-xs bg-blue-200 text-blue-700 px-1 rounded">
                      you
                    </span>
                  )}
                </span>
                <span className="font-mono text-xs">{entry.formattedTime}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Post-solve email capture — shown after 3rd solve in session */}
      {showSignup && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100">
          <EmailSignup
            source="post_solve"
            headline="Get your weekly puzzle digest"
            cta="Send me picks"
          />
        </div>
      )}
    </div>
  );
}
