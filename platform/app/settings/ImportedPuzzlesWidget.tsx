"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ImportedPuzzlesWidgetProps {
  userId: string;
  /** Whether the user has at least one platform linked */
  hasLinkedAccount: boolean;
  /** Count of imported puzzles (all time) passed from server */
  initialTotal: number;
  /** Count of imported puzzles this week, passed from server */
  initialThisWeek: number;
}

type ImportStatus = "idle" | "importing" | "done" | "error";

export default function ImportedPuzzlesWidget({
  userId,
  hasLinkedAccount,
  initialTotal,
  initialThisWeek,
}: ImportedPuzzlesWidgetProps) {
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [thisWeek, setThisWeek] = useState(initialThisWeek);
  const [total, setTotal] = useState(initialTotal);
  const [newCount, setNewCount] = useState(0);

  // Fire a non-blocking import request on first mount when accounts are linked.
  // The request runs in the background — we don't await it on the critical path.
  useEffect(() => {
    if (!hasLinkedAccount || initialTotal > 0) return; // Skip if no link or already has puzzles

    const alreadyTriggered = sessionStorage.getItem("importTriggered");
    if (alreadyTriggered) return;

    sessionStorage.setItem("importTriggered", "1");
    setStatus("importing");

    fetch("/api/internal/import-games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
      .then((r) => r.json())
      .then((data: { puzzlesImported?: number }) => {
        const imported = data.puzzlesImported ?? 0;
        setNewCount(imported);
        setThisWeek((w) => w + imported);
        setTotal((t) => t + imported);
        setStatus("done");
      })
      .catch(() => setStatus("error"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hasLinkedAccount) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-800">
          Your Imported Puzzles
        </p>
        {status === "importing" && (
          <span className="text-xs text-blue-500 animate-pulse">Importing…</span>
        )}
        {status === "done" && newCount > 0 && (
          <span className="text-xs text-green-600 font-medium">
            +{newCount} new
          </span>
        )}
      </div>

      <div className="flex gap-6 mb-3">
        <div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">
            {thisWeek}
          </p>
          <p className="text-xs text-gray-400">this week</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">
            {total}
          </p>
          <p className="text-xs text-gray-400">all time</p>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Puzzles generated from blunders in your linked games.{" "}
        {total === 0 && status !== "importing" && (
          <span>Import runs automatically when you connect an account.</span>
        )}
      </p>

      {total > 0 && (
        <Link
          href="/puzzles?source=user_import"
          className="inline-flex items-center gap-1 text-xs font-medium bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
        >
          Practice your mistakes →
        </Link>
      )}

      {status === "error" && (
        <p className="text-xs text-red-500 mt-2">
          Import failed. Try again later.
        </p>
      )}
    </div>
  );
}
