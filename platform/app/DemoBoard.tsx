"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Chess } from "chess.js";
import ChessBoardWrapper from "@/components/ChessBoardWrapper";
import type { PieceDropHandlerArgs } from "@/components/ChessBoardWrapper";
import CassandraLogo from "@/components/CassandraLogo";

/* ── Types ── */

interface RecentEntry {
  username: string;
  puzzleCount: number;
  timeAgo: string;
}

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
  recentActivity: RecentEntry[];
}

type Phase = "gif" | "loading" | "results" | "puzzle" | "result";

/* ── Constants ── */

const LOADING_SQUARES = 8;
const LOADING_INTERVAL = 180;
const LOADING_DURATION = 1500;

const STATUS_LINES = [
  "Fetching your recent games...",
  "Finding your mistakes...",
  "Building your personal puzzles...",
];

/* GIF animation timings (ms) */
const GIF_TIMINGS = [1500, 500, 500, 1000]; // frame 0, 1, 2, 3
// total cycle = sum of GIF_TIMINGS

/* ── Component ── */

export default function DemoBoard() {
  const [phase, setPhase] = useState<Phase>("gif");
  const [data, setData] = useState<DemoData | null>(null);
  const [, setGifFrame] = useState(0);
  const [gifFen, setGifFen] = useState<string | null>(null);
  const [gifStyles, setGifStyles] = useState<Record<string, React.CSSProperties>>({});
  const [gifLabel, setGifLabel] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [resultCorrect, setResultCorrect] = useState<boolean | null>(null);
  const [squareStyles, setSquareStyles] = useState<Record<string, React.CSSProperties>>({});
  const chessRef = useRef<Chess | null>(null);
  const gifChessRef = useRef<Chess | null>(null);

  /* ── Fetch demo data on mount ── */
  useEffect(() => {
    fetch("/api/demo")
      .then((r) => r.json())
      .then((d) => {
        if (d?.fen) {
          console.log("[DemoBoard] API response:", d);
          setData(d);
          setGifFen(d.fen);
        } else {
          console.warn("[DemoBoard] API returned no puzzle:", d);
        }
      })
      .catch((err) => console.error("[DemoBoard] Fetch error:", err));
  }, []);

  /* ── GIF animation with chess.js moves ── */
  useEffect(() => {
    if (phase !== "gif" || !data) return;

    let frameIdx = 0;
    let timeout: ReturnType<typeof setTimeout>;

    function runFrame() {
      const chess = new Chess(data!.fen);
      gifChessRef.current = chess;
      const sol = data!.solution;
      const fromSq = sol.slice(0, 2);
      const toSq = sol.slice(2, 4);

      if (frameIdx === 0) {
        // Frame 0: original position, no highlights
        setGifFen(data!.fen);
        setGifStyles({});
        setGifLabel(`Your position, move ${data!.moveNumber}`);
      } else if (frameIdx === 1) {
        // Frame 1: wrong move — move a random legal piece to a bad square, highlight red
        // Use the "from" square of the solution as the blunder piece, move it somewhere wrong
        const moves = chess.moves({ square: fromSq as never, verbose: true });
        const wrongMove = moves.find((m) => m.to !== toSq) ?? moves[0];
        if (wrongMove) {
          chess.move(wrongMove);
          setGifFen(chess.fen());
          setGifStyles({ [wrongMove.to]: { backgroundColor: "rgba(255, 50, 50, 0.5)" } });
          setGifLabel(`Blunder \u2014 ${wrongMove.san}??`);
        }
      } else if (frameIdx === 2) {
        // Frame 2: undo — back to original position
        setGifFen(data!.fen);
        setGifStyles({});
        setGifLabel(`Your position, move ${data!.moveNumber}`);
      } else if (frameIdx === 3) {
        // Frame 3: correct move — piece moves to solution square, highlight green
        const move = chess.move({ from: fromSq, to: toSq, promotion: "q" });
        if (move) {
          setGifFen(chess.fen());
          setGifStyles({ [toSq]: { backgroundColor: "rgba(100, 200, 80, 0.5)" } });
          setGifLabel("Cassandra: learn this position");
        }
      }

      setGifFrame(frameIdx);
      timeout = setTimeout(() => {
        frameIdx = (frameIdx + 1) % 4;
        runFrame();
      }, GIF_TIMINGS[frameIdx]);
    }

    runFrame();
    return () => clearTimeout(timeout);
  }, [phase, data]);

  /* ── Start demo ── */
  function handleStartDemo() {
    setPhase("loading");
    setLoadingProgress(0);
    setStatusIndex(0);
  }

  /* ── Loading animation ── */
  useEffect(() => {
    if (phase !== "loading") return;

    const pawnInterval = setInterval(() => {
      setLoadingProgress((p) => (p >= LOADING_SQUARES ? p : p + 1));
    }, LOADING_INTERVAL);

    const statusInterval = setInterval(() => {
      setStatusIndex((i) => (i < STATUS_LINES.length - 1 ? i + 1 : i));
    }, 500);

    const timer = setTimeout(() => {
      setPhase("results");
    }, LOADING_DURATION);

    return () => {
      clearInterval(pawnInterval);
      clearInterval(statusInterval);
      clearTimeout(timer);
    };
  }, [phase]);

  /* ── Puzzle interaction ── */
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
          [square]: { backgroundColor: isCorrect ? "rgba(100, 200, 80, 0.6)" : "rgba(255, 50, 50, 0.6)" },
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
      [targetSquare]: { backgroundColor: isCorrect ? "rgba(100, 200, 80, 0.6)" : "rgba(255, 50, 50, 0.6)" },
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

  /* ── Derived state ── */
  const showOverlay = phase === "loading" || (phase === "results" && !data);
  const boardOrientation = data?.playerColor === "black" ? "black" : "white";
  const startingFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  // Board FEN depends on phase
  let boardFen: string;
  let currentStyles: Record<string, React.CSSProperties>;
  let orientation: "white" | "black" = "white";
  let isInteractive = false;

  if (phase === "gif") {
    boardFen = gifFen ?? data?.fen ?? startingFen;
    currentStyles = gifStyles;
    orientation = "white";
  } else if (phase === "loading") {
    boardFen = data?.fen ?? startingFen;
    currentStyles = {};
  } else {
    boardFen = data?.fen ?? startingFen;
    currentStyles = squareStyles;
    orientation = boardOrientation as "white" | "black";
    isInteractive = phase === "puzzle";
  }

  // For results/puzzle/result, use side-by-side layout
  const isSideBySide = phase === "results" || phase === "puzzle" || phase === "result";

  /* ── Render ── */
  return (
    <div
      style={{
        display: "flex",
        flexDirection: isSideBySide ? "row" : "column",
        gap: isSideBySide ? 24 : 12,
        alignItems: isSideBySide ? "flex-start" : "center",
      }}
    >
      {/* ── Board column ── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        {/* Board wrapper */}
        <div
          style={{
            width: 480,
            height: 480,
            maxWidth: "100%",
            flexShrink: 0,
            borderRadius: 12,
            overflow: "hidden",
            border: "4px solid #0e0e0e",
            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
            position: "relative",
            aspectRatio: "1",
          }}
        >
          <ChessBoardWrapper
            position={boardFen}
            interactive={isInteractive}
            boardOrientation={orientation}
            onSquareClick={handleSquareClick}
            onPieceDrop={handleDrop}
            squareStyles={currentStyles}
          />

          {/* GIF label overlay */}
          {phase === "gif" && gifLabel && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
                padding: "24px 16px 12px",
                pointerEvents: "none",
              }}
            >
              <p style={{ fontFamily: "Georgia, serif", fontSize: 14, color: "#fff", margin: 0 }}>
                {gifLabel}
              </p>
            </div>
          )}

          {/* Loading overlay */}
          {showOverlay && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.85)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
              }}
            >
              <CassandraLogo className="w-12 h-12 mb-4 animate-pulse" />
              <p style={{ fontFamily: "Georgia, serif", fontSize: 18, color: "#fff", marginBottom: 20 }}>
                Analysing j_r_b_01&apos;s games...
              </p>
              {/* Pawn loading bar */}
              <div style={{ display: "flex" }}>
                {Array.from({ length: LOADING_SQUARES }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 48,
                      height: 48,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: i % 2 === 0 ? "#f0d9b5" : "#b58863",
                    }}
                  >
                    {i < loadingProgress && (
                      <span style={{ fontSize: 24, color: "#c8942a", animation: "demoFadeIn 0.2s ease-out" }}>
                        &#9823;
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Loading status lines — inside the overlay */}
              <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 8 }}>
                {STATUS_LINES.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      opacity: i <= statusIndex ? 1 : 0,
                      transition: "opacity 0.4s ease",
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c8942a", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "#bbb" }}>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Recently analysed strip — GIF mode only ── */}
        {phase === "gif" && data?.recentActivity && data.recentActivity.length > 0 && (
          <RecentStrip entries={data.recentActivity} />
        )}

        {/* ── "See it in action" button — GIF mode only ── */}
        {phase === "gif" && (
          <button
            onClick={handleStartDemo}
            style={{
              background: "#c8942a",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "12px 32px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              width: "100%",
              maxWidth: 480,
            }}
            className="hover:brightness-90 transition"
          >
            See it in action &rarr;
          </button>
        )}
      </div>

      {/* ── Side panel — results/puzzle/result states only ── */}
      {isSideBySide && (
        <div
          style={{
            width: 280,
            minHeight: 480,
            background: "#fff",
            border: "0.5px solid #e5e5e5",
            borderRadius: 12,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            justifyContent: "center",
          }}
          className="hidden lg:flex"
        >
          {/* Results */}
          {phase === "results" && data && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#111", margin: 0 }}>
                  j_r_b_01 vs {data.opponentName}
                </p>
                <p style={{ fontSize: 12, color: "#999", margin: "2px 0 0" }}>
                  Blitz &middot; Move {data.moveNumber}
                </p>
              </div>
              <div style={{ height: 1, background: "#e5e5e5" }} />

              <ResultRow icon="&#9823;" count={data.missedTactics} label="missed tactics" onClick={startPuzzle} />
              <ResultRow icon="&#9889;" count={data.strongerMoves} label="stronger moves available" onClick={startPuzzle} />
              <ResultRow icon="&#128065;" count={data.retrograde} label="positions to reconstruct" onClick={startPuzzle} />

              <div style={{ height: 1, background: "#e5e5e5" }} />
              <p style={{ fontSize: 12, color: "#999", margin: 0 }}>Click any to try a sample puzzle</p>
            </div>
          )}

          {/* Puzzle */}
          {phase === "puzzle" && data && (
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#111", margin: "0 0 8px" }}>
                Find the winning move.
              </p>
              <span
                style={{
                  display: "inline-block",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#c8942a",
                  background: "rgba(200,148,42,0.1)",
                  border: "1px solid rgba(200,148,42,0.3)",
                  borderRadius: 999,
                  padding: "2px 10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {data.tacticType}
              </span>
              <p style={{ fontSize: 13, color: "#888", margin: "12px 0 0" }}>
                Click a piece to start.
              </p>
            </div>
          )}

          {/* Result */}
          {phase === "result" && data && (
            <div>
              {resultCorrect ? (
                <p style={{ fontSize: 15, fontWeight: 600, color: "#16a34a", margin: "0 0 8px" }}>
                  That&apos;s it. &#10003;
                </p>
              ) : (
                <>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#dc2626", margin: "0 0 4px" }}>
                    Not quite.
                  </p>
                  <p style={{ fontSize: 13, color: "#666", margin: "0 0 8px" }}>
                    The win was <strong>{formatSolution(data.solution)}</strong>.
                  </p>
                </>
              )}
              <button
                onClick={() => { /* CTA — to be decided */ }}
                style={{
                  marginTop: 16,
                  width: "100%",
                  fontSize: 14,
                  fontWeight: 600,
                  background: "#c8942a",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 0",
                  cursor: "pointer",
                }}
                className="hover:brightness-90 transition"
              >
                [CTA_PLACEHOLDER]
              </button>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes demoFadeIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

/* ── Clickable result row ── */

function ResultRow({
  icon,
  count,
  label,
  onClick,
}: {
  icon: string;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        borderRadius: 6,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        borderLeft: "3px solid transparent",
        transition: "all 0.15s ease",
        fontSize: 13,
        color: "#555",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#f9f7f4";
        e.currentTarget.style.borderLeftColor = "#c8942a";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderLeftColor = "transparent";
      }}
    >
      <span dangerouslySetInnerHTML={{ __html: icon }} />
      <span><strong>{count}</strong> {label}</span>
    </button>
  );
}

/* ── Horizontal scrolling recent activity strip ── */

function RecentStrip({ entries }: { entries: RecentEntry[] }) {
  const [step, setStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);

  // Each entry is ~200px wide. Show 3 at a time in 480px.
  const ENTRY_W = 200;
  const count = entries.length;

  // Triple the entries for seamless looping
  const tripled = [...entries, ...entries, ...entries];

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((s) => s + 1);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // When we've scrolled past the first full set, jump back seamlessly
  useEffect(() => {
    if (step >= count) {
      // Let the transition finish, then snap back
      const snap = setTimeout(() => {
        setIsTransitioning(false);
        setStep((s) => s - count);
        // Re-enable transition after the snap
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setIsTransitioning(true));
        });
      }, 800); // match transition duration
      return () => clearTimeout(snap);
    }
  }, [step, count]);

  return (
    <div
      style={{
        width: 480,
        maxWidth: "100%",
        background: "#fff",
        border: "0.5px solid #e5e5e5",
        borderRadius: 8,
        padding: "12px 0",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        ref={trackRef}
        style={{
          display: "flex",
          transition: isTransitioning ? "transform 0.8s ease" : "none",
          transform: `translateX(-${step * ENTRY_W}px)`,
        }}
      >
        {tripled.map((entry, i) => (
          <div
            key={`strip-${i}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "#555",
              whiteSpace: "nowrap",
              flexShrink: 0,
              width: ENTRY_W,
              padding: "0 16px",
              boxSizing: "border-box",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c8942a", flexShrink: 0 }} />
            <span>
              {entry.username} &mdash; {entry.puzzleCount} puzzles <span style={{ color: "#ccc" }}>&middot;</span> {entry.timeAgo}
            </span>
          </div>
        ))}
      </div>

      {/* Fade edges */}
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 32, background: "linear-gradient(to right, transparent, white)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 32, background: "linear-gradient(to left, transparent, white)", pointerEvents: "none" }} />
    </div>
  );
}
