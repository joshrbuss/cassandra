"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Chess } from "chess.js";
import ChessBoardWrapper from "@/components/ChessBoardWrapper";
import type { PieceDropHandlerArgs } from "@/components/ChessBoardWrapper";
import CassandraLogo from "@/components/CassandraLogo";

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

type Phase = "idle" | "loading" | "results" | "puzzle" | "result";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const LOADING_SQUARES = 8;
const LOADING_INTERVAL = 140;
const LOADING_DURATION = 1300;

const STATUS_LINES = [
  "Fetching recent games...",
  "Running Stockfish analysis...",
  "Finding missed tactics...",
  "Building your puzzles...",
];

export default function DemoBoard() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [data, setData] = useState<DemoData | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [resultCorrect, setResultCorrect] = useState<boolean | null>(null);
  const [squareStyles, setSquareStyles] = useState<Record<string, React.CSSProperties>>({});
  const chessRef = useRef<Chess | null>(null);
  const fetchedRef = useRef(false);

  // The FEN to show on the board
  const boardFen = phase === "idle" || phase === "loading" || !data
    ? STARTING_FEN
    : data.fen;

  const boardOrientation = data?.playerColor === "black" ? "black" : "white";

  // Start the demo when user clicks "See it in action"
  function handleStartDemo() {
    setPhase("loading");
    setLoadingProgress(0);
    setStatusIndex(0);

    // Fetch demo data if not already fetched
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetch("/api/demo")
        .then((r) => r.json())
        .then((d) => {
          if (d && d.fen) {
            console.log("[DemoBoard] API response:", d);
            setData(d);
          } else {
            console.warn("[DemoBoard] API returned no puzzle:", d);
          }
        })
        .catch((err) => console.error("[DemoBoard] Fetch error:", err));
    }
  }

  // Loading animation — pawn bar + status lines
  useEffect(() => {
    if (phase !== "loading") return;

    const pawnInterval = setInterval(() => {
      setLoadingProgress((p) => (p >= LOADING_SQUARES ? p : p + 1));
    }, LOADING_INTERVAL);

    const statusInterval = setInterval(() => {
      setStatusIndex((i) => (i < STATUS_LINES.length - 1 ? i + 1 : i));
    }, 400);

    const timer = setTimeout(() => {
      setPhase("results");
    }, LOADING_DURATION);

    return () => {
      clearInterval(pawnInterval);
      clearInterval(statusInterval);
      clearTimeout(timer);
    };
  }, [phase]);

  // If loading finishes but data hasn't arrived yet, wait for it
  useEffect(() => {
    if (phase === "results" && !data) {
      // Still waiting for fetch — stay in loading visually
      // (will auto-transition when data arrives)
    }
  }, [phase, data]);

  // When data arrives and we're past loading duration, ensure we're in results
  useEffect(() => {
    if (data && phase === "loading") {
      // Let the timer handle it
    } else if (data && phase === "results") {
      // Good — data is ready
    }
  }, [data, phase]);

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

  // Show loading overlay when in loading phase OR results phase but data hasn't arrived
  const showOverlay = phase === "loading" || (phase === "results" && !data);

  return (
    <div className="flex flex-col lg:flex-row gap-0 rounded-[14px] overflow-hidden shadow-xl" style={{ border: "0.5px solid #e5e5e5" }}>
      {/* Board area */}
      <div className="w-full lg:w-[480px] aspect-square relative shrink-0">
        <ChessBoardWrapper
          position={boardFen}
          interactive={phase === "puzzle"}
          boardOrientation={phase === "idle" || phase === "loading" ? "white" : boardOrientation as "white" | "black"}
          onSquareClick={handleSquareClick}
          onPieceDrop={handleDrop}
          squareStyles={squareStyles}
        />

        {/* Loading overlay */}
        {showOverlay && (
          <div className="absolute inset-0 bg-[#0e0e0e]/95 flex flex-col items-center justify-center z-10">
            <CassandraLogo className="w-12 h-12 mb-4 animate-pulse" />
            <p className="text-[20px] text-white mb-6" style={{ fontFamily: "Georgia, serif" }}>
              Analysing j_r_b_01&apos;s games...
            </p>

            {/* Pawn loading bar */}
            <div className="flex gap-0 mb-6">
              {Array.from({ length: LOADING_SQUARES }).map((_, i) => (
                <div
                  key={i}
                  className="w-[52px] h-[52px] flex items-center justify-center"
                  style={{ backgroundColor: i % 2 === 0 ? "#f0d9b5" : "#b58863" }}
                >
                  {i < loadingProgress && (
                    <span
                      className="text-2xl leading-none"
                      style={{
                        color: i % 2 === 0 ? "#b58863" : "#f0d9b5",
                        animation: "demoFadeIn 0.2s ease-out",
                      }}
                    >
                      &#9823;
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Idle "See it in action" button */}
        {phase === "idle" && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
            <button
              onClick={handleStartDemo}
              className="w-full text-sm font-semibold bg-[#c8942a] text-white px-5 py-2.5 rounded-lg hover:bg-[#b5852a] transition-colors"
            >
              See it in action &rarr;
            </button>
          </div>
        )}

        <style jsx>{`
          @keyframes demoFadeIn {
            from { opacity: 0; transform: scale(0.5); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>

      {/* Panel */}
      <div className="w-full lg:w-[280px] bg-white p-5 flex flex-col justify-center min-h-[200px] lg:min-h-0">
        {/* Idle state */}
        {phase === "idle" && (
          <div>
            <p className="text-lg font-normal text-[#111] mb-3" style={{ fontFamily: "Georgia, serif" }}>
              Turn your mistakes into progress.
            </p>
            <p className="text-sm text-[#888] leading-relaxed">
              Watch how Cassandra analyses a real game.
            </p>
          </div>
        )}

        {/* Loading state — sequential status lines */}
        {showOverlay && (
          <div className="space-y-2.5">
            {STATUS_LINES.map((line, i) => (
              <p
                key={i}
                className="text-sm transition-opacity duration-300"
                style={{
                  opacity: i <= statusIndex ? 1 : 0.2,
                  color: i <= statusIndex ? "#111" : "#ccc",
                }}
              >
                {i < statusIndex ? "✓" : i === statusIndex ? "›" : "·"}{" "}
                {line}
              </p>
            ))}
          </div>
        )}

        {/* Results state */}
        {phase === "results" && data && (
          <div>
            <p className="text-sm font-semibold text-[#111] mb-1">
              j_r_b_01 vs {data.opponentName}
            </p>
            <div className="h-px bg-[#e5e5e5] my-3" />

            <button
              onClick={startPuzzle}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#f5f3f0] transition-colors cursor-pointer"
            >
              <span className="text-sm">&#9823; <strong>{data.missedTactics}</strong> <span className="text-[#666]">missed tactics</span></span>
            </button>
            <button
              onClick={startPuzzle}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#f5f3f0] transition-colors cursor-pointer"
            >
              <span className="text-sm">&#9889; <strong>{data.strongerMoves}</strong> <span className="text-[#666]">stronger moves available</span></span>
            </button>
            <button
              onClick={startPuzzle}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#f5f3f0] transition-colors cursor-pointer"
            >
              <span className="text-sm">&#128065; <strong>{data.retrograde}</strong> <span className="text-[#666]">positions to reconstruct</span></span>
            </button>

            <div className="h-px bg-[#e5e5e5] my-3" />
            <p className="text-xs text-[#999]">Click any to try a sample puzzle</p>
          </div>
        )}

        {/* Puzzle state */}
        {phase === "puzzle" && (
          <div>
            <p className="text-sm font-semibold text-[#111] mb-2">Find the winning move.</p>
            <p className="text-xs text-[#888]">Click a piece to start.</p>
          </div>
        )}

        {/* Result state */}
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
