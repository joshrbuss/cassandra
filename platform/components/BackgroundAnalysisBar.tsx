"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/components/i18n/LocaleProvider";

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

/** Poll interval in ms — 5s when analysis is active, 60s otherwise */
const POLL_ACTIVE = 5_000;
const POLL_IDLE = 60_000;

export default function BackgroundAnalysisBar({ needsSync = false }: Props) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const syncTriggered = useRef(false);
  const lastDoneRef = useRef(0);

  useEffect(() => {
    fetchStatus();
    timerRef.current = setInterval(fetchStatus, POLL_IDLE);
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
      await fetch("/api/users/me/import", { method: "POST" });
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

      // If doneGames is actively increasing, switch to fast polling
      if (data.doneGames > lastDoneRef.current && !data.isComplete) {
        lastDoneRef.current = data.doneGames;
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(fetchStatus, POLL_ACTIVE);
      }

      // Stop polling once complete
      if (data.isComplete && timerRef.current) {
        clearInterval(timerRef.current);
      }
    } catch {
      // Silently ignore fetch errors
    }
  }

  if (!status || dismissed) return null;
  if (status.totalGames === 0 && !syncing) return null;

  // If analysis is complete (all done), show the completion banner
  if (status.isComplete && status.totalPuzzles > 0) {
    return (
      <div className="bg-[#0e0e0e] border border-[#c8942a]/30 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[#c8942a] text-sm">&#10003;</span>
            <p className="text-sm text-white">
              {t("sync.newPuzzles", { puzzles: status.totalPuzzles, games: status.totalGames })}
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

  // If complete but no puzzles, don't show anything
  if (status.isComplete) return null;

  // If there are pending games but doneGames hasn't changed (stuck/idle),
  // don't show the misleading progress bar — the user can use Sync button
  if (status.doneGames === 0 && status.pendingGames > 0 && !syncing) {
    return null;
  }

  if (syncing) {
    return (
      <div className="bg-[#0e0e0e] border border-[#2a2a2a] rounded-xl p-4 mb-4">
        <p className="text-sm text-gray-300 animate-pulse">
          {t("sync.syncing")}
        </p>
      </div>
    );
  }

  // Active analysis in progress (doneGames > 0, some still pending)
  const progressPct = status.totalGames > 0
    ? Math.round((status.doneGames / status.totalGames) * 100)
    : 0;

  return (
    <div className="bg-[#0e0e0e] border border-[#2a2a2a] rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-300 animate-pulse">
          {t("sync.syncing")}
        </p>
        <p className="text-xs text-[#c8942a] font-medium tabular-nums">
          {status.totalPuzzles} puzzle{status.totalPuzzles !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="w-full bg-[#333] rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-[#c8942a] rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <p className="text-xs text-gray-600 mt-1.5 tabular-nums">
        {status.doneGames}/{status.totalGames}
      </p>
    </div>
  );
}
