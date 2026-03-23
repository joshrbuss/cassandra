"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Chess } from "chess.js";
import { useRouter } from "next/navigation";
import ChessBoardWrapper from "@/components/ChessBoardWrapper";
import type { PieceDropHandlerArgs } from "@/components/ChessBoardWrapper";
import CassandraLogo from "@/components/CassandraLogo";
import { useTranslation } from "@/components/i18n/LocaleProvider";

/* ── Types ── */

interface RecentEntry { username: string; puzzleCount: number; timeAgo: string }

interface PuzzleData {
  fen: string;
  solution: string;
  tacticType: string;
  opponentName: string;
  moveNumber: number;
  playerColor: string;
}

interface DemoData {
  tacticsPuzzle: PuzzleData;
  scalesPuzzle: PuzzleData;
  echoPuzzle: PuzzleData;
  missedTactics: number;
  strongerMoves: number;
  retrograde: number;
  recentActivity: RecentEntry[];
}

type Phase = "gif" | "loading" | "results" | "puzzle" | "result";

/* ── Constants ── */

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const LOADING_SQUARES = 8;
const LOADING_INTERVAL = 180;
const LOADING_DURATION = 1500;
const GIF_TIMINGS = [1500, 500, 500, 1000];

/* ── Component ── */

export default function DemoBoard() {
  const { t } = useTranslation();
  const STATUS_LINES = [t("demo.statusFetching"), t("demo.statusFinding"), t("demo.statusBuilding")];

  const [phase, setPhase] = useState<Phase>("gif");
  const [data, setData] = useState<DemoData | null>(null);
  const [activePuzzle, setActivePuzzle] = useState<PuzzleData | null>(null);
  const [gifFen, setGifFen] = useState<string>(STARTING_FEN);
  const [gifStyles, setGifStyles] = useState<Record<string, React.CSSProperties>>({});
  const [gifLabel, setGifLabel] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [resultCorrect, setResultCorrect] = useState<boolean | null>(null);
  const [squareStyles, setSquareStyles] = useState<Record<string, React.CSSProperties>>({});
  const [showCta, setShowCta] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const chessRef = useRef<Chess | null>(null);

  /* ── Fetch on mount ── */
  useEffect(() => {
    fetch("/api/demo")
      .then((r) => r.json())
      .then((d) => {
        if (d?.tacticsPuzzle) {
          console.log("[DemoBoard] API response:", d);
          setData(d);
          setGifFen(d.tacticsPuzzle.fen);
        } else {
          console.warn("[DemoBoard] API returned no puzzles:", d);
        }
      })
      .catch((err) => console.error("[DemoBoard] Fetch error:", err));
  }, []);

  /* ── GIF animation ── */
  useEffect(() => {
    if (phase !== "gif" || !data) return;
    const p = data.tacticsPuzzle;
    let frameIdx = 0;
    let timeout: ReturnType<typeof setTimeout>;

    function runFrame() {
      const chess = new Chess(p.fen);
      const fromSq = p.solution.slice(0, 2);
      const toSq = p.solution.slice(2, 4);

      if (frameIdx === 0) {
        setGifFen(p.fen);
        setGifStyles({});
        setGifLabel(t("demo.gifYourPosition").replace("{n}", String(p.moveNumber)));
      } else if (frameIdx === 1) {
        const moves = chess.moves({ square: fromSq as never, verbose: true });
        const wrongMove = moves.find((m) => m.to !== toSq) ?? moves[0];
        if (wrongMove) {
          chess.move(wrongMove);
          setGifFen(chess.fen());
          setGifStyles({ [wrongMove.to]: { backgroundColor: "rgba(255, 50, 50, 0.5)" } });
          setGifLabel(t("demo.gifBlunder").replace("{move}", wrongMove.san));
        }
      } else if (frameIdx === 2) {
        setGifFen(p.fen);
        setGifStyles({});
        setGifLabel(t("demo.gifYourPosition").replace("{n}", String(p.moveNumber)));
      } else {
        const move = chess.move({ from: fromSq, to: toSq, promotion: "q" });
        if (move) {
          setGifFen(chess.fen());
          setGifStyles({ [toSq]: { backgroundColor: "rgba(100, 200, 80, 0.5)" } });
          setGifLabel(t("demo.gifLearn"));
        }
      }
      timeout = setTimeout(() => { frameIdx = (frameIdx + 1) % 4; runFrame(); }, GIF_TIMINGS[frameIdx]);
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
    const pi = setInterval(() => setLoadingProgress((p) => (p >= LOADING_SQUARES ? p : p + 1)), LOADING_INTERVAL);
    const si = setInterval(() => setStatusIndex((i) => (i < STATUS_LINES.length - 1 ? i + 1 : i)), 500);
    const t = setTimeout(() => setPhase("results"), LOADING_DURATION);
    return () => { clearInterval(pi); clearInterval(si); clearTimeout(t); };
  }, [phase]);

  /* ── Select puzzle from row click ── */
  const selectPuzzle = useCallback((puzzle: PuzzleData) => {
    console.log("[DemoBoard] selectPuzzle called, FEN:", puzzle.fen.slice(0, 30), "solution:", puzzle.solution);
    const chess = new Chess(puzzle.fen);
    chessRef.current = chess;
    setActivePuzzle({ ...puzzle }); // spread to ensure new object reference
    setSelectedSquare(null);
    setSquareStyles({});
    setResultCorrect(null);
    setShowCta(false);
    setPhase("puzzle");
  }, []);

  /* ── Handle wrong move: show correct move visually ── */
  function showCorrectMove(puzzle: PuzzleData, wrongSquare: string) {
    // Flash red on wrong square
    setSquareStyles({ [wrongSquare]: { backgroundColor: "rgba(255, 50, 50, 0.6)" } });
    setResultCorrect(false);

    setTimeout(() => {
      // Play the correct move on a fresh board
      const chess = new Chess(puzzle.fen);
      const sol = puzzle.solution;
      const move = chess.move({ from: sol.slice(0, 2), to: sol.slice(2, 4), promotion: "q" });
      if (move) {
        setSquareStyles({ [move.to]: { backgroundColor: "rgba(100, 200, 80, 0.5)" } });
        setActivePuzzle({ ...puzzle, fen: chess.fen() }); // update board position
      }
      setPhase("result");
      // Show CTA after 1.5s
      setTimeout(() => setShowCta(true), 1500);
    }, 300);
  }

  /* ── Square click handler ── */
  function handleSquareClick({ square }: { piece: unknown; square: string }) {
    if (phase !== "puzzle" || !chessRef.current || !activePuzzle) return;
    const chess = chessRef.current;
    const playerSide = activePuzzle.playerColor === "white" ? "w" : "b";

    if (selectedSquare) {
      const move = chess.move({ from: selectedSquare, to: square, promotion: "q" });
      if (move) {
        const uci = move.from + move.to;
        if (uci === activePuzzle.solution) {
          setResultCorrect(true);
          setSquareStyles({ [square]: { backgroundColor: "rgba(100, 200, 80, 0.6)" } });
          setPhase("result");
          setTimeout(() => setShowCta(true), 1000);
        } else {
          chess.undo();
          showCorrectMove(activePuzzle, square);
        }
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
            styles[m.to] = { background: "radial-gradient(circle, rgba(0,0,0,0.2) 25%, transparent 25%)", borderRadius: "50%" };
          }
          setSquareStyles(styles);
        }
      }
    }
  }

  function handleDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (phase !== "puzzle" || !chessRef.current || !activePuzzle || !targetSquare) return false;
    const chess = chessRef.current;
    const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
    if (!move) return false;
    const uci = move.from + move.to;
    if (uci === activePuzzle.solution) {
      setResultCorrect(true);
      setSquareStyles({ [targetSquare]: { backgroundColor: "rgba(100, 200, 80, 0.6)" } });
      setPhase("result");
      setTimeout(() => setShowCta(true), 1000);
    } else {
      chess.undo();
      showCorrectMove(activePuzzle, targetSquare);
    }
    return true;
  }

  function formatSolution(uci: string, fen: string): string {
    try {
      const chess = new Chess(fen);
      const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: "q" });
      return move?.san ?? uci;
    } catch { return uci; }
  }

  /* ── Derived state ── */
  const showOverlay = phase === "loading" || (phase === "results" && !data);
  const isSideBySide = phase === "results" || phase === "puzzle" || phase === "result";

  let boardFen: string;
  let currentStyles: Record<string, React.CSSProperties>;
  let orientation: "white" | "black" = "white";
  let isInteractive = false;

  if (phase === "gif") {
    boardFen = gifFen;
    currentStyles = gifStyles;
  } else if (phase === "loading" || phase === "results") {
    boardFen = STARTING_FEN; // starting position until user picks a puzzle
    currentStyles = {};
  } else if (activePuzzle) {
    boardFen = activePuzzle.fen;
    currentStyles = squareStyles;
    orientation = activePuzzle.playerColor === "black" ? "black" : "white";
    isInteractive = phase === "puzzle";
  } else {
    boardFen = STARTING_FEN;
    currentStyles = {};
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: isSideBySide ? "row" : "column", gap: isSideBySide ? 24 : 12, alignItems: isSideBySide ? "flex-start" : "center" }}>
        {/* ── Board column ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 480, height: 480, maxWidth: "100%", flexShrink: 0, borderRadius: 12, overflow: "hidden", border: "4px solid #0e0e0e", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", position: "relative", aspectRatio: "1" }}>
            <ChessBoardWrapper
              position={boardFen}
              interactive={isInteractive}
              boardOrientation={orientation}
              onSquareClick={handleSquareClick}
              onPieceDrop={handleDrop}
              squareStyles={currentStyles}
            />

            {/* GIF label */}
            {phase === "gif" && gifLabel && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.7))", padding: "24px 16px 12px", pointerEvents: "none" }}>
                <p style={{ fontFamily: "Georgia, serif", fontSize: 14, color: "#fff", margin: 0 }}>{gifLabel}</p>
              </div>
            )}

            {/* Loading overlay */}
            {showOverlay && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                <CassandraLogo className="w-12 h-12 mb-4 animate-pulse" />
                <p style={{ fontFamily: "Georgia, serif", fontSize: 18, color: "#fff", marginBottom: 20 }}>{t("demo.sampleAnalysis")}</p>
                <div style={{ display: "flex" }}>
                  {Array.from({ length: LOADING_SQUARES }).map((_, i) => (
                    <div key={i} style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: i % 2 === 0 ? "#f0d9b5" : "#b58863" }}>
                      {i < loadingProgress && <span style={{ fontSize: 24, color: "#c8942a", animation: "demoFadeIn 0.2s ease-out" }}>&#9823;</span>}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 8 }}>
                  {STATUS_LINES.map((line, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, opacity: i <= statusIndex ? 1 : 0, transition: "opacity 0.4s ease" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c8942a", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "#bbb" }}>{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent strip — GIF only */}
          {phase === "gif" && data?.recentActivity && data.recentActivity.length > 0 && (
            <RecentStrip entries={data.recentActivity} t={t} />
          )}

          {/* Button — GIF only */}
          {phase === "gif" && (
            <button onClick={handleStartDemo} style={{ background: "#c8942a", color: "#fff", border: "none", borderRadius: 8, padding: "12px 32px", fontSize: 14, fontWeight: 500, cursor: "pointer", width: "100%", maxWidth: 480 }} className="hover:brightness-90 transition">
              {t("demo.seeItInAction")}
            </button>
          )}
        </div>

        {/* ── Side panel ── */}
        {isSideBySide && (
          <div style={{ width: 280, minHeight: 480, background: "#fff", border: "0.5px solid #e5e5e5", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 12, justifyContent: "center" }} className="hidden lg:flex">

            {/* Results */}
            {phase === "results" && data && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ fontSize: 12, color: "#999", margin: 0 }}>{t("demo.clickAny")}</p>
                <div style={{ height: 1, background: "#e5e5e5" }} />
                <ResultRow icon="&#9823;" count={data.missedTactics} label={t("demo.missedTactics")} onClick={() => { console.log("[DemoBoard] Row 1 clicked, FEN:", data.tacticsPuzzle.fen.slice(0, 30)); selectPuzzle(data.tacticsPuzzle); }} />
                <ResultRow icon="&#9889;" count={data.strongerMoves} label={t("demo.strongerMoves")} onClick={() => { console.log("[DemoBoard] Row 2 clicked, FEN:", data.scalesPuzzle.fen.slice(0, 30)); selectPuzzle(data.scalesPuzzle); }} />
                <ResultRow icon="&#128065;" count={data.retrograde} label={t("demo.positionsToReconstruct")} onClick={() => { console.log("[DemoBoard] Row 3 clicked, FEN:", data.echoPuzzle.fen.slice(0, 30)); selectPuzzle(data.echoPuzzle); }} />
              </div>
            )}

            {/* Puzzle */}
            {phase === "puzzle" && activePuzzle && (
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#111", margin: "0 0 2px" }}>{t("demo.samplePuzzle")}</p>
                <p style={{ fontSize: 12, color: "#999", margin: "0 0 12px" }}>{t("demo.fromDatabase")}</p>
                <div style={{ height: 1, background: "#e5e5e5", marginBottom: 12 }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: "#111", margin: "0 0 8px" }}>{t("demo.findWinningMove")}</p>
                <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, color: "#c8942a", background: "rgba(200,148,42,0.1)", border: "1px solid rgba(200,148,42,0.3)", borderRadius: 999, padding: "2px 10px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {activePuzzle.tacticType}
                </span>
                <p style={{ fontSize: 13, color: "#888", margin: "12px 0 0" }}>{t("demo.clickPieceToStart")}</p>
              </div>
            )}

            {/* Result */}
            {phase === "result" && activePuzzle && (
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#111", margin: "0 0 2px" }}>{t("demo.samplePuzzle")}</p>
                <p style={{ fontSize: 12, color: "#999", margin: "0 0 12px" }}>{t("demo.fromDatabase")}</p>
                <div style={{ height: 1, background: "#e5e5e5", marginBottom: 12 }} />
                {resultCorrect ? (
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#16a34a", margin: "0 0 8px" }}>{t("demo.correct")}</p>
                ) : (
                  <>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#dc2626", margin: "0 0 4px" }}>{t("demo.notQuite")}</p>
                    <p style={{ fontSize: 13, color: "#666", margin: "0 0 8px" }}>{t("demo.theWinWas")} <strong>{formatSolution(activePuzzle.solution, data?.tacticsPuzzle.fen ?? activePuzzle.fen)}</strong>.</p>
                  </>
                )}
                {showCta && (
                  <button
                    onClick={() => setShowModal(true)}
                    style={{ marginTop: 16, width: "100%", fontSize: 14, fontWeight: 500, background: "#c8942a", color: "#fff", border: "none", borderRadius: 8, padding: "12px 20px", cursor: "pointer" }}
                    className="hover:brightness-90 transition"
                  >
                    {t("demo.findMistakes")}
                  </button>
                )}
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

      {/* ── Modal ── */}
      {showModal && <ConnectModal onClose={() => setShowModal(false)} />}
    </>
  );
}

/* ── Result row ── */

function ResultRow({ icon, count, label, onClick }: { icon: string; count: number; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", borderLeft: "3px solid transparent", transition: "all 0.15s ease", fontSize: 13, color: "#555" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#f9f7f4"; e.currentTarget.style.borderLeftColor = "#c8942a"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderLeftColor = "transparent"; }}
    >
      <span dangerouslySetInnerHTML={{ __html: icon }} />
      <span><strong>{count}</strong> {label}</span>
    </button>
  );
}

/* ── Recent strip ── */

function RecentStrip({ entries, t }: { entries: RecentEntry[]; t: (key: string) => string }) {
  const [step, setStep] = useState(0);
  const [transitioning, setTransitioning] = useState(true);
  const ENTRY_W = 260;
  const count = entries.length;
  const tripled = [...entries, ...entries, ...entries];

  useEffect(() => {
    const t = setInterval(() => setStep((s) => s + 1), 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (step >= count) {
      const snap = setTimeout(() => {
        setTransitioning(false);
        setStep((s) => s - count);
        requestAnimationFrame(() => requestAnimationFrame(() => setTransitioning(true)));
      }, 800);
      return () => clearTimeout(snap);
    }
  }, [step, count]);

  return (
    <div style={{ width: 480, maxWidth: "100%", background: "#fff", border: "0.5px solid #e5e5e5", borderRadius: 8, padding: "12px 0", overflow: "hidden", position: "relative" }}>
      <div style={{ display: "flex", transition: transitioning ? "transform 0.8s ease" : "none", transform: `translateX(-${step * ENTRY_W}px)` }}>
        {tripled.map((entry, i) => (
          <div key={`s-${i}`} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#555", whiteSpace: "nowrap", flexShrink: 0, width: ENTRY_W, padding: "0 16px", boxSizing: "border-box" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c8942a", flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", maxWidth: ENTRY_W - 46 }}>{entry.username} — {entry.puzzleCount} {t("demo.puzzles")} <span style={{ color: "#ccc" }}>·</span> {entry.timeAgo}</span>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 32, background: "linear-gradient(to right, transparent, white)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 32, background: "linear-gradient(to left, transparent, white)", pointerEvents: "none" }} />
    </div>
  );
}

/* ── Connect modal ── */

function ConnectModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [platform, setPlatform] = useState<"chesscom" | "lichess">("chesscom");
  const [username, setUsername] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const u = username.trim();
    if (!u) return;
    router.push(`/connect?username=${encodeURIComponent(u)}&platform=${platform}`);
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#0e0e0e", borderRadius: 16, padding: 32, width: 420, maxWidth: "90vw", border: "0.5px solid #333", position: "relative" }}
      >
        {/* Close */}
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#555", fontSize: 14, cursor: "pointer", padding: 4 }}>&times;</button>

        {/* Icon */}
        <CassandraLogo className="w-7 h-7 mb-4" />

        {/* Title */}
        <p style={{ fontFamily: "Georgia, serif", fontSize: 24, color: "#fff", margin: "0 0 8px" }}>{t("demo.modalTitle")}</p>
        <p style={{ fontSize: 14, color: "#888", margin: "0 0 24px" }}>{t("demo.modalSubtitle")}</p>

        {/* Platform toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => setPlatform("chesscom")}
            style={{
              fontSize: 12, fontWeight: platform === "chesscom" ? 600 : 400, padding: "6px 16px", borderRadius: 6, cursor: "pointer", border: "none", transition: "all 0.15s",
              background: platform === "chesscom" ? "#c8942a" : "#2a2a2a",
              color: platform === "chesscom" ? "#fff" : "#ccc",
            }}
          >
            Chess.com
          </button>
          <button
            type="button"
            onClick={() => setPlatform("lichess")}
            style={{
              fontSize: 12, fontWeight: platform === "lichess" ? 600 : 400, padding: "6px 16px", borderRadius: 6, cursor: "pointer", border: "none", transition: "all 0.15s",
              background: platform === "lichess" ? "#c8942a" : "#2a2a2a",
              color: platform === "lichess" ? "#fff" : "#ccc",
            }}
          >
            Lichess
          </button>
        </div>

        {/* Input + submit */}
        <form onSubmit={handleSubmit} style={{ display: "flex", marginBottom: 16 }}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={platform === "chesscom" ? "Chess.com username" : "Lichess username"}
            autoComplete="off"
            required
            style={{ flex: 1, height: 48, fontSize: 14, background: "#1e1e1e", border: "1px solid #444", borderRadius: "8px 0 0 8px", padding: "0 14px", color: "#eee", outline: "none" }}
          />
          <button
            type="submit"
            style={{ height: 48, fontSize: 14, fontWeight: 500, background: "#c8942a", color: "#fff", border: "none", borderRadius: "0 8px 8px 0", padding: "0 20px", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {t("demo.modalSubmit")}
          </button>
        </form>

        {/* Trust row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#666" }}>
          <span>{t("landing.hero.trustFree")}</span>
          <span style={{ color: "#c8942a" }}>&middot;</span>
          <span>{t("landing.hero.trustUnlimited")}</span>
          <span style={{ color: "#c8942a" }}>&middot;</span>
          <span>{t("landing.hero.trustNoPaywall")}</span>
          <span style={{ color: "#c8942a" }}>&middot;</span>
          <span>{t("landing.hero.trustPersonalised")}</span>
        </div>
      </div>
    </div>
  );
}
