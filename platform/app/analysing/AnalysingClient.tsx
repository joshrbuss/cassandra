"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  platform: string;
  libraryPuzzleId: string | null;
  libraryPuzzleRating: number | null;
}

type Step = {
  label: string;
  status: "pending" | "active" | "done";
};

/** Foreground limits: analyse up to this many games initially */
const INITIAL_GAME_LIMIT = 10;
/** If fewer than this many puzzles after INITIAL_GAME_LIMIT, extend to MAX_FOREGROUND_GAMES */
const PUZZLE_THRESHOLD = 20;
/** Absolute max games to analyse in the foreground */
const MAX_FOREGROUND_GAMES = 20;

export default function AnalysingClient({ platform, libraryPuzzleId, libraryPuzzleRating }: Props) {
  const router = useRouter();
  const hasStarted = useRef(false);

  const [steps, setSteps] = useState<Step[]>([
    { label: `Connected to ${platform}`, status: "done" },
    { label: "Fetching recent games...", status: "active" },
    { label: "Analysing games with Stockfish...", status: "pending" },
    { label: "Building puzzles from your blunders...", status: "pending" },
  ]);

  const [gamesQueued, setGamesQueued] = useState(0);
  const [gamesAnalysed, setGamesAnalysed] = useState(0);
  const [puzzlesTotal, setPuzzlesTotal] = useState(0);
  const [firstPuzzleDest, setFirstPuzzleDest] = useState("/unlearned");
  const [firstPuzzleReady, setFirstPuzzleReady] = useState(false);
  const [noPuzzles, setNoPuzzles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysingPhase, setAnalysingPhase] = useState(false); // true = show puzzle while analysing

  const doneCount = steps.filter((s) => s.status === "done").length;
  const progress = firstPuzzleReady || noPuzzles ? 100 : Math.round((doneCount / steps.length) * 80);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    runPipeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runPipeline() {
    try {
      // ── Phase 1: Fetch games (fast) ──
      const res = await fetch("/api/users/me/import", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        gamesQueued?: number;
        gamesTotal?: number;
        firstPuzzleId?: string | null;
      };

      if (!res.ok || !data.ok) {
        setError("Import failed. Please try again from the dashboard.");
        return;
      }

      const totalGames = data.gamesTotal ?? data.gamesQueued ?? 0;
      setGamesQueued(totalGames);

      // Step 2 done: fetched games
      setSteps((prev) => prev.map((s, i) =>
        i === 1 ? { ...s, label: `Found ${totalGames} games to analyse`, status: "done" } : s
      ));

      if (totalGames === 0) {
        // Check if user already has puzzles from a previous sync
        if (data.firstPuzzleId) {
          setFirstPuzzleDest(`/unlearned/${data.firstPuzzleId}`);
          setFirstPuzzleReady(true);
          setSteps((prev) => prev.map((s, i) =>
            i >= 2 ? { ...s, status: "done", label: i === 2 ? "No new games to analyse" : "Up to date" } : s
          ));
        } else {
          setNoPuzzles(true);
        }
        return;
      }

      await delay(500);

      // ── Phase 2: Analyse games one at a time ──
      setAnalysingPhase(true);
      setSteps((prev) => prev.map((s, i) =>
        i === 2 ? { ...s, status: "active", label: `Analysing game 1 of ${totalGames}...` } : s
      ));

      let analysed = 0;
      let totalPuzzles = 0;
      let firstPuzzleId: string | null = data.firstPuzzleId ?? null;
      let allDone = false;

      let consecutiveErrors = 0;
      while (true) {
        // ── Foreground limits ──
        // Stop once we have enough puzzles
        if (totalPuzzles >= PUZZLE_THRESHOLD) {
          console.log(`[analysing] Reached ${totalPuzzles} puzzles — stopping foreground analysis`);
          break;
        }
        // After INITIAL_GAME_LIMIT games, only continue if we haven't hit the puzzle threshold
        if (analysed >= INITIAL_GAME_LIMIT && totalPuzzles >= PUZZLE_THRESHOLD) {
          break;
        }
        // Hard cap: never analyse more than MAX_FOREGROUND_GAMES in the foreground
        if (analysed >= MAX_FOREGROUND_GAMES) {
          console.log(`[analysing] Reached ${MAX_FOREGROUND_GAMES} games — stopping foreground analysis`);
          break;
        }

        let analyseData: {
          done: boolean;
          gameId: string | null;
          puzzlesFound: number;
          remaining: number;
          firstPuzzleId: string | null;
        };

        try {
          const analyseRes = await fetch("/api/puzzles/analyse-game", { method: "POST" });
          if (!analyseRes.ok) {
            console.error(`[analysing] analyse-game returned ${analyseRes.status}`);
            consecutiveErrors++;
            if (consecutiveErrors >= 3) {
              console.error("[analysing] 3 consecutive failures, stopping analysis");
              break;
            }
            await delay(2000);
            continue;
          }
          analyseData = await analyseRes.json();
          consecutiveErrors = 0;
        } catch (fetchErr) {
          console.error("[analysing] analyse-game fetch error:", fetchErr);
          consecutiveErrors++;
          if (consecutiveErrors >= 3) break;
          await delay(2000);
          continue;
        }

        if (analyseData.gameId) {
          analysed++;
          totalPuzzles += analyseData.puzzlesFound;
          setGamesAnalysed(analysed);
          setPuzzlesTotal(totalPuzzles);

          if (analyseData.firstPuzzleId) {
            firstPuzzleId = analyseData.firstPuzzleId;
          }

          // Update step label with progress
          const remaining = analyseData.remaining;
          if (remaining > 0) {
            const displayTotal = Math.min(totalGames, MAX_FOREGROUND_GAMES);
            setSteps((prev) => prev.map((s, i) =>
              i === 2 ? { ...s, label: `Analysing game ${analysed + 1} of ${displayTotal}... (${totalPuzzles} puzzles found)` } : s
            ));
          }
        }

        if (analyseData.done || !analyseData.gameId) {
          allDone = true;
          if (analyseData.firstPuzzleId) firstPuzzleId = analyseData.firstPuzzleId;
          break;
        }
      }

      // Step 3 done
      setAnalysingPhase(false);
      const remainingGamesMsg = !allDone ? ` — remaining games will finish in the background` : "";
      setSteps((prev) => prev.map((s, i) =>
        i === 2 ? { ...s, label: `Analysed ${analysed} games${remainingGamesMsg}`, status: "done" } : s
      ));

      await delay(400);

      // Step 4: puzzles built
      setSteps((prev) => prev.map((s, i) =>
        i === 3 ? { ...s, status: "active" } : s
      ));
      await delay(500);

      const puzzleMsg = totalPuzzles >= PUZZLE_THRESHOLD
        ? `Your first ${totalPuzzles} puzzles are ready!`
        : `Built ${totalPuzzles} puzzles from your games`;
      setSteps((prev) => prev.map((s, i) =>
        i === 3 ? { ...s, label: puzzleMsg, status: "done" } : s
      ));

      await delay(500);

      if (totalPuzzles === 0 && !firstPuzzleId) {
        setNoPuzzles(true);
        return;
      }

      const dest = firstPuzzleId ? `/unlearned/${firstPuzzleId}` : "/unlearned";
      setFirstPuzzleDest(dest);
      setFirstPuzzleReady(true);

      await delay(2000);
      router.push(dest);
    } catch {
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="max-w-md w-full">
      {/* Logo */}
      <div className="text-center mb-10">
        <span className="w-10 h-10 rounded-lg bg-[#c8942a] inline-flex items-center justify-center text-white font-bold text-lg mb-4">
          C
        </span>
        <h1 className="text-xl font-bold text-white">
          {noPuzzles ? "No puzzles found" : "Analysing your games..."}
        </h1>
        {noPuzzles && (
          <p className="text-gray-400 text-sm mt-2">
            Cassandra couldn&apos;t find any recent games. Try out one of these modes instead:
          </p>
        )}
      </div>

      {/* No-puzzles fallback */}
      {noPuzzles ? (
        <>
          <div className="space-y-3 mb-8">
            <Link
              href="/prophecy"
              className="flex items-center justify-between bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 hover:bg-[#222] transition-colors"
            >
              <div>
                <p className="font-semibold text-[#c8942a]">Cassandra&apos;s Prophecy</p>
                <p className="text-xs text-gray-400 mt-0.5">Daily brilliant move challenge</p>
              </div>
              <span className="text-[#c8942a] text-sm ml-3">&rarr;</span>
            </Link>
            <Link
              href="/echo"
              className="flex items-center justify-between bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 hover:bg-[#222] transition-colors"
            >
              <div>
                <p className="font-semibold text-white">The Echo</p>
                <p className="text-xs text-gray-400 mt-0.5">Replay positions and explore alternatives</p>
              </div>
              <span className="text-gray-500 text-sm ml-3">&rarr;</span>
            </Link>
            <Link
              href="/scales"
              className="flex items-center justify-between bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 hover:bg-[#222] transition-colors opacity-60"
            >
              <div>
                <p className="font-semibold text-white">The Scales</p>
                <p className="text-xs text-gray-400 mt-0.5">Rank moves by strength — coming soon</p>
              </div>
              <span className="text-[9px] font-bold text-gray-500 bg-[#2a2a2a] px-2 py-0.5 rounded-full uppercase ml-3">
                Soon
              </span>
            </Link>
          </div>
          <Link href="/home" className="block text-center text-[#c8942a] text-sm hover:underline">
            Go to your home &rarr;
          </Link>
        </>
      ) : analysingPhase && libraryPuzzleId ? (
        /* ── Phase 2: Show puzzle while analysing ── */
        <>
          {/* Compact progress indicator at top */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400 animate-pulse">
                Cassandra is analysing your games... ({gamesAnalysed}/{gamesQueued})
              </p>
              <p className="text-xs text-[#c8942a] font-medium tabular-nums">
                {puzzlesTotal} puzzle{puzzlesTotal !== 1 ? "s" : ""} found
              </p>
            </div>
            <div className="w-full bg-[#333] rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-[#c8942a] rounded-full transition-all duration-700 ease-out"
                style={{ width: gamesQueued > 0 ? `${Math.round((gamesAnalysed / gamesQueued) * 100)}%` : "0%" }}
              />
            </div>
          </div>

          {/* Library puzzle card */}
          <div className="text-center mb-4">
            <p className="text-sm text-gray-400">While you wait, try this puzzle</p>
          </div>
          <Link
            href={`/puzzles/${libraryPuzzleId}`}
            className="flex items-center justify-between bg-[#1a1a1a] border border-[#c8942a]/30 rounded-xl p-6 hover:bg-[#1a1a1a]/80 hover:border-[#c8942a] transition-colors mb-4"
          >
            <div>
              <p className="font-semibold text-white mb-1">Solve a puzzle</p>
              <p className="text-xs text-gray-400">
                Rating {libraryPuzzleRating ?? "~1200"} — matched to your level
              </p>
            </div>
            <span className="text-[#c8942a] font-bold text-2xl ml-4">&rarr;</span>
          </Link>

          {/* Ready banner */}
          {firstPuzzleReady && (
            <Link
              href={firstPuzzleDest}
              className="block w-full h-12 rounded-full bg-[#c8942a] text-white font-semibold hover:bg-[#b5852a] transition-colors shadow-lg shadow-[#c8942a]/20 text-sm text-center leading-[3rem]"
            >
              Your personal puzzles are ready! &rarr;
            </Link>
          )}

          {error && (
            <div className="text-center mt-6">
              <p className="text-red-400 text-sm mb-3">{error}</p>
              <a href="/home" className="text-[#c8942a] text-sm hover:underline">Go to dashboard</a>
            </div>
          )}
        </>
      ) : (
        /* ── Phase 1 / completion / no library puzzle ── */
        <>
          {/* Progress bar */}
          <div className="w-full bg-[#1a1a1a] rounded-full h-2 mb-8 overflow-hidden">
            <div
              className="h-full bg-[#c8942a] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Steps */}
          <div className="space-y-4 mb-6">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <StepIcon status={step.status} />
                <span
                  className={`text-sm ${
                    step.status === "done"
                      ? "text-white"
                      : step.status === "active"
                      ? "text-gray-300"
                      : "text-gray-600"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {/* Running totals during analysis */}
          {gamesAnalysed > 0 && !firstPuzzleReady && (
            <div className="bg-[#1a1a1a] rounded-xl p-4 mb-6 text-center">
              <p className="text-[#c8942a] font-bold text-lg tabular-nums">{puzzlesTotal}</p>
              <p className="text-xs text-gray-500">puzzles found so far</p>
            </div>
          )}

          {/* CTA when done */}
          {firstPuzzleReady && (
            <button
              onClick={() => router.push(firstPuzzleDest)}
              className="w-full h-12 rounded-full bg-[#c8942a] text-white font-semibold hover:bg-[#b5852a] transition-colors shadow-lg shadow-[#c8942a]/20 text-sm"
            >
              Your first puzzle is ready &rarr;
            </button>
          )}

          {error && (
            <div className="text-center mt-6">
              <p className="text-red-400 text-sm mb-3">{error}</p>
              <a href="/home" className="text-[#c8942a] text-sm hover:underline">
                Go to dashboard
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StepIcon({ status }: { status: "pending" | "active" | "done" }) {
  if (status === "done") {
    return (
      <span className="w-6 h-6 rounded-full bg-[#c8942a]/20 flex items-center justify-center text-[#c8942a] text-xs shrink-0">
        &#10003;
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="w-6 h-6 rounded-full border-2 border-[#c8942a] flex items-center justify-center shrink-0">
        <span className="w-2 h-2 rounded-full bg-[#c8942a] animate-pulse" />
      </span>
    );
  }
  return (
    <span className="w-6 h-6 rounded-full border border-[#333] shrink-0" />
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
