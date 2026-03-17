"use client";

import { useState, useEffect, useRef } from "react";

interface AnalysisStatus {
  isComplete: boolean;
  pendingGames: number;
  totalGames: number;
  doneGames: number;
  totalPuzzles: number;
}

/** Poll interval in ms */
const POLL_INTERVAL = 30_000;

export default function BackgroundAnalysisBar() {
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    fetchStatus();

    timerRef.current = setInterval(fetchStatus, POLL_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/users/me/analysis-status");
      if (!res.ok) return;
      const data: AnalysisStatus = await res.json();
      setStatus(data);

      // Stop polling once complete
      if (data.isComplete && timerRef.current) {
        clearInterval(timerRef.current);
      }
    } catch {
      // Silently ignore fetch errors
    }
  }

  if (!status || dismissed) return null;

  // Nothing to show if no games at all
  if (status.totalGames === 0) return null;

  const progressPct = status.totalGames > 0
    ? Math.round((status.doneGames / status.totalGames) * 100)
    : 0;

  if (status.isComplete) {
    return (
      <div className="bg-[#0e0e0e] border border-[#c8942a]/30 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[#c8942a] text-sm">&#10003;</span>
            <p className="text-sm text-white">
              Analysis complete &mdash; <span className="text-[#c8942a] font-semibold">{status.totalPuzzles} puzzles</span> from your games
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-gray-600 hover:text-gray-400 text-xs ml-3"
          >
            &#10005;
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0e0e0e] border border-[#2a2a2a] rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-300 animate-pulse">
          Still analysing your games in the background...
        </p>
        <p className="text-xs text-[#c8942a] font-medium tabular-nums">
          {status.totalPuzzles} puzzle{status.totalPuzzles !== 1 ? "s" : ""} found so far
        </p>
      </div>
      <div className="w-full bg-[#333] rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-[#c8942a] rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <p className="text-xs text-gray-600 mt-1.5 tabular-nums">
        {status.doneGames}/{status.totalGames} games analysed
      </p>
    </div>
  );
}
