"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  platform: string;
}

type Step = {
  label: string;
  status: "pending" | "active" | "done";
};

export default function AnalysingClient({ platform }: Props) {
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
      setSteps((prev) => prev.map((s, i) =>
        i === 2 ? { ...s, status: "active", label: `Analysing game 1 of ${totalGames}...` } : s
      ));

      let analysed = 0;
      let totalPuzzles = 0;
      let firstPuzzleId: string | null = data.firstPuzzleId ?? null;

      while (true) {
        const analyseRes = await fetch("/api/puzzles/analyse-game", { method: "POST" });
        const analyseData = (await analyseRes.json()) as {
          done: boolean;
          gameId: string | null;
          puzzlesFound: number;
          remaining: number;
          firstPuzzleId: string | null;
        };

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
            setSteps((prev) => prev.map((s, i) =>
              i === 2 ? { ...s, label: `Analysing game ${analysed + 1} of ${totalGames}... (${totalPuzzles} puzzles found)` } : s
            ));
          }
        }

        if (analyseData.done || !analyseData.gameId) {
          if (analyseData.firstPuzzleId) firstPuzzleId = analyseData.firstPuzzleId;
          break;
        }
      }

      // Step 3 done
      setSteps((prev) => prev.map((s, i) =>
        i === 2 ? { ...s, label: `Analysed ${analysed} games`, status: "done" } : s
      ));

      await delay(400);

      // Step 4: puzzles built
      setSteps((prev) => prev.map((s, i) =>
        i === 3 ? { ...s, status: "active" } : s
      ));
      await delay(500);
      setSteps((prev) => prev.map((s, i) =>
        i === 3 ? { ...s, label: `Built ${totalPuzzles} puzzles from your games`, status: "done" } : s
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
      ) : (
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
