"use client";

import { useState, useRef, useCallback } from "react";
import { Chess } from "chess.js";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BoardSkeleton } from "@/components/Skeleton";
import type { PieceDropHandlerArgs } from "@/components/ChessBoardWrapper";
import {
  analyzePositionMultiPV,
  terminateEngine,
} from "@/lib/chess-client/stockfishBrowser";
import type { EngineResult } from "@/lib/chess-client/stockfishBrowser";

const ChessBoardWrapper = dynamic(() => import("@/components/ChessBoardWrapper"), {
  ssr: false,
  loading: () => <BoardSkeleton />,
});

interface Props {
  puzzleId: string;
  fen: string;
  rating: number;
}

interface SlotData {
  uci: string;
  san: string;
  from: string;
  to: string;
}

type Phase = "picking" | "evaluating" | "results";

export default function ScalesShell({ puzzleId, fen, rating }: Props) {
  const boardOrientation: "white" | "black" =
    fen.split(" ")[1] === "b" ? "black" : "white";

  const chessRef = useRef(new Chess(fen));

  const [slots, setSlots] = useState<(SlotData | null)[]>([null, null, null]);
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("picking");
  const [engineMoves, setEngineMoves] = useState<EngineResult[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [lastMoveSquares, setLastMoveSquares] = useState<Record<string, React.CSSProperties>>({});

  const allFilled = slots.every((s) => s !== null);

  /** Try to place a move into the active slot */
  const placeMove = useCallback(
    (from: string, to: string): boolean => {
      if (phase !== "picking") return false;
      if (activeSlot === -1) return false;
      if (slots[activeSlot] !== null) return false;

      const chess = new Chess(fen);
      const moveResult = chess.move({ from, to, promotion: "q" });
      if (!moveResult) return false;

      const uci = `${from}${to}${moveResult.promotion && moveResult.promotion !== "q" ? "" : moveResult.promotion ?? ""}`;
      const san = moveResult.san;

      // Check for duplicate move in another slot
      if (slots.some((s) => s && s.uci === `${from}${to}${moveResult.promotion ?? ""}`)) {
        return false;
      }

      const newSlots = [...slots];
      newSlots[activeSlot] = { uci: `${from}${to}${moveResult.promotion ?? ""}`, san, from, to };
      setSlots(newSlots);
      setSelectedSquare(null);
      setLastMoveSquares({
        [from]: { backgroundColor: "rgba(200, 148, 42, 0.4)" },
        [to]: { backgroundColor: "rgba(200, 148, 42, 0.4)" },
      });

      // Auto-advance to next empty slot
      const nextEmpty = newSlots.findIndex((s, i) => i > activeSlot && s === null);
      if (nextEmpty !== -1) {
        setActiveSlot(nextEmpty);
      } else {
        const firstEmpty = newSlots.findIndex((s) => s === null);
        setActiveSlot(firstEmpty !== -1 ? firstEmpty : -1);
      }

      return true;
    },
    [fen, phase, activeSlot, slots]
  );

  function handleDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (!targetSquare) return false;
    return placeMove(sourceSquare, targetSquare);
  }

  function handleSquareClick({ square }: { piece: unknown; square: string }) {
    if (phase !== "picking") return;

    if (selectedSquare) {
      const success = placeMove(selectedSquare, square);
      if (!success) {
        setSelectedSquare(null);
        // Try selecting the clicked square instead
        const chess = new Chess(fen);
        const moves = chess.moves({ square: square as never, verbose: true });
        if (moves.length > 0) setSelectedSquare(square);
      } else {
        setSelectedSquare(null);
      }
    } else {
      const chess = new Chess(fen);
      const moves = chess.moves({ square: square as never, verbose: true });
      if (moves.length > 0) setSelectedSquare(square);
    }
  }

  function getClickStyles(): Record<string, React.CSSProperties> {
    if (!selectedSquare || phase !== "picking") return {};
    const chess = new Chess(fen);
    const styles: Record<string, React.CSSProperties> = {
      [selectedSquare]: { backgroundColor: "rgba(255, 200, 0, 0.5)" },
    };
    const moves = chess.moves({ square: selectedSquare as never, verbose: true });
    for (const m of moves) {
      styles[m.to] = {
        background: "radial-gradient(circle, rgba(0,0,0,0.2) 25%, transparent 25%)",
        borderRadius: "50%",
      };
    }
    return styles;
  }

  function clearSlot(idx: number) {
    if (phase !== "picking") return;
    const newSlots = [...slots];
    newSlots[idx] = null;
    setSlots(newSlots);
    setActiveSlot(idx);
    setLastMoveSquares({});
  }

  async function handleSubmit() {
    if (!allFilled) return;
    setPhase("evaluating");

    const results = await analyzePositionMultiPV(fen, 3);

    // Quality filters — reject positions that aren't interesting for ranking
    const hasMate = results.some((r) => Math.abs(r.cp) >= 20000);
    const hasBlunder = results.some((r) => r.cp < 0);
    const topGap = results.length >= 2 ? results[0].cp - results[1].cp : 9999;
    const spread = results.length >= 3 ? results[0].cp - results[2].cp : 0;

    const reject =
      results.length < 3 ||
      hasMate ||
      hasBlunder ||       // all 3 should be positive (good moves)
      topGap > 150 ||     // top move too obvious
      spread < 30;        // all moves basically equal

    if (reject) {
      console.warn(
        `[Scales] Position rejected: moves=${results.length} hasMate=${hasMate} hasBlunder=${hasBlunder} topGap=${topGap}cp spread=${spread}cp — reloading`
      );
      terminateEngine();
      window.location.reload();
      return;
    }

    terminateEngine();
    setEngineMoves(results);

    // Score: compare user ranking to engine ranking
    const userMoves = slots.map((s) => s!.uci);
    const engineOrder = results.map((r) => r.move);

    let pts = 0;
    for (let i = 0; i < 3; i++) {
      if (userMoves[i] === engineOrder[i]) {
        pts++;
      }
    }
    setScore(pts);
    setPhase("results");
  }

  function formatCp(cp: number): string {
    if (Math.abs(cp) >= 20000) return cp > 0 ? "+M" : "-M";
    if (cp >= 0) return `+${(cp / 100).toFixed(1)}`;
    return (cp / 100).toFixed(1);
  }

  function getMoveLabel(uci: string): string {
    try {
      const chess = new Chess(fen);
      const result = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4] || undefined,
      });
      return result ? result.san : uci;
    } catch {
      return uci;
    }
  }

  const scoreLabels = [
    "All wrong — keep training!",
    "1 correct — getting there",
    "2 correct — strong evaluation!",
    "Perfect — you see like an engine!",
  ];

  const scoreColors = [
    "text-red-400",
    "text-orange-400",
    "text-blue-400",
    "text-[#c8942a]",
  ];

  return (
    <div className="w-full min-h-screen bg-[#0e0e0e]">
      {/* Nav */}
      <nav className="bg-[#0e0e0e] border-b border-[#1a1a1a] px-4 py-3 flex items-center justify-between">
        <Link
          href="/home"
          className="text-sm font-medium text-[#c8942a] hover:text-[#e0ad3a] transition-colors"
        >
          &larr; Home
        </Link>
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-600">
          The Scales
        </span>
        <span className="w-16" />
      </nav>

      <div className="max-w-lg mx-auto px-4 pt-4 pb-6">
        {/* Instruction / Results panel */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-5 py-4 mb-4">
          {phase === "results" && score !== null ? (
            <>
              <p className={`font-bold text-lg ${scoreColors[score]}`}>
                {score}/3 — {scoreLabels[score]}
              </p>

              {/* Engine ranking reveal */}
              <div className="mt-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Stockfish ranking
                </p>
                {engineMoves.map((em, i) => {
                  const san = getMoveLabel(em.move);
                  const userSlot = slots.findIndex((s) => s?.uci === em.move);
                  const isCorrectPosition = userSlot === i;
                  return (
                    <div
                      key={em.move}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                        isCorrectPosition
                          ? "bg-[#c8942a]/15 border border-[#c8942a]/30"
                          : "bg-[#0e0e0e] border border-[#2a2a2a]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 w-6">
                          {i + 1}.
                        </span>
                        <span className="text-white font-semibold text-sm">
                          {san}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-gray-400">
                        {formatCp(em.cp)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Your ranking */}
              <div className="mt-4 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Your ranking
                </p>
                {slots.map((s, i) => {
                  if (!s) return null;
                  const engineIdx = engineMoves.findIndex(
                    (em) => em.move === s.uci
                  );
                  const isCorrect = engineIdx === i;
                  const isInTop3 = engineIdx !== -1;
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                        isCorrect
                          ? "bg-green-500/10 border border-green-500/30"
                          : isInTop3
                          ? "bg-yellow-500/10 border border-yellow-500/30"
                          : "bg-red-500/10 border border-red-500/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 w-6">
                          {i + 1}.
                        </span>
                        <span className="text-white font-semibold text-sm">
                          {s.san}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {isCorrect
                          ? "Correct"
                          : isInTop3
                          ? `Engine: #${engineIdx + 1}`
                          : "Not in top 3"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-4">
                <Link
                  href="/scales"
                  className="flex-1 text-center bg-[#c8942a] text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#b5852a] transition-colors"
                >
                  Next position
                </Link>
                <Link
                  href="/home"
                  className="flex-1 text-center bg-[#2a2a2a] text-gray-400 px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#333] hover:text-gray-300 transition-colors"
                >
                  Done
                </Link>
              </div>
            </>
          ) : phase === "evaluating" ? (
            <div className="text-center py-4">
              <div className="inline-block w-6 h-6 border-2 border-[#c8942a] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-gray-400 text-sm">
                Stockfish is evaluating the position...
              </p>
            </div>
          ) : (
            <>
              <p className="text-white font-bold text-lg">
                Rank the top 3 moves
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Click a slot to activate it, then make a move on the board. Rank
                all 3 from best to worst.
              </p>

              {/* Slots */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {slots.map((slot, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (slot) return; // Can't activate a filled slot, use X to clear
                      setActiveSlot(i);
                      setSelectedSquare(null);
                    }}
                    className={`relative rounded-lg p-3 text-center transition-all ${
                      slot
                        ? "bg-[#0e0e0e] border border-[#2a2a2a]"
                        : activeSlot === i
                        ? "bg-[#c8942a]/15 border-2 border-[#c8942a]"
                        : "bg-[#0e0e0e] border border-[#2a2a2a] hover:border-[#444]"
                    }`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                      {i === 0 ? "1st" : i === 1 ? "2nd" : "3rd"}
                    </p>
                    {slot ? (
                      <>
                        <p className="text-white font-bold text-base">
                          {slot.san}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearSlot(i);
                          }}
                          className="absolute top-1 right-1.5 text-gray-600 hover:text-gray-300 text-xs"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <p
                        className={`text-sm ${
                          activeSlot === i
                            ? "text-[#c8942a] font-medium"
                            : "text-gray-600"
                        }`}
                      >
                        {activeSlot === i ? "Active" : "—"}
                      </p>
                    )}
                  </button>
                ))}
              </div>

              {/* Submit */}
              {allFilled && (
                <button
                  onClick={handleSubmit}
                  className="w-full mt-4 bg-[#c8942a] text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#b5852a] transition-colors"
                >
                  Submit ranking
                </button>
              )}
            </>
          )}
        </div>

        {/* Board label */}
        <div className="mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">
            {phase === "picking"
              ? `Playing as ${boardOrientation} · Rating ${rating}`
              : "Position evaluated"}
          </p>
        </div>

        {/* Board */}
        <div className="w-full aspect-square">
          <ChessBoardWrapper
            position={fen}
            interactive={phase === "picking"}
            onPieceDrop={handleDrop}
            onSquareClick={handleSquareClick}
            boardOrientation={boardOrientation}
            squareStyles={{
              ...lastMoveSquares,
              ...getClickStyles(),
            }}
          />
        </div>

        {/* Tagline */}
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-600">
            The Scales trains your ability to compare moves — the skill that
            separates good players from great ones.
          </p>
        </div>

        {/* Footer */}
        <footer className="mt-10 pt-6 border-t border-[#1a1a1a] text-center">
          <p className="text-xs text-gray-600">
            Cassandra Chess &middot; Puzzles from the Lichess open database (CC0)
          </p>
        </footer>
      </div>
    </div>
  );
}
