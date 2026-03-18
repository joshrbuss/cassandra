"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Chess } from "chess.js";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BoardSkeleton } from "@/components/Skeleton";
import type { PieceDropHandlerArgs } from "@/components/ChessBoardWrapper";
import {
  analyzePosition,
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
  /** Pre-seeded engine moves from ScalesPosition table */
  engineTop3: EngineResult[];
  /** True if one of the top moves involves a tactical sacrifice */
  hasSacrifice?: boolean;
}

interface SlotData {
  uci: string;
  san: string;
  from: string;
  to: string;
}

type Phase = "picking" | "evaluating" | "results";

export default function ScalesShell({ puzzleId, fen, rating, engineTop3, hasSacrifice }: Props) {
  const boardOrientation: "white" | "black" =
    fen.split(" ")[1] === "b" ? "black" : "white";

  const [slots, setSlots] = useState<(SlotData | null)[]>([null, null, null]);
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("picking");
  const [score, setScore] = useState<number | null>(null);
  const [lastMoveSquares, setLastMoveSquares] = useState<Record<string, React.CSSProperties>>({});
  /** Centipawn eval for each user slot (may differ from engine top 3 if user picked an off-list move) */
  const [userEvals, setUserEvals] = useState<(number | null)[]>([null, null, null]);
  /** Brief explanation for off-list moves (e.g. "allows Nxe5 winning a pawn") */
  const [moveExplanations, setMoveExplanations] = useState<(string | null)[]>([null, null, null]);

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

      const uci = `${from}${to}${moveResult.promotion ?? ""}`;
      const san = moveResult.san;

      // Check for duplicate move in another slot
      if (slots.some((s) => s && s.uci === uci)) return false;

      const newSlots = [...slots];
      newSlots[activeSlot] = { uci, san, from, to };
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
    if (!allFilled || engineTop3.length === 0) return;

    setPhase("evaluating");

    // For each user move, find its eval: either from engine top 3 or run Stockfish
    const userMoves = slots.map((s) => s!.uci);
    const evals: (number | null)[] = [];
    const explanations: (string | null)[] = [];

    for (const uci of userMoves) {
      const engineMatch = engineTop3.find((em) => em.move === uci);
      if (engineMatch) {
        evals.push(engineMatch.cp);
        explanations.push(null);
      } else {
        // Run a quick single-position eval for this move
        const chess = new Chess(fen);
        const moveResult = chess.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci[4] || undefined,
        });
        if (moveResult) {
          const result = await analyzePosition(chess.fen());
          if (result) {
            // Engine returns score from the OPPONENT's perspective after our move
            // So we negate it to get the score from our perspective
            evals.push(-result.cp);
            // Generate a brief explanation based on the opponent's best reply
            const explanation = generateMoveExplanation(
              chess, result.move, -result.cp, engineTop3[0]?.cp ?? 0
            );
            explanations.push(explanation);
          } else {
            evals.push(null);
            explanations.push(null);
          }
        } else {
          evals.push(null);
          explanations.push(null);
        }
      }
    }

    terminateEngine();
    setUserEvals(evals);
    setMoveExplanations(explanations);

    // Score: compare user ranking to engine ranking
    const engineOrder = engineTop3.map((r) => r.move);

    console.log(`[Scales] User ranking: ${userMoves.join(", ")}`);
    console.log(`[Scales] Engine ranking: ${engineOrder.join(", ")}`);

    let pts = 0;
    for (let i = 0; i < Math.min(3, engineOrder.length); i++) {
      if (userMoves[i] === engineOrder[i]) pts++;
    }

    console.log(`[Scales] Score: ${pts}/3`);
    setScore(pts);
    setPhase("results");

    // Credit streak (fire-and-forget)
    fetch("/api/scales/complete", { method: "POST" }).catch(() => {});
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

  /** Convert a UCI PV line to SAN notation for display */
  function pvToSan(pvLine: string | undefined): string | null {
    if (!pvLine) return null;
    try {
      const chess = new Chess(fen);
      const uciMoves = pvLine.trim().split(/\s+/);
      const sanMoves: string[] = [];
      for (const uci of uciMoves) {
        const result = chess.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci[4] || undefined,
        });
        if (!result) break;
        sanMoves.push(result.san);
      }
      return sanMoves.length > 0 ? sanMoves.join(" ") : null;
    } catch {
      return null;
    }
  }

  /**
   * Generate a brief explanation of why a user's move is weaker,
   * based on the opponent's best reply after the user's move.
   */
  function generateMoveExplanation(
    chessAfterUserMove: Chess,
    opponentBestUci: string,
    userMoveCp: number,
    bestMoveCp: number
  ): string | null {
    try {
      const reply = chessAfterUserMove.move({
        from: opponentBestUci.slice(0, 2),
        to: opponentBestUci.slice(2, 4),
        promotion: opponentBestUci[4] || undefined,
      });
      if (!reply) return null;

      const cpLoss = bestMoveCp - userMoveCp;
      const replySan = reply.san;

      // Checkmate threat
      if (chessAfterUserMove.isCheckmate()) {
        return `allows ${replySan} with checkmate`;
      }

      // Check
      if (chessAfterUserMove.isCheck()) {
        if (reply.captured) {
          return `allows ${replySan} winning material with check`;
        }
        return `allows ${replySan} with check`;
      }

      // Material loss
      if (reply.captured) {
        const PIECE_NAME: Record<string, string> = {
          p: "a pawn", n: "a knight", b: "a bishop", r: "a rook", q: "the queen",
        };
        const capName = PIECE_NAME[reply.captured] ?? "material";
        if (cpLoss > 200) {
          return `allows ${replySan} winning ${capName}`;
        }
        return `allows ${replySan} capturing ${capName}`;
      }

      // Positional weakness based on cp loss
      if (cpLoss > 300) {
        return `allows ${replySan} with a strong attack`;
      }
      if (cpLoss > 150) {
        return `allows ${replySan} gaining the initiative`;
      }
      if (cpLoss > 50) {
        return `allows ${replySan} improving the position`;
      }

      return `opponent responds ${replySan}`;
    } catch {
      return null;
    }
  }

  const scoreLabels = [
    "Keep going — try another!",
    "Nice start — getting there!",
    "Strong evaluation!",
    "Perfect read!",
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
          {phase === "evaluating" ? (
            <div className="text-center py-4">
              <div className="inline-block w-6 h-6 border-2 border-[#c8942a] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-gray-400 text-sm">
                Evaluating your moves...
              </p>
            </div>
          ) : phase === "results" && score !== null ? (
            <>
              <p className={`font-bold text-lg ${scoreColors[score]}`}>
                {score}/3 — {scoreLabels[score]}
              </p>

              {/* Engine ranking reveal */}
              <div className="mt-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Stockfish ranking
                </p>
                {engineTop3.map((em, i) => {
                  const san = getMoveLabel(em.move);
                  const pvSan = pvToSan(em.pv);
                  const userSlot = slots.findIndex((s) => s?.uci === em.move);
                  const isCorrectPosition = userSlot === i;
                  return (
                    <div
                      key={em.move}
                      className={`rounded-lg px-3 py-2 ${
                        isCorrectPosition
                          ? "bg-[#c8942a]/15 border border-[#c8942a]/30"
                          : "bg-[#0e0e0e] border border-[#2a2a2a]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
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
                      {pvSan && (
                        <p className="text-[10px] text-gray-500 ml-8 mt-0.5 font-mono">
                          {pvSan}
                        </p>
                      )}
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
                  const engineIdx = engineTop3.findIndex(
                    (em) => em.move === s.uci
                  );
                  const isCorrect = engineIdx === i;
                  const isInTop3 = engineIdx !== -1;
                  const cpVal = userEvals[i];
                  // "Close" if move eval is within 15cp of engine move 3
                  const move3Cp = engineTop3[2]?.cp ?? 0;
                  const isClose = !isInTop3 && cpVal !== null && Math.abs(cpVal - move3Cp) <= 15;
                  const explanation = moveExplanations[i];
                  const showExplanation = !isInTop3 && !isClose && explanation;
                  return (
                    <div
                      key={i}
                      className={`rounded-lg px-3 py-2 ${
                        isCorrect
                          ? "bg-green-500/10 border border-green-500/30"
                          : isInTop3
                          ? "bg-yellow-500/10 border border-yellow-500/30"
                          : isClose
                          ? "bg-amber-500/10 border border-amber-500/30"
                          : "bg-red-500/10 border border-red-500/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-500 w-6">
                            {i + 1}.
                          </span>
                          <span className="text-white font-semibold text-sm">
                            {s.san}
                          </span>
                          {cpVal !== null && (
                            <span className="text-xs font-mono text-gray-500">
                              {formatCp(cpVal)}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {isCorrect
                            ? "Correct"
                            : isInTop3
                            ? `Engine: #${engineIdx + 1}`
                            : isClose
                            ? "Close"
                            : "Not in top 3"}
                        </span>
                      </div>
                      {showExplanation && (
                        <p className="text-[10px] text-red-400/70 ml-8 mt-0.5 italic">
                          {explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { window.location.href = "/scales"; }}
                  className="flex-1 text-center bg-[#c8942a] text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#b5852a] transition-colors"
                >
                  Next position
                </button>
                <Link
                  href="/home"
                  className="flex-1 text-center bg-[#2a2a2a] text-gray-400 px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#333] hover:text-gray-300 transition-colors"
                >
                  Done
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-white font-bold text-lg">
                Rank the top 3 moves
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Click a slot to activate it, then make a move on the board. Rank
                all 3 from best to worst.
              </p>

              {hasSacrifice && (
                <p className="text-[#c8942a] opacity-80 text-xs mt-2 italic">
                  One of the top moves involves a sacrifice
                </p>
              )}

              {/* Slots */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {slots.map((slot, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (slot) return;
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
              : phase === "evaluating"
              ? "Evaluating your moves..."
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
