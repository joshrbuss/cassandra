"use client";

import { useState } from "react";
import { useTranslation } from "@/components/i18n/LocaleProvider";

interface Props {
  lastSyncedAt: string | null; // ISO string or null
}

function formatHoursAgo(isoString: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) {
    const mins = Math.floor(diffMs / (1000 * 60));
    return mins <= 1 ? t("sync.justNow") : t("sync.minutesAgo", { count: mins });
  }
  return hours === 1 ? t("sync.oneHourAgo") : t("sync.hoursAgo", { count: hours });
}

export default function SyncButton({ lastSyncedAt }: Props) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState(lastSyncedAt);

  const recentlySynced =
    syncedAt !== null &&
    Date.now() - new Date(syncedAt).getTime() < 24 * 60 * 60 * 1000;

  if (recentlySynced && status === "idle") {
    return (
      <p className="text-xs text-gray-400">
        {t("sync.lastSynced", { time: formatHoursAgo(syncedAt!, t) })}
      </p>
    );
  }

  async function handleSync() {
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/users/me/import", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        gamesProcessed?: number;
        puzzlesImported?: number;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setMessage(data.error ?? t("sync.error"));
      } else {
        const { gamesProcessed = 0, puzzlesImported = 0 } = data;
        if (puzzlesImported > 0) {
          setMessage(
            t("sync.newPuzzles", { puzzles: puzzlesImported, games: gamesProcessed })
          );
        } else {
          setMessage(t("sync.upToDate"));
        }
        setSyncedAt(new Date().toISOString());
      }
    } catch {
      setMessage(t("sync.error"));
    }
    setStatus("done");
  }

  return (
    <div className="flex flex-col gap-1">
      {status !== "done" && (
        <button
          onClick={handleSync}
          disabled={status === "loading"}
          className="text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors w-fit"
        >
          {status === "loading" ? t("sync.syncing") : t("sync.syncNew")}
        </button>
      )}
      {message && (
        <p className="text-xs text-gray-500">{message}</p>
      )}
    </div>
  );
}
