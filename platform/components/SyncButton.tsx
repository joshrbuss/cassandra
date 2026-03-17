"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/components/i18n/LocaleProvider";

interface Props {
  lastSyncedAt: string | null;
  /** True if user has never had puzzles imported before */
  isFirstSync?: boolean;
}

function formatTimeAgo(isoString: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) {
    const mins = Math.floor(diffMs / (1000 * 60));
    return mins <= 1 ? t("sync.justNow") : t("sync.minutesAgo", { count: mins });
  }
  return hours === 1 ? t("sync.oneHourAgo") : t("sync.hoursAgo", { count: hours });
}

export default function SyncButton({ lastSyncedAt, isFirstSync = false }: Props) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"idle" | "loading" | "result">("idle");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultType, setResultType] = useState<"success" | "error">("success");
  const [syncedAt, setSyncedAt] = useState(lastSyncedAt);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Clean up timer on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  async function handleSync() {
    setStatus("loading");
    setResultMessage(null);
    try {
      const res = await fetch("/api/users/me/import", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        gamesProcessed?: number;
        puzzlesImported?: number;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setResultMessage(t("sync.failed"));
        setResultType("error");
      } else {
        const { gamesProcessed = 0, puzzlesImported = 0 } = data;
        if (puzzlesImported > 0 && isFirstSync) {
          setResultMessage(t("sync.firstSync", { puzzles: puzzlesImported, games: gamesProcessed }));
        } else if (puzzlesImported > 0) {
          setResultMessage(t("sync.newFound", { puzzles: puzzlesImported, games: gamesProcessed }));
        } else {
          setResultMessage(t("sync.noBlunders", { games: gamesProcessed }));
        }
        setResultType("success");
        setSyncedAt(new Date().toISOString());
      }
    } catch {
      setResultMessage(t("sync.failed"));
      setResultType("error");
    }
    setStatus("result");
    // Revert to idle after 5 seconds
    timerRef.current = setTimeout(() => {
      setStatus("idle");
      setResultMessage(null);
    }, 5000);
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      {/* Last synced timestamp */}
      {syncedAt && status !== "loading" && (
        <p className="text-xs text-[#666]">
          {t("sync.lastSynced", { time: formatTimeAgo(syncedAt, t) })}
        </p>
      )}

      {/* Loading state */}
      {status === "loading" && (
        <p className="text-xs text-[#c8942a] font-medium animate-pulse">
          {t("sync.syncing")}
        </p>
      )}

      {/* Result message */}
      {status === "result" && resultMessage && (
        <p className={`text-xs font-medium ${resultType === "error" ? "text-red-500" : "text-[#c8942a]"}`}>
          {resultMessage}
        </p>
      )}

      {/* Sync button — always visible when not loading */}
      {status !== "loading" && (
        <button
          onClick={handleSync}
          className="text-xs font-medium text-[#c8942a] border border-[#c8942a]/40 px-3 py-1 rounded-full hover:bg-[#c8942a]/10 transition-colors"
        >
          {t("sync.syncNow")}
        </button>
      )}
    </div>
  );
}
