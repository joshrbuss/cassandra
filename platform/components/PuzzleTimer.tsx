"use client";

import { formatTime, type TimeControl, BENCHMARKS } from "@/lib/benchmarks";

interface PuzzleTimerProps {
  elapsedMs: number;
  isRunning: boolean;
  timeControl?: TimeControl;
  /** When set, display a countdown from this target instead of counting up */
  drillTargetMs?: number | null;
}

/**
 * Live timer displayed above the puzzle board.
 * - Normal mode: counts up, colour-codes against the time-control benchmark.
 * - Drill mode (drillTargetMs set): counts down, turns red when expired.
 */
export default function PuzzleTimer({
  elapsedMs,
  isRunning,
  timeControl,
  drillTargetMs,
}: PuzzleTimerProps) {
  // ── Drill mode ────────────────────────────────────────────────────────────
  if (drillTargetMs) {
    const remaining = Math.max(0, drillTargetMs - elapsedMs);
    const expired = elapsedMs >= drillTargetMs;
    const ratio = elapsedMs / drillTargetMs;
    const colorClass = expired
      ? "text-red-600"
      : ratio >= 0.75
      ? "text-red-500"
      : ratio >= 0.5
      ? "text-yellow-500"
      : "text-green-600";

    return (
      <div className="w-full px-1 mb-1">
        <div className="flex items-center justify-between">
          <div className={`font-mono text-2xl font-bold tabular-nums ${colorClass}`}>
            {expired ? "TIME!" : formatTime(remaining)}
          </div>
          <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
            ⏱ Drill mode
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-1 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              expired ? "bg-red-500" : ratio >= 0.75 ? "bg-red-400" : ratio >= 0.5 ? "bg-yellow-400" : "bg-green-400"
            }`}
            style={{ width: `${Math.min(100, ratio * 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-0.5 text-right">
          target: {formatTime(drillTargetMs)}
        </p>
      </div>
    );
  }

  // ── Normal count-up mode ──────────────────────────────────────────────────
  const benchmark = timeControl ? BENCHMARKS[timeControl] : null;

  let colorClass = "text-gray-700";
  if (benchmark) {
    const ratio = elapsedMs / benchmark.targetMs;
    if (ratio >= 1.2) colorClass = "text-red-500";
    else if (ratio >= 0.8) colorClass = "text-yellow-500";
    else colorClass = "text-green-600";
  }

  return (
    <div className="flex items-center justify-between w-full px-1 mb-1">
      <div className={`font-mono text-2xl font-bold tabular-nums ${colorClass}`}>
        {formatTime(elapsedMs)}
      </div>
      {isRunning && (
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          timing
        </span>
      )}
      {!isRunning && elapsedMs > 0 && (
        <span className="text-xs text-gray-400">stopped</span>
      )}
    </div>
  );
}
