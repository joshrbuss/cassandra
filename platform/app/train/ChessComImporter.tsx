"use client";

/**
 * Handles client-side Chess.com game analysis:
 *  1. Fetches PGNs directly from api.chess.com (CORS-open public API)
 *  2. Runs Stockfish WASM (depth 8) via stockfishBrowser.ts
 *  3. Extracts blunder positions as puzzle candidates
 *  4. POSTs candidates to /api/puzzles/import in batches
 *  5. Triggers a page refresh when done so /train redirects to the first puzzle
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { extractBlundersFromPgn, type ClientPuzzle } from "@/lib/chess-client/extractBlundersFromPgn";
import { terminateEngine } from "@/lib/chess-client/stockfishBrowser";

const MAX_GAMES = 30;

interface Props {
  chessComUsername: string;
}

type State = "idle" | "fetching" | "analyzing" | "done" | "error";

export default function ChessComImporter({ chessComUsername }: Props) {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [puzzleCount, setPuzzleCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const run = useCallback(async () => {
    setState("fetching");
    let totalImported = 0;

    try {
      // ── 1. Fetch Chess.com PGNs ──────────────────────────────────────────────
      const pgns: string[] = [];
      const now = new Date();

      for (let i = 0; i < 3 && pgns.length < MAX_GAMES; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const url = `https://api.chess.com/pub/player/${encodeURIComponent(chessComUsername)}/games/${year}/${month}`;

        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const data = await res.json();
          const games = (data.games ?? []) as Array<{ pgn?: string; rated?: boolean }>;
          for (const g of [...games].reverse()) {
            if (g.rated && g.pgn) {
              pgns.push(g.pgn);
              if (pgns.length >= MAX_GAMES) break;
            }
          }
        } catch {
          // skip failed months
        }
      }

      if (pgns.length === 0) {
        setState("done");
        return;
      }

      // ── 2. Analyse each game with Stockfish WASM ─────────────────────────────
      setState("analyzing");
      setProgress({ current: 0, total: pgns.length });
      const batch: ClientPuzzle[] = [];

      for (let i = 0; i < pgns.length; i++) {
        setProgress({ current: i + 1, total: pgns.length });

        try {
          const puzzles = await extractBlundersFromPgn(pgns[i]);
          batch.push(...puzzles);
        } catch {
          // skip failed games
        }

        // Save in batches of 5 games, and always at the end
        if (batch.length > 0 && (i % 5 === 4 || i === pgns.length - 1)) {
          try {
            const res = await fetch("/api/puzzles/import", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ puzzles: batch }),
            });
            if (res.ok) {
              const data = await res.json();
              totalImported += data.imported ?? 0;
              setPuzzleCount(totalImported);
            }
          } catch {
            // continue even if a batch save fails
          }
          batch.length = 0;
        }
      }

      // Terminate the worker to free ~7MB of WASM memory
      terminateEngine();

      setState("done");
      setPuzzleCount(totalImported);

      if (totalImported > 0) {
        setTimeout(() => router.refresh(), 1200);
      } else {
        // No puzzles found — fall back to curated library puzzles
        setTimeout(() => router.push("/train/library"), 1500);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Analysis failed");
      setState("error");
    }
  }, [chessComUsername, router]);

  if (state === "idle") {
    return (
      <button
        onClick={run}
        className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
      >
        Analyse Chess.com games
      </button>
    );
  }

  if (state === "fetching") {
    return (
      <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-6 py-3 rounded-xl font-semibold">
        <Spinner />
        Fetching Chess.com games…
      </div>
    );
  }

  if (state === "analyzing") {
    const pct = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
    return (
      <div className="space-y-2 w-full">
        <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-6 py-3 rounded-xl font-semibold">
          <Spinner />
          Analysing game {progress.current} of {progress.total}…
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        {puzzleCount > 0 && (
          <p className="text-xs text-gray-500">
            {puzzleCount} puzzle{puzzleCount !== 1 ? "s" : ""} found so far
          </p>
        )}
      </div>
    );
  }

  if (state === "done") {
    if (puzzleCount === 0) {
      return (
        <p className="text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm">
          No blunders found in recent games — loading a curated puzzle for your
          level…
        </p>
      );
    }
    return (
      <p className="text-green-800 bg-green-50 border border-green-200 rounded-xl px-4 py-3 font-semibold">
        {puzzleCount} Chess.com puzzle{puzzleCount !== 1 ? "s" : ""} extracted —
        loading your first one…
      </p>
    );
  }

  // error
  return (
    <div className="space-y-3">
      <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
        {errorMsg || "Something went wrong analysing Chess.com games."}
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

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}
