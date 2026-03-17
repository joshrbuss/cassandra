"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { extractBlundersFromPgn, type ClientPuzzle } from "@/lib/chess-client/extractBlundersFromPgn";
import { terminateEngine } from "@/lib/chess-client/stockfishBrowser";

interface Props {
  platform: string;
  username: string;
  libraryPuzzleId: string | null;
  libraryPuzzleRating: number | null;
}

type Step = { label: string; status: "pending" | "active" | "done" };

const MAX_GAMES = 30;
const READY_THRESHOLD = 5;

export default function AnalysingClient({ platform, username, libraryPuzzleId, libraryPuzzleRating }: Props) {
  const router = useRouter();
  const hasStarted = useRef(false);
  const [steps, setSteps] = useState<Step[]>([
    { label: `Connected to ${platform}`, status: "done" },
    { label: "Fetching recent games...", status: "active" },
    { label: "Analysing games with Stockfish...", status: "pending" },
    { label: "Building puzzles from your blunders...", status: "pending" },
  ]);
  const [gamesTotal, setGamesTotal] = useState(0);
  const [gamesAnalysed, setGamesAnalysed] = useState(0);
  const [puzzlesTotal, setPuzzlesTotal] = useState(0);
  const [firstPuzzleDest, setFirstPuzzleDest] = useState("/unlearned");
  const [firstPuzzleReady, setFirstPuzzleReady] = useState(false);
  const [noPuzzles, setNoPuzzles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysingPhase, setAnalysingPhase] = useState(false);
  const doneCount = steps.filter((s) => s.status === "done").length;
  const progress = firstPuzzleReady || noPuzzles ? 100 : Math.round((doneCount / steps.length) * 80);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    runPipeline();
  }, []);

  async function runPipeline() {
    try {
      const pgns: string[] = [];
      const now = new Date();
      for (let i = 0; i < 6 && pgns.length < MAX_GAMES; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        try {
          const res = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/${year}/${month}`);
          if (!res.ok) continue;
          const data = await res.json();
          const games = (data.games ?? []) as Array<{ pgn?: string; rated?: boolean }>;
          for (const g of [...games].reverse()) {
            if (g.pgn) { pgns.push(g.pgn); if (pgns.length >= MAX_GAMES) break; }
          }
        } catch { }
      }

      const total = pgns.length;
      setGamesTotal(total);
      setSteps((prev) => prev.map((s, i) => i === 1 ? { ...s, label: `Found ${total} games to analyse`, status: "done" } : s));
      if (total === 0) { setNoPuzzles(true); return; }

      await new Promise(r => setTimeout(r, 400));
      setAnalysingPhase(true);
      setSteps((prev) => prev.map((s, i) => i === 2 ? { ...s, status: "active", label: `Analysing game 1 of ${total}...` } : s));

      let analysed = 0, totalPuzzles = 0;
      let firstPuzzleId: string | null = null;
      let readyShown = false;
      const batch: ClientPuzzle[] = [];

      for (let i = 0; i < pgns.length; i++) {
        setGamesAnalysed(i + 1);
        setSteps((prev) => prev.map((s, idx) => idx === 2 ? { ...s, label: `Analysing game ${i + 1} of ${total}... (${totalPuzzles} puzzles found)` } : s));
        try { const puzzles = await extractBlundersFromPgn(pgns[i], username); batch.push(...puzzles); } catch { }
        analysed++;
        if (batch.length > 0 && (i % 5 === 4 || i === pgns.length - 1)) {
          try {
            const res = await fetch("/api/puzzles/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ puzzles: batch }) });
            if (res.ok) {
              const data = await res.json();
              totalPuzzles += data.imported ?? 0;
              if (!firstPuzzleId && data.firstPuzzleId) firstPuzzleId = data.firstPuzzleId;
              setPuzzlesTotal(totalPuzzles);
            }
          } catch { }
          batch.length = 0;
        }
        if (totalPuzzles >= READY_THRESHOLD && firstPuzzleId && !readyShown) {
          readyShown = true;
          setFirstPuzzleDest(`/unlearned/${firstPuzzleId}`);
          setFirstPuzzleReady(true);
        }
      }

      terminateEngine();
      setAnalysingPhase(false);
      setSteps((prev) => prev.map((s, i) => i === 2 ? { ...s, label: `Analysed ${analysed} games`, status: "done" } : s));
      await new Promise(r => setTimeout(r, 400));
      setSteps((prev) => prev.map((s, i) => i === 3 ? { ...s, status: "active" } : s));
      await new Promise(r => setTimeout(r, 500));
      setSteps((prev) => prev.map((s, i) => i === 3 ? { ...s, label: `Built ${totalPuzzles} puzzles from your games`, status: "done" } : s));
      await new Promise(r => setTimeout(r, 500));
      if (totalPuzzles === 0 || !firstPuzzleId) { setNoPuzzles(true); return; }
      setFirstPuzzleDest(`/unlearned/${firstPuzzleId}`);
      setFirstPuzzleReady(true);
      await new Promise(r => setTimeout(r, 2000));
      router.push(`/unlearned/${firstPuzzleId}`);
    } catch {
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="max-w-md w-full">
      <div className="text-center mb-10">
        <span className="w-10 h-10 rounded-lg bg-[#c8942a] inline-flex items-center justify-center text-white font-bold text-lg mb-4">C</span>
        <h1 className="text-xl font-bold text-white">{noPuzzles ? "No puzzles found" : "Analysing your games..."}</h1>
        {noPuzzles && <p className="text-gray-400 text-sm mt-2">Cassandra couldn&apos;t find any recent games.</p>}
      </div>
      {noPuzzles ? (
        <>
          <div className="space-y-3 mb-8">
            <Link href="/prophecy" className="flex items-center justify-between bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 hover:bg-[#222] transition-colors">
              <div><p className="font-semibold text-[#c8942a]">Cassandra&apos;s Prophecy</p><p className="text-xs text-gray-400 mt-0.5">Daily brilliant move challenge</p></div>
              <span className="text-[#c8942a] text-sm ml-3">&rarr;</span>
            </Link>
            <Link href="/echo" className="flex items-center justify-between bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 hover:bg-[#222] transition-colors">
              <div><p className="font-semibold text-white">The Echo</p><p className="text-xs text-gray-400 mt-0.5">Replay positions and explore alternatives</p></div>
              <span className="text-gray-500 text-sm ml-3">&rarr;</span>
            </Link>
          </div>
          <Link href="/home" className="block text-center text-[#c8942a] text-sm hover:underline">Go to your home &rarr;</Link>
        </>
      ) : analysingPhase && libraryPuzzleId ? (
        <>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400 animate-pulse">Analysing your games... ({gamesAnalysed}/{gamesTotal})</p>
              <p className="text-xs text-[#c8942a] font-medium tabular-nums">{puzzlesTotal} puzzle{puzzlesTotal !== 1 ? "s" : ""} found</p>
            </div>
            <div className="w-full bg-[#333] rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-[#c8942a] rounded-full transition-all duration-700 ease-out" style={{ width: gamesTotal > 0 ? `${Math.round((gamesAnalysed / gamesTotal) * 100)}%` : "0%" }} />
            </div>
          </div>
          <div className="text-center mb-4"><p className="text-sm text-gray-400">While you wait, try this puzzle</p></div>
          <Link href={`/puzzles/${libraryPuzzleId}`} className="flex items-center justify-between bg-[#1a1a1a] border border-[#c8942a]/30 rounded-xl p-6 hover:border-[#c8942a] transition-colors mb-4">
            <div><p className="font-semibold text-white mb-1">Solve a puzzle</p><p className="text-xs text-gray-400">Rating {libraryPuzzleRating ?? "~1200"} — matched to your level</p></div>
            <span className="text-[#c8942a] font-bold text-2xl ml-4">&rarr;</span>
          </Link>
          {firstPuzzleReady && <Link href={firstPuzzleDest} className="block w-full h-12 rounded-full bg-[#c8942a] text-white font-semibold hover:bg-[#b5852a] transition-colors text-sm text-center leading-[3rem]">Your personal puzzles are ready! &rarr;</Link>}
          {error && <div className="text-center mt-6"><p className="text-red-400 text-sm mb-3">{error}</p><a href="/home" className="text-[#c8942a] text-sm hover:underline">Go to dashboard</a></div>}
        </>
      ) : (
        <>
          <div className="w-full bg-[#1a1a1a] rounded-full h-2 mb-8 overflow-hidden">
            <div className="h-full bg-[#c8942a] rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
          </div>
          <div className="space-y-4 mb-6">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <StepIcon status={step.status} />
                <span className={`text-sm ${step.status === "done" ? "text-white" : step.status === "active" ? "text-gray-300" : "text-gray-600"}`}>{step.label}</span>
              </div>
            ))}
          </div>
          {firstPuzzleReady && <button onClick={() => router.push(firstPuzzleDest)} className="w-full h-12 rounded-full bg-[#c8942a] text-white font-semibold hover:bg-[#b5852a] transition-colors text-sm">Your first puzzle is ready &rarr;</button>}
          {error && <div className="text-center mt-6"><p className="text-red-400 text-sm mb-3">{error}</p><a href="/home" className="text-[#c8942a] text-sm hover:underline">Go to dashboard</a></div>}
        </>
      )}
    </div>
  );
}

function StepIcon({ status }: { status: "pending" | "active" | "done" }) {
  if (status === "done") return <span className="w-6 h-6 rounded-full bg-[#c8942a]/20 flex items-center justify-center text-[#c8942a] text-xs shrink-0">&#10003;</span>;
  if (status === "active") return <span className="w-6 h-6 rounded-full border-2 border-[#c8942a] flex items-center justify-center shrink-0"><span className="w-2 h-2 rounded-full bg-[#c8942a] animate-pulse" /></span>;
  return <span className="w-6 h-6 rounded-full border border-[#333] shrink-0" />;
}
