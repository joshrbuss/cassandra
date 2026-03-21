"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Chess } from "chess.js";
import ChessBoardWrapper from "@/components/ChessBoardWrapper";
import type { PieceDropHandlerArgs } from "@/components/ChessBoardWrapper";
import CassandraLogo from "@/components/CassandraLogo";

/* ── Types ── */

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

type Phase = "gif" | "loading" | "results" | "puzzle" | "result";

/* ── Constants ── */

const LOADING_SQUARES = 8;
const LOADING_INTERVAL = 180;
const LOADING_DURATION = 1500;
const GIF_FRAME_MS = 2000;

const STATUS_LINES = [
  "Fetching recent games...",
  "Running Stockfish analysis...",
  "Finding missed tactics...",
  "Building your puzzles...",
];

const RECENT_ACTIVITY = [
  { username: "j_r_b_01", mistakes: 4, time: "2 mins ago" },
  { username: "knight_rider88", mistakes: 7, time: "5 mins ago" },
  { username: "silentbishop", mistakes: 2, time: "8 mins ago" },
  { username: "queenSacrifice", mistakes: 11, time: "12 mins ago" },
  { username: "pawn_storm99", mistakes: 3, time: "15 mins ago" },
  { username: "endgame_eric", mistakes: 6, time: "19 mins ago" },
];

const GIF_LABELS = [
  "Your position, move 24",
  "Blunder found \u265F",
  "Cassandra: here\u2019s the win",
];

/* ── Component ── */

export default function DemoBoard() {
  const [phase, setPhase] = useState<Phase>("gif");
  const [data, setData] = useState<DemoData | null>(null);
  const [gifFrame, setGifFrame] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [resultCorrect, setResultCorrect] = useState<boolean | null>(null);
  const [squareStyles, setSquareStyles] = useState<Record<string, React.CSSProperties>>({});
  const chessRef = useRef<Chess | null>(null);
  const fetchStartedRef = useRef(false);

  /* ── Fetch demo data on mount (for GIF mode + later use) ── */
  useEffect(() => {
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
  }, []);

  /* ── GIF cycling ── */
  useEffect(() => {
    if (phase !== "gif") return;
    const timer = setInterval(() => {
      setGifFrame((f) => (f + 1) % 3);
    }, GIF_FRAME_MS);
    return () => clearInterval(timer);
  }, [phase]);

  /* ── Build GIF-mode square highlights ── */
  function getGifSquareStyles(): Record<string, React.CSSProperties> {
    if (!data) return {};
    const sol = data.solution;
    const blunderSq = sol.slice(0, 2); // piece origin = where blunder was
    const solutionSq = sol.slice(2, 4);
    if (gifFrame === 0) return {};
    if (gifFrame === 1) {
      return { [blunderSq]: { backgroundColor: "rgba(255, 50, 50, 0.5)" } };
    }
    // frame 2
    return {
      [blunderSq]: { backgroundColor: "rgba(255, 50, 50, 0.5)" },
      [solutionSq]: { backgroundColor: "rgba(100, 200, 80, 0.5)" },
    };
  }

  /* ── Start demo (button click) ── */
  function handleStartDemo() {
    setPhase("loading");
    setLoadingProgress(0);
    setStatusIndex(0);

    // Re-fetch if somehow data didn't load
    if (!data && !fetchStartedRef.current) {
      fetchStartedRef.current = true;
      fetch("/api/demo")
        .then((r) => r.json())
        .then((d) => { if (d?.fen) setData(d); })
        .catch(() => {});
    }
  }

  /* ── Loading animation ── */
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

  /* ── If loading ends before data, wait ── */
  useEffect(() => {
    if (phase === "results" && !data) {
      // Will show loading overlay until data arrives
    }
  }, [phase, data]);

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
  const boardFen = data?.fen ?? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  const currentSquareStyles =
    phase === "gif" ? getGifSquareStyles() : squareStyles;

  const isInteractive = phase === "puzzle";
  const orientation: "white" | "black" =
    phase === "gif" || phase === "loading" ? "white" : (boardOrientation as "white" | "black");

  /* ── Render ── */
  return (
    <div style={{ display: "flex", flexDirection: "row", gap: 24, alignItems: "flex-start" }}
         className="flex-col lg:flex-row"
    >
      {/* ── Board column ── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        {/* Board wrapper */}
        <div
          className="w-full max-w-[480px]"
          style={{
            width: 480,
            height: 480,
            flexShrink: 0,
            borderRadius: 12,
            overflow: "hidden",
            border: "4px solid #0e0e0e",
            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
            position: "relative",
          }}
        >
          <ChessBoardWrapper
            position={boardFen}
            interactive={isInteractive}
            boardOrientation={orientation}
            onSquareClick={handleSquareClick}
            onPieceDrop={handleDrop}
            squareStyles={currentSquareStyles}
          />

          {/* GIF label overlay */}
          {phase === "gif" && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
                padding: "24px 16px 12px",
              }}
            >
              <p style={{ fontFamily: "Georgia, serif", fontSize: 14, color: "#fff", margin: 0 }}>
                {GIF_LABELS[gifFrame]}
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
            </div>
          )}
        </div>

        {/* "See it in action" button — below the board, only in GIF mode */}
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

      {/* ── Side panel ── */}
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
        }}
        className="hidden lg:flex"
      >
        {/* GIF state — recently analysed feed */}
        {phase === "gif" && <RecentFeed />}

        {/* Loading state — status lines */}
        {showOverlay && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {STATUS_LINES.map((line, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  opacity: i <= statusIndex ? 1 : 0.25,
                  transition: "opacity 0.3s ease",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: i <= statusIndex ? "#c8942a" : "#ddd",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 13, color: "#555" }}>{line}</span>
              </div>
            ))}
          </div>
        )}

        {/* Results state */}
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

        {/* Puzzle state */}
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
                marginBottom: 12,
              }}
            >
              {data.tacticType}
            </span>
            <p style={{ fontSize: 13, color: "#888", margin: "12px 0 0" }}>
              Click a piece to start.
            </p>
          </div>
        )}

        {/* Result state */}
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
                  The winning move was <strong>{formatSolution(data.solution)}</strong>.
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

/* ── Recently analysed feed ── */

function RecentFeed() {
  const [visibleStart, setVisibleStart] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleStart((s) => (s + 1) % RECENT_ACTIVITY.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Show 6 entries cycling
  const visible = Array.from({ length: 6 }, (_, i) => {
    const idx = (visibleStart + i) % RECENT_ACTIVITY.length;
    return RECENT_ACTIVITY[idx];
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
      <p style={{ fontSize: 12, textTransform: "uppercase", color: "#999", letterSpacing: "0.08em", margin: 0, fontWeight: 600 }}>
        Recently analysed
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        {visible.map((entry, i) => (
          <div
            key={`${entry.username}-${visibleStart}-${i}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "#555",
              animation: "demoFeedIn 0.4s ease-out",
              opacity: i >= 5 ? 0.4 : 1,
              transition: "opacity 0.3s",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c8942a", flexShrink: 0 }} />
            <span>
              <strong>{entry.username}</strong> &mdash; {entry.mistakes} mistakes found &middot; {entry.time}
            </span>
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: "#e5e5e5", margin: "8px 0" }} />
      <p style={{ fontSize: 13, color: "#888", fontStyle: "italic", margin: 0 }}>
        Your turn &mdash; see what Cassandra finds in your games
      </p>

      <style jsx>{`
        @keyframes demoFeedIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
