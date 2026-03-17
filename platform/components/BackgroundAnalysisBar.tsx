"use client";

import { useState, useEffect, useRef } from "react";

interface AnalysisStatus {
  isComplete: boolean;
  pendingGames: number;
  totalGames: number;
  doneGames: number;
  totalPuzzles: number;
}

interface Props {
  /** If true, trigger a background game sync on mount (returning users with stale data) */
  needsSync?: boolean;
}

/** Poll interval in ms */
const POLL_INTERVAL = 60_000;

export default function BackgroundAnalysisBar({ needsSync = false }: Props) {
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const syncTriggered = useRef(false);

  useEffect(() => {
    fetchStatus();

    timerRef.current = setInterval(fetchStatus, POLL_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Trigger background sync for returning users
  useEffect(() => {
    if (!needsSync || syncTriggered.current) return;
    syncTriggered.current = true;
    triggerSync();
  }, [needsSync]);

  async function triggerSync() {
    setSyncing(true);
    try {
      console.log("[BackgroundAnalysisBar] Triggering background sync for returning user");
      await fetch("/api/users/me/import", { method: "POST" });
      // Refresh status after sync queues new games
      await fetchStatus();
    } catch {
      // Silently ignore
    }
    setSyncing(false);
  }

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

  // Nothing to show if no games at all and not syncing
  if (status.totalGames === 0 && !syncing) return null;

  const progressPct = status.totalGames > 0
    ? Math.round((status.doneGames / status.totalGames) * 100)
    : 0;

  if (syncing) {
    return (
      <div className="bg-[#0e0e0e] border border-[#2a2a2a] rounded-xl p-4 mb-4">
        <p className="text-sm text-gray-300 animate-pulse">
          Syncing your latest games...
        </p>
      </div>
    );
  }

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
