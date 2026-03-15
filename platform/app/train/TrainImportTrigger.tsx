"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type State = "idle" | "loading" | "done" | "error";

export default function TrainImportTrigger() {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [count, setCount] = useState(0);

  async function trigger() {
    setState("loading");
    try {
      const res = await fetch("/api/users/me/import", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setCount(data.puzzlesImported ?? 0);
      setState("done");
      // If puzzles were imported, reload the page to redirect to the first one
      if ((data.puzzlesImported ?? 0) > 0) {
        setTimeout(() => router.refresh(), 1000);
      } else {
        // No puzzles found — fall back to curated library puzzles
        setTimeout(() => router.push("/train/library"), 1500);
      }
    } catch {
      setState("error");
    }
  }

  if (state === "idle") {
    return (
      <button
        onClick={trigger}
        className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
      >
        Analyse my games
      </button>
    );
  }

  if (state === "loading") {
    return (
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-6 py-3 rounded-xl font-semibold">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Analysing your games…
        </div>
        <p className="text-sm text-gray-400">This takes 30–60 seconds for 200 games.</p>
      </div>
    );
  }

  if (state === "done" && count === 0) {
    return (
      <p className="text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm">
        No puzzles found in recent games — loading a curated puzzle for your
        level…
      </p>
    );
  }

  if (state === "done") {
    return (
      <p className="text-green-800 bg-green-50 border border-green-200 rounded-xl px-4 py-3 font-semibold">
        {count} puzzle{count !== 1 ? "s" : ""} extracted — loading your first one…
      </p>
    );
  }

  // error
  return (
    <div className="space-y-4">
      <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
        Something went wrong. Please try again.
      </p>
      <button
        onClick={() => setState("idle")}
        className="text-sm text-blue-600 hover:underline"
      >
        Try again
      </button>
    </div>
  );
}
