"use client";

import { useState, useEffect } from "react";
import { Chess } from "chess.js";
import dynamic from "next/dynamic";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { type Puzzle } from "@prisma/client";
import { type CandidateMove, type MoveGrade, GRADE_LABELS } from "@/lib/types";

const ChessBoardWrapper = dynamic(() => import("@/components/ChessBoardWrapper"), {
  ssr: false,
  loading: () => <div className="w-full aspect-square bg-gray-100 rounded animate-pulse" />,
});

interface MoveRankingPuzzleProps {
  puzzle: Puzzle;
}

type Result = "perfect" | "partial" | "wrong";

/** Apply a single UCI move to a FEN; returns resulting FEN or null on failure. */
function applyUci(fen: string, uci: string): string | null {
  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4] || undefined,
    });
    return move ? chess.fen() : null;
  } catch {
    return null;
  }
}

/** Rank label for a 0-based index position (0 = best). */
const RANK_LABELS = ["1st — Best", "2nd", "3rd — Worst"];

export default function MoveRankingPuzzle({ puzzle }: MoveRankingPuzzleProps) {
  const candidates: CandidateMove[] = (() => {
    try {
      return JSON.parse(puzzle.candidateMoves ?? "[]");
    } catch {
      return [];
    }
  })();

  // Shuffle candidates so the correct order isn't always shown up front
  const [orderedMoves, setOrderedMoves] = useState<CandidateMove[]>(() => {
    // Simple deterministic shuffle by swapping first and last if there are 3+
    if (candidates.length < 3) return candidates;
    return [candidates[1], candidates[0], candidates[2]];
  });

  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Tap-to-rank state: tracks which moves have been assigned a rank (in order)
  const [tapRanks, setTapRanks] = useState<string[]>([]); // UCI strings in rank order

  useEffect(() => {
    setIsMobile(window.matchMedia("(hover: none)").matches);
  }, []);

  if (candidates.length < 2) {
    return (
      <p className="text-sm text-gray-400 italic">
        This puzzle has no candidate moves configured.
      </p>
    );
  }

  // Correct ordering: descending eval_cp
  const correctOrder = [...candidates].sort((a, b) => b.eval_cp - a.eval_cp);

  function handleDragEnd(result: DropResult) {
    if (!result.destination || submitted) return;
    const items = Array.from(orderedMoves);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);
    setOrderedMoves(items);
  }

  function handleTapRank(uci: string) {
    if (submitted) return;
    if (tapRanks.includes(uci)) {
      // Deselect — remove this and all ranks assigned after it
      setTapRanks((prev) => prev.slice(0, prev.indexOf(uci)));
    } else if (tapRanks.length < candidates.length) {
      setTapRanks((prev) => [...prev, uci]);
    }
  }

  function submit() {
    const userOrder = isMobile
      ? tapRanks.map((uci) => candidates.find((c) => c.uci === uci)!).filter(Boolean)
      : orderedMoves;

    if (userOrder.length < candidates.length) return; // not all ranked yet

    const bestCorrect = userOrder[0]?.uci === correctOrder[0]?.uci;
    const allCorrect = userOrder.every((m, i) => m.uci === correctOrder[i]?.uci);

    setResult(allCorrect ? "perfect" : bestCorrect ? "partial" : "wrong");
    setSubmitted(true);

    // Sync orderedMoves so the reveal uses the submitted order
    if (isMobile) {
      setOrderedMoves(userOrder);
    }
  }

  // Eval bar: max eval determines 100% width
  const maxEval = Math.max(...candidates.map((c) => Math.abs(c.eval_cp)), 1);

  return (
    <div className="space-y-4">
      {/* Instruction */}
      <p className="text-sm text-gray-600">
        {isMobile
          ? `Tap moves in order — best first, worst last. (${tapRanks.length}/${candidates.length} ranked)`
          : "Drag to rank the moves — best at top, worst at bottom."}
      </p>

      {/* Result banner */}
      {result && (
        <div
          className={`px-4 py-3 rounded-xl text-sm font-semibold text-center ${
            result === "perfect"
              ? "bg-green-50 text-green-700 border border-green-200"
              : result === "partial"
              ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {result === "perfect"
            ? "Perfect! You ranked all three moves correctly."
            : result === "partial"
            ? "Good — you found the best move."
            : `Wrong. The best move was ${correctOrder[0]?.san}.`}
        </div>
      )}

      {/* Move cards */}
      {isMobile ? (
        // ── Tap-to-rank mode ──────────────────────────────────────────────────
        <div className="space-y-2">
          {candidates.map((move) => {
            const rankIdx = tapRanks.indexOf(move.uci);
            const assigned = rankIdx !== -1;
            const grade = submitted ? GRADE_LABELS[move.grade as MoveGrade] : null;
            const afterFen = applyUci(puzzle.solvingFen, move.uci);

            return (
              <button
                key={move.uci}
                onClick={() => handleTapRank(move.uci)}
                disabled={submitted}
                className={`w-full text-left rounded-xl border transition-all overflow-hidden ${
                  assigned
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-blue-300"
                } ${submitted ? "cursor-default" : "cursor-pointer"}`}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Rank badge */}
                  <span
                    className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      assigned
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {assigned ? rankIdx + 1 : "?"}
                  </span>

                  {/* Mini board */}
                  {afterFen && (
                    <div
                      className="w-14 h-14 flex-shrink-0 pointer-events-none rounded overflow-hidden"
                    >
                      <ChessBoardWrapper
                        position={afterFen}
                        interactive={false}
                        boardOrientation={puzzle.solvingFen.split(" ")[1] === "w" ? "white" : "black"}
                      />
                    </div>
                  )}

                  {/* SAN + grade */}
                  <div className="flex-1 min-w-0">
                    <span className="font-mono font-bold text-gray-900">{move.san}</span>
                    {submitted && grade && (
                      <span
                        className={`ml-2 text-xs px-2 py-0.5 rounded-full font-semibold ${grade.color} ${grade.bg}`}
                      >
                        {grade.symbol} {grade.label}
                      </span>
                    )}
                    {submitted && (
                      <EvalBar evalCp={move.eval_cp} maxEval={maxEval} />
                    )}
                  </div>

                  {/* Correct position indicator */}
                  {submitted && (
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      #{correctOrder.findIndex((c) => c.uci === move.uci) + 1} correct
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        // ── Drag-and-drop mode ────────────────────────────────────────────────
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="move-ranking">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-2"
              >
                {orderedMoves.map((move, index) => {
                  const grade = submitted ? GRADE_LABELS[move.grade as MoveGrade] : null;
                  const afterFen = applyUci(puzzle.solvingFen, move.uci);

                  return (
                    <Draggable
                      key={move.uci}
                      draggableId={move.uci}
                      index={index}
                      isDragDisabled={submitted}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`rounded-xl border bg-white transition-shadow overflow-hidden ${
                            snapshot.isDragging
                              ? "border-blue-400 shadow-lg"
                              : submitted
                              ? "border-gray-200 cursor-default"
                              : "border-gray-200 hover:border-blue-300 cursor-grab active:cursor-grabbing"
                          }`}
                        >
                          <div className="flex items-center gap-3 px-4 py-3">
                            {/* Rank indicator */}
                            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </span>

                            {/* Mini board preview */}
                            {afterFen && (
                              <div className="w-14 h-14 flex-shrink-0 pointer-events-none rounded overflow-hidden">
                                <ChessBoardWrapper
                                  position={afterFen}
                                  interactive={false}
                                  boardOrientation={puzzle.solvingFen.split(" ")[1] === "w" ? "white" : "black"}
                                />
                              </div>
                            )}

                            {/* SAN + result info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-gray-900">{move.san}</span>
                                {!submitted && (
                                  <span className="text-xs text-gray-400">{RANK_LABELS[index]}</span>
                                )}
                                {submitted && grade && (
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${grade.color} ${grade.bg}`}
                                  >
                                    {grade.symbol} {grade.label}
                                  </span>
                                )}
                              </div>
                              {submitted && (
                                <EvalBar evalCp={move.eval_cp} maxEval={maxEval} />
                              )}
                            </div>

                            {/* Drag handle hint + correctness */}
                            <div className="flex-shrink-0 text-right">
                              {submitted ? (
                                <span
                                  className={`text-xs font-semibold ${
                                    move.uci === correctOrder[index]?.uci
                                      ? "text-green-600"
                                      : "text-red-500"
                                  }`}
                                >
                                  {move.uci === correctOrder[index]?.uci ? "✓" : `→ #${correctOrder.findIndex((c) => c.uci === move.uci) + 1}`}
                                </span>
                              ) : (
                                <span className="text-gray-300 text-lg select-none">⠿</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Submit / mode toggle */}
      {!submitted && (
        <div className="flex items-center gap-3">
          <button
            onClick={submit}
            disabled={isMobile && tapRanks.length < candidates.length}
            className="flex-1 h-10 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Submit ranking
          </button>
          <button
            onClick={() => {
              setIsMobile((m) => !m);
              setTapRanks([]);
            }}
            className="text-xs text-gray-400 hover:text-gray-600 underline whitespace-nowrap"
          >
            {isMobile ? "Use drag" : "Use tap"}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Eval bar — shows centipawn strength as a filled bar
// ---------------------------------------------------------------------------
function EvalBar({ evalCp, maxEval }: { evalCp: number; maxEval: number }) {
  const pct = Math.round((Math.max(evalCp, 0) / maxEval) * 100);
  return (
    <div className="mt-1.5 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-blue-400 rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
