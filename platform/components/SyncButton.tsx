"use client";

import { useState } from "react";

interface Props {
  lastSyncedAt: string | null; // ISO string or null
}

function formatHoursAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) {
    const mins = Math.floor(diffMs / (1000 * 60));
    return mins <= 1 ? "just now" : `${mins} minutes ago`;
  }
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
}

export default function SyncButton({ lastSyncedAt }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState(lastSyncedAt);

  const recentlySynced =
    syncedAt !== null &&
    Date.now() - new Date(syncedAt).getTime() < 24 * 60 * 60 * 1000;

  if (recentlySynced && status === "idle") {
    return (
      <p className="text-xs text-gray-400">
        Last synced {formatHoursAgo(syncedAt!)}
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
        setMessage(data.error ?? "Something went wrong. Try again.");
      } else {
        const { gamesProcessed = 0, puzzlesImported = 0 } = data;
        if (puzzlesImported > 0) {
          setMessage(
            `${puzzlesImported} new puzzle${puzzlesImported !== 1 ? "s" : ""} found from ${gamesProcessed} new game${gamesProcessed !== 1 ? "s" : ""}`
          );
        } else {
          setMessage("You're up to date!");
        }
        setSyncedAt(new Date().toISOString());
      }
    } catch {
      setMessage("Something went wrong. Try again.");
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
          {status === "loading" ? "Syncing your games…" : "Sync new games"}
        </button>
      )}
      {message && (
        <p className="text-xs text-gray-500">{message}</p>
      )}
    </div>
  );
}
