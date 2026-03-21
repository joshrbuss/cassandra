"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Chess } from "chess.js";
import ChessBoardWrapper from "@/components/ChessBoardWrapper";
import type { PieceDropHandlerArgs } from "@/components/ChessBoardWrapper";

interface DemoData {
  fen: string;
  solution: string;
  tacticType: string;
  opponentName: string;
  moveNumber: number;
  playerColor: string;
  missedTactics: number;
  strongerMoves: number;
  retrograde: number;
}

type Phase = "loading" | "results" | "puzzle" | "result";

const LOADING_SQUARES = 8;
const LOADING_INTERVAL = 280;
const LOADING_DURATION = 2500;

export default function DemoBoard() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<DemoData | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [resultCorrect, setResultCorrect] = useState<boolean | null>(null);
  const [squareStyles, setSquareStyles] = useState<Record<string, React.CSSProperties>>({});
  const chessRef = useRef<Chess | null>(null);

  // Fetch demo data
  useEffect(() => {
    fetch("/api/demo")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  // Loading animation
  useEffect(() => {
    if (phase !== "loading") return;
    const interval = setInterval(() => {
      setLoadingProgress((p) => {
        if (p >= LOADING_SQUARES) return p;
        return p + 1;
      });
    }, LOADING_INTERVAL);

    const timer = setTimeout(() => {
      if (data) setPhase("results");
    }, LOADING_DURATION);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [phase, data]);

  // Transition from loading to results when data arrives late
  useEffect(() => {
    if (phase === "loading" && data && loadingProgress >= LOADING_SQUARES) {
      setPhase("results");
    }
  }, [phase, data, loadingProgress]);

  const startPuzzle = useCallback(() => {
    if (!data) return;
    const chess = new Chess(data.fen);
    chessRef.current = chess;
    setSelectedSquare(null);
    setSquareStyles({});
    setResultCorrect(null);
    setPhase("puzzle");
  }, [data]);

  function handleSquareClick({ square }: { piece: unknown; square: string }) {
    if (phase !== "puzzle" || !chessRef.current || !data) return;
    const chess = chessRef.current;
    const playerSide = data.playerColor === "white" ? "w" : "b";

    if (selectedSquare) {
      // Second click — try the move
      const move = chess.move({ from: selectedSquare, to: square, promotion: "q" });
      if (move) {
        const uci = move.from + move.to;
        const isCorrect = uci === data.solution;
        setResultCorrect(isCorrect);
        setSquareStyles({
          [square]: {
            backgroundColor: isCorrect ? "rgba(100, 200, 80, 0.6)" : "rgba(255, 50, 50, 0.6)",
          },
        });
        setPhase("result");
      } else {
        setSelectedSquare(null);
        setSquareStyles({});
      }
    } else {
      // First click — select piece
      const piece = chess.get(square as never);
      if (piece && piece.color === playerSide) {
        const moves = chess.moves({ square: square as never, verbose: true });
        if (moves.length > 0) {
          setSelectedSquare(square);
          const styles: Record<string, React.CSSProperties> = {
            [square]: { backgroundColor: "rgba(255, 200, 0, 0.5)" },
          };
          for (const m of moves) {
            styles[m.to] = {
              background: "radial-gradient(circle, rgba(0,0,0,0.2) 25%, transparent 25%)",
              borderRadius: "50%",
            };
          }
          setSquareStyles(styles);
        }
      }
    }
  }

  function handleDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (phase !== "puzzle" || !chessRef.current || !data || !targetSquare) return false;
    const chess = chessRef.current;
    const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
    if (!move) return false;

    const uci = move.from + move.to;
    const isCorrect = uci === data.solution;
    setResultCorrect(isCorrect);
    setSquareStyles({
      [targetSquare]: {
        backgroundColor: isCorrect ? "rgba(100, 200, 80, 0.6)" : "rgba(255, 50, 50, 0.6)",
      },
    });
    setPhase("result");
    return true;
  }

  // Format solution for display (e.g. "e2e4" → "e4")
  function formatSolution(uci: string): string {
    if (!data) return uci;
    try {
      const chess = new Chess(data.fen);
      const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: "q" });
      return move?.san ?? uci;
    } catch {
      return uci;
    }
  }

  const boardOrientation = data?.playerColor === "black" ? "black" : "white";

  return (
    <div className="flex flex-col lg:flex-row gap-0 rounded-[14px] overflow-hidden shadow-xl" style={{ border: "0.5px solid #e5e5e5" }}>
      {/* Board area */}
      <div className="w-full lg:w-[360px] aspect-square relative shrink-0 bg-[#b58863]">
        {phase === "loading" ? (
          <LoadingOverlay progress={loadingProgress} />
        ) : data ? (
          <ChessBoardWrapper
            position={data.fen}
            interactive={phase === "puzzle"}
            boardOrientation={boardOrientation as "white" | "black"}
            onSquareClick={handleSquareClick}
            onPieceDrop={handleDrop}
            squareStyles={squareStyles}
          />
        ) : null}
      </div>

      {/* Panel */}
      <div className="w-full lg:w-[260px] bg-white p-5 flex flex-col justify-center min-h-[200px] lg:min-h-0">
        {phase === "loading" && (
          <div className="text-center lg:text-left">
            <p className="text-sm font-semibold text-[#111]">Analysing j_r_b_01&apos;s games...</p>
            <p className="text-xs text-[#999] mt-1">Finding missed tactics and blunders</p>
          </div>
        )}

        {phase === "results" && data && (
          <div>
            <p className="text-sm font-semibold text-[#111] mb-1">
              j_r_b_01 vs {data.opponentName}
            </p>
            <div className="h-px bg-[#e5e5e5] my-3" />

            <button
              onClick={startPuzzle}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#f5f3f0] transition-colors group cursor-pointer"
            >
              <span className="text-sm">&#9823; <strong>{data.missedTactics}</strong> <span className="text-[#666]">missed tactics</span></span>
            </button>
            <button
              onClick={startPuzzle}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#f5f3f0] transition-colors group cursor-pointer"
            >
              <span className="text-sm">&#9889; <strong>{data.strongerMoves}</strong> <span className="text-[#666]">stronger moves available</span></span>
            </button>
            <button
              onClick={startPuzzle}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#f5f3f0] transition-colors group cursor-pointer"
            >
              <span className="text-sm">&#128065; <strong>{data.retrograde}</strong> <span className="text-[#666]">positions to reconstruct</span></span>
            </button>

            <div className="h-px bg-[#e5e5e5] my-3" />
            <p className="text-xs text-[#999]">Click any to try a sample puzzle</p>
          </div>
        )}

        {phase === "puzzle" && (
          <div>
            <p className="text-sm font-semibold text-[#111] mb-2">Find the winning move.</p>
            <p className="text-xs text-[#888]">Click a piece to start.</p>
          </div>
        )}

        {phase === "result" && data && (
          <div>
            {resultCorrect ? (
              <>
                <p className="text-sm font-semibold text-green-700 mb-2">
                  That&apos;s it.
                </p>
                <p className="text-xs text-[#666] leading-relaxed">
                  Cassandra would have caught this in your games too.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-red-700 mb-2">
                  Not quite — the winning move was {formatSolution(data.solution)}.
                </p>
                <p className="text-xs text-[#666] leading-relaxed">
                  Cassandra trains you until these stick.
                </p>
              </>
            )}
            <button
              onClick={() => {
                /* CTA action — to be decided */
              }}
              className="mt-4 w-full text-sm font-semibold bg-[#c8942a] text-white px-4 py-2.5 rounded-lg hover:bg-[#b5852a] transition-colors"
            >
              [CTA_PLACEHOLDER]
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Loading overlay with pawn animation */
function LoadingOverlay({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 bg-[#0e0e0e] flex flex-col items-center justify-center z-10">
      <p className="text-sm text-gray-300 font-medium mb-6" style={{ fontFamily: "Georgia, serif" }}>
        Analysing j_r_b_01&apos;s games...
      </p>

      {/* Loading bar — 8 squares */}
      <div className="flex gap-0">
        {Array.from({ length: LOADING_SQUARES }).map((_, i) => (
          <div
            key={i}
            className="w-8 h-8 flex items-center justify-center"
            style={{
              backgroundColor: i % 2 === 0 ? "#f0d9b5" : "#b58863",
            }}
          >
            {i < progress && (
              <span
                className="text-lg leading-none animate-fadeIn"
                style={{ color: i % 2 === 0 ? "#b58863" : "#f0d9b5" }}
              >
                &#9823;
              </span>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
