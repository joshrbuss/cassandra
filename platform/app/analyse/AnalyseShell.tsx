"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Chess } from "chess.js";

const ChessBoardWrapper = dynamic(() => import("@/components/ChessBoardWrapper"), {
  ssr: false,
  loading: () => <div className="w-full aspect-square bg-[#262522] rounded animate-pulse" />,
});

// ─── Colors ──────────────────────────────────────────────────────────────────

const C = {
  bg: "#111210",
  panel: "#1a1a17",
  panelBorder: "#2a2a24",
  gold: "#c8a96e",
  goldDim: "#c8a96e44",
  text: "#e8e6e1",
  textDim: "#9b9892",
  textMuted: "#6b6963",
  brilliant: "#2ecfb0",
  great: "#5b9cf6",
  best: "#4a9c6b",
  excellent: "#72b87e",
  good: "#9acc90",
  book: "#a08866",
  crowd: "#c8a96e",
  missed: "#d4893a",
  inaccuracy: "#d4b94a",
  mistake: "#d4893a",
  blunder: "#c0504a",
  white: "#ffffff",
  black: "#000000",
};

// ─── Types ───────────────────────────────────────────────────────────────────

type MoveClassification =
  | "brilliant" | "great" | "best" | "excellent" | "good"
  | "book" | "crowd" | "missed" | "inaccuracy" | "mistake" | "blunder";

interface AnalysedMove {
  san: string;
  uci: string;
  fen: string; // position AFTER this move
  evalCp: number; // eval from white's perspective after this move
  classification: MoveClassification;
  side: "w" | "b";
  moveNumber: number; // 1-based
  timeSpent?: number; // seconds
}

interface GameData {
  white: { name: string; elo: number; clock: string };
  black: { name: string; elo: number; clock: string };
  result: string;
  timeControl: string;
  totalMoves: number;
  moves: AnalysedMove[];
  userColor: "w" | "b";
  accuracy: { user: number; opp: number };
}

// ─── Mock data ───────────────────────────────────────────────────────────────

const MOCK_PGN = "1. e4 d5 2. exd5 Qxd5 3. Nc3 Qa5 4. d4 Nf6 5. Bd2 c6 6. Nf3 Bf5 7. Bc4 e6 8. O-O Bd6 9. Re1 O-O 10. a3 Qc7 11. Nh4 Bg6 12. Nxg6 hxg6 13. Bg5 Nbd7 14. Qf3 Nb6 15. Ba2 Nbd5 16. Nxd5 Nxd5 17. Bxd5 cxd5 18. Qg3 Rfc8 19. c3 a5 20. Bh6 Bf8 21. Bg5 Bd6 22. Qf3 Qd7 23. Bh6 Bxh2+";

function buildMockGame(): GameData {
  const chess = new Chess();
  const moves: AnalysedMove[] = [];
  const tokens = MOCK_PGN.replace(/\d+\.\s*/g, "").trim().split(/\s+/);

  // Classification pattern for demo
  const classifications: MoveClassification[] = [
    "book", "book", "book", "book", "best", "crowd", "good", "excellent",
    "best", "good", "best", "good", "excellent", "good", "inaccuracy", "best",
    "missed", "good", "best", "good", "good", "excellent", "best", "best",
    "good", "mistake", "good", "inaccuracy", "good", "best", "good", "best",
    "good", "blunder", "best", "good", "mistake", "good", "good", "good",
    "good", "mistake", "best", "excellent", "brilliant",
  ];

  // Eval curve (mock centipawns from white's perspective)
  const evals = [
    20, 15, 30, 10, 45, -10, 35, 25, 50, 20, 55, 30, 40, 35, 60, 25,
    80, 40, 70, 50, 65, 45, 75, 55, 90, 30, 85, 50, 70, 60, 80, 55,
    95, -20, 100, 70, 45, 65, 80, 70, 85, 30, 100, 90, 150,
  ];

  for (let i = 0; i < tokens.length; i++) {
    try {
      const result = chess.move(tokens[i]);
      if (!result) continue;
      const side: "w" | "b" = i % 2 === 0 ? "w" : "b";
      moves.push({
        san: result.san,
        uci: `${result.from}${result.to}${result.promotion ?? ""}`,
        fen: chess.fen(),
        evalCp: evals[i] ?? 0,
        classification: classifications[i] ?? "good",
        side,
        moveNumber: Math.floor(i / 2) + 1,
        timeSpent: 3 + Math.floor(Math.random() * 25),
      });
    } catch { break; }
  }

  return {
    white: { name: "j_r_b_01", elo: 804, clock: "3:00" },
    black: { name: "opponent42", elo: 832, clock: "3:00" },
    result: "Win",
    timeControl: "Blitz 3|2",
    totalMoves: Math.floor(moves.length / 2),
    moves,
    userColor: "w",
    accuracy: { user: 72, opp: 58 },
  };
}

// ─── Classification config ───────────────────────────────────────────────────

const CLASS_CONFIG: Record<MoveClassification, {
  label: string; symbol: string; color: string; isCassandra?: boolean; subtitle?: string;
}> = {
  brilliant:  { label: "Brilliant",     symbol: "!!",  color: C.brilliant },
  great:      { label: "Great",         symbol: "!",   color: C.great },
  best:       { label: "Best",          symbol: "\u2605", color: C.best },
  excellent:  { label: "Excellent",     symbol: "\u2713", color: C.excellent },
  good:       { label: "Good",          symbol: "\u25CF", color: C.good },
  book:       { label: "Book",          symbol: "BK",  color: C.book },
  crowd:      { label: "Crowd",         symbol: "\uD83D\uDD2E", color: C.crowd, isCassandra: true, subtitle: "most popular move at your level that weakens your position" },
  missed:     { label: "Missed Chance", symbol: "\u25CE", color: C.missed, subtitle: "tactic existed that you missed" },
  inaccuracy: { label: "Inaccuracy",    symbol: "?!",  color: C.inaccuracy },
  mistake:    { label: "Mistake",       symbol: "?",   color: C.mistake },
  blunder:    { label: "Blunder",       symbol: "??",  color: C.blunder },
};

const CLASS_ORDER: MoveClassification[] = [
  "brilliant", "great", "best", "excellent", "good", "book",
  "crowd", "missed", "inaccuracy", "mistake", "blunder",
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function AnalyseShell() {
  const game = useMemo(() => buildMockGame(), []);
  const [moveIdx, setMoveIdx] = useState(-1); // -1 = starting position

  const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const currentFen = moveIdx >= 0 ? game.moves[moveIdx].fen : startFen;
  const currentMove = moveIdx >= 0 ? game.moves[moveIdx] : null;

  // Eval bar: from white perspective, clamp to ±500
  const evalCp = currentMove?.evalCp ?? 20;
  const evalPct = Math.max(5, Math.min(95, 50 + (evalCp / 500) * 50));

  // Highlight squares for last move
  const squareStyles = currentMove
    ? {
        [currentMove.uci.slice(0, 2)]: { backgroundColor: "rgba(200, 169, 110, 0.4)" },
        [currentMove.uci.slice(2, 4)]: { backgroundColor: "rgba(200, 169, 110, 0.5)" },
      }
    : {};

  // Count classifications
  const userMoves = game.moves.filter((m) => m.side === game.userColor);
  const oppMoves = game.moves.filter((m) => m.side !== game.userColor);
  function countClass(moves: AnalysedMove[], cls: MoveClassification) {
    return moves.filter((m) => m.classification === cls).length;
  }

  // Pair moves for move list (white, black)
  const movePairs: { num: number; white?: AnalysedMove; wIdx: number; black?: AnalysedMove; bIdx: number }[] = [];
  for (let i = 0; i < game.moves.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: game.moves[i],
      wIdx: i,
      black: game.moves[i + 1],
      bIdx: i + 1,
    });
  }

  function goPrev() { setMoveIdx((i) => Math.max(-1, i - 1)); }
  function goNext() { setMoveIdx((i) => Math.min(game.moves.length - 1, i + 1)); }
  function goStart() { setMoveIdx(-1); }
  function goEnd() { setMoveIdx(game.moves.length - 1); }

  // Keyboard nav
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") goPrev();
    else if (e.key === "ArrowRight") goNext();
    else if (e.key === "Home") goStart();
    else if (e.key === "End") goEnd();
  }

  const userInfo = game.userColor === "w" ? game.white : game.black;
  const oppInfo = game.userColor === "w" ? game.black : game.white;
  const boardOrientation = game.userColor === "w" ? "white" : "black";

  // Top player = opponent, bottom = user (from user's perspective)
  const topPlayer = oppInfo;
  const bottomPlayer = userInfo;

  return (
    <div
      className="min-h-screen flex"
      style={{ background: C.bg, color: C.text, fontFamily: "'Instrument Sans', system-ui, sans-serif" }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* ══════ LEFT: BOARD ══════ */}
      <div className="flex-[7] min-w-0 flex flex-col items-center justify-center p-4 lg:p-6">
        <div className="w-full max-w-[640px]">

          {/* Top player bar (opponent) */}
          <div className="flex items-center justify-between px-1 py-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full" style={{ background: game.userColor === "w" ? "#333" : "#ddd" }} />
              <span className="text-sm font-semibold" style={{ color: C.text }}>{topPlayer.name}</span>
              <span className="text-xs" style={{ color: C.textMuted }}>({topPlayer.elo})</span>
            </div>
            <span className="text-sm font-mono" style={{ color: C.textDim }}>{topPlayer.clock}</span>
          </div>

          {/* Board + eval bar */}
          <div className="flex gap-1.5">
            {/* Eval bar (vertical) */}
            <div className="w-5 rounded overflow-hidden flex flex-col relative" style={{ background: "#333" }}>
              {/* White portion (top = black advantage, bottom = white advantage) */}
              <div
                className="transition-all duration-300 ease-out"
                style={{ height: `${100 - evalPct}%`, background: "#333" }}
              />
              <div
                className="transition-all duration-300 ease-out flex-1"
                style={{ background: "#e8e6e1" }}
              />
              {/* Eval label */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-[9px] font-mono font-bold"
                  style={{
                    color: evalCp >= 0 ? "#333" : "#e8e6e1",
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                  }}
                >
                  {evalCp >= 0 ? "+" : ""}{(evalCp / 100).toFixed(1)}
                </span>
              </div>
            </div>

            {/* Board */}
            <div className="flex-1 aspect-square rounded overflow-hidden">
              <ChessBoardWrapper
                position={currentFen}
                interactive={false}
                boardOrientation={boardOrientation as "white" | "black"}
                squareStyles={squareStyles}
              />
            </div>
          </div>

          {/* Bottom player bar (user) */}
          <div className="flex items-center justify-between px-1 py-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full" style={{ background: game.userColor === "w" ? "#ddd" : "#333" }} />
              <span className="text-sm font-semibold" style={{ color: C.gold }}>{bottomPlayer.name}</span>
              <span className="text-xs" style={{ color: C.textMuted }}>({bottomPlayer.elo})</span>
            </div>
            <span className="text-sm font-mono" style={{ color: C.textDim }}>{bottomPlayer.clock}</span>
          </div>

          {/* Navigation bar */}
          <div className="flex items-center justify-center gap-2 mt-1 rounded-lg px-3 py-2" style={{ background: C.panel }}>
            <NavBtn onClick={goStart}>{"\u23EE"}</NavBtn>
            <NavBtn onClick={goPrev}>{"\u25C0"}</NavBtn>
            <div className="flex-1 text-center">
              {currentMove ? (
                <span className="text-sm font-mono" style={{ color: C.text }}>
                  <span style={{ color: C.textMuted }}>Move {currentMove.moveNumber}</span>
                  {" \u00B7 "}
                  <span className="font-semibold">{currentMove.san}</span>
                  <span className="ml-2">
                    <ClassDot classification={currentMove.classification} size={10} />
                  </span>
                </span>
              ) : (
                <span className="text-sm" style={{ color: C.textMuted }}>Starting position</span>
              )}
            </div>
            <NavBtn onClick={goNext}>{"\u25B6"}</NavBtn>
            <NavBtn onClick={goEnd}>{"\u23ED"}</NavBtn>
          </div>
        </div>
      </div>

      {/* ══════ RIGHT: ANALYSIS PANEL ══════ */}
      <div
        className="flex-[3] min-w-[320px] max-w-[420px] border-l overflow-y-auto"
        style={{ background: C.panel, borderColor: C.panelBorder }}
      >
        <div className="p-4 space-y-4">

          {/* Header */}
          <h2 className="text-lg font-bold" style={{ fontFamily: "'Georgia', serif", color: C.gold }}>
            Match Analysis
          </h2>

          {/* Narrative bubble */}
          <div className="flex gap-2 items-start rounded-lg p-3" style={{ background: "#22221e" }}>
            <span className="text-lg mt-0.5">{"\uD83D\uDD2E"}</span>
            <p className="text-sm leading-relaxed" style={{ color: C.textDim }}>
              Filler text for now — this is where the AI narrative summary of the game will appear.
              Cassandra will describe key moments, patterns, and suggestions.
            </p>
          </div>

          {/* Eval graph */}
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: C.textMuted }}>Evaluation</p>
            <EvalGraph moves={game.moves} currentIdx={moveIdx} userColor={game.userColor} />
          </div>

          {/* Accuracy row */}
          <div className="rounded-lg p-3" style={{ background: "#22221e" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-center flex-1">
                <p className="text-2xl font-bold font-mono" style={{ color: C.gold }}>{game.accuracy.user}%</p>
                <p className="text-[10px] uppercase" style={{ color: C.textMuted }}>{userInfo.name}</p>
                <AccuracyBar moves={userMoves} />
              </div>
              <div className="text-center px-4">
                <p className="text-xs font-semibold" style={{ color: C.textDim }}>{game.result}</p>
                <p className="text-[10px]" style={{ color: C.textMuted }}>{game.timeControl}</p>
                <p className="text-[10px]" style={{ color: C.textMuted }}>{game.totalMoves} moves</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-2xl font-bold font-mono" style={{ color: C.textDim }}>{game.accuracy.opp}%</p>
                <p className="text-[10px] uppercase" style={{ color: C.textMuted }}>{oppInfo.name}</p>
                <AccuracyBar moves={oppMoves} />
              </div>
            </div>
          </div>

          {/* Move classification table */}
          <div className="rounded-lg overflow-hidden" style={{ background: "#22221e" }}>
            {CLASS_ORDER.map((cls) => {
              const cfg = CLASS_CONFIG[cls];
              const userCount = countClass(userMoves, cls);
              const oppCount = countClass(oppMoves, cls);
              const isCassandraRow = cfg.isCassandra;
              return (
                <div
                  key={cls}
                  className="flex items-center px-3 py-1.5 border-b"
                  style={{
                    borderColor: "#2a2a24",
                    background: isCassandraRow ? C.goldDim : "transparent",
                  }}
                >
                  <ClassDot classification={cls} size={14} />
                  <div className="ml-2 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold" style={{ color: cfg.color }}>
                        {cfg.label}
                      </span>
                      <span className="text-[10px] font-mono" style={{ color: C.textMuted }}>
                        {cfg.symbol}
                      </span>
                      {isCassandraRow && (
                        <span
                          className="text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
                          style={{ background: C.gold, color: C.bg }}
                        >
                          Cassandra
                        </span>
                      )}
                    </div>
                    {cfg.subtitle && (
                      <p className="text-[9px] leading-tight" style={{ color: C.textMuted }}>{cfg.subtitle}</p>
                    )}
                  </div>
                  <span className="text-xs font-mono w-6 text-right" style={{ color: C.text }}>
                    {userCount}
                  </span>
                  <span className="text-[10px] mx-1" style={{ color: C.textMuted }}>/</span>
                  <span className="text-xs font-mono w-6 text-left" style={{ color: C.textDim }}>
                    {isCassandraRow ? "\u2014" : oppCount}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Move list */}
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: C.textMuted }}>Moves</p>
            <div className="rounded-lg overflow-hidden" style={{ background: "#22221e" }}>
              {movePairs.map((pair) => (
                <div key={pair.num} className="flex border-b" style={{ borderColor: "#2a2a24" }}>
                  {/* Move number */}
                  <div className="w-8 flex-shrink-0 text-center py-1" style={{ color: C.textMuted }}>
                    <span className="text-[10px] font-mono">{pair.num}.</span>
                  </div>
                  {/* White move */}
                  <MoveCell
                    move={pair.white}
                    idx={pair.wIdx}
                    selected={moveIdx === pair.wIdx}
                    onClick={() => setMoveIdx(pair.wIdx)}
                  />
                  {/* Black move */}
                  {pair.black ? (
                    <MoveCell
                      move={pair.black}
                      idx={pair.bIdx}
                      selected={moveIdx === pair.bIdx}
                      onClick={() => setMoveIdx(pair.bIdx)}
                    />
                  ) : (
                    <div className="flex-1" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            className="w-full py-3 rounded-lg font-semibold text-sm transition-colors hover:brightness-110"
            style={{ background: C.gold, color: C.bg }}
          >
            Train these patterns in Kairos &rarr;
          </button>
          <p className="text-center text-[10px]" style={{ color: C.textMuted }}>
            Dominant blindness &middot; Fork recognition &middot; Crowd traps
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function NavBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-8 h-8 flex items-center justify-center rounded text-sm hover:brightness-125 transition-colors"
      style={{ color: C.textDim, background: "#22221e" }}
    >
      {children}
    </button>
  );
}

function ClassDot({ classification, size = 12 }: { classification: MoveClassification; size?: number }) {
  const cfg = CLASS_CONFIG[classification];
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{ width: size, height: size, background: cfg.color }}
    />
  );
}

function MoveCell({
  move, idx, selected, onClick,
}: {
  move?: AnalysedMove; idx: number; selected: boolean; onClick: () => void;
}) {
  if (!move) return <div className="flex-1" />;
  const cfg = CLASS_CONFIG[move.classification];
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center gap-1 px-2 py-1 text-left transition-colors"
      style={{
        background: selected ? "#2a2a24" : "transparent",
        borderLeft: selected ? `2px solid ${C.gold}` : "2px solid transparent",
      }}
    >
      <ClassDot classification={move.classification} size={8} />
      <span className="text-xs font-mono" style={{ color: selected ? C.text : C.textDim }}>
        {move.san}
      </span>
      {cfg.isCassandra && (
        <span className="text-[7px] px-1 rounded" style={{ background: C.goldDim, color: C.gold }}>
          {"\uD83D\uDD2E"}
        </span>
      )}
    </button>
  );
}

function AccuracyBar({ moves }: { moves: AnalysedMove[] }) {
  const total = moves.length || 1;
  const good = moves.filter((m) =>
    ["brilliant", "great", "best", "excellent", "good", "book"].includes(m.classification)
  ).length;
  const inac = moves.filter((m) => m.classification === "inaccuracy").length;
  const mis = moves.filter((m) => ["mistake", "missed"].includes(m.classification)).length;
  const blun = moves.filter((m) => m.classification === "blunder").length;

  return (
    <div className="flex h-1.5 rounded-full overflow-hidden mt-1" style={{ background: "#333" }}>
      <div style={{ width: `${(good / total) * 100}%`, background: C.best }} />
      <div style={{ width: `${(inac / total) * 100}%`, background: C.inaccuracy }} />
      <div style={{ width: `${(mis / total) * 100}%`, background: C.mistake }} />
      <div style={{ width: `${(blun / total) * 100}%`, background: C.blunder }} />
    </div>
  );
}

function EvalGraph({ moves, currentIdx, userColor }: { moves: AnalysedMove[]; currentIdx: number; userColor: "w" | "b" }) {
  const height = 60;
  const width = 300;
  const len = moves.length;
  if (len === 0) return null;

  // Build eval points (clamp to ±300 for display)
  const points = moves.map((m, i) => {
    const cp = Math.max(-300, Math.min(300, m.evalCp));
    const x = (i / (len - 1)) * width;
    const y = height / 2 - (cp / 300) * (height / 2);
    return { x, y };
  });

  // SVG path
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  // Median time for purple spike detection
  const times = moves.filter((m) => m.side === userColor && m.timeSpent).map((m) => m.timeSpent!);
  times.sort((a, b) => a - b);
  const medianTime = times.length > 0 ? times[Math.floor(times.length / 2)] : 10;

  // Current move marker
  const markerX = currentIdx >= 0 ? (currentIdx / (len - 1)) * width : -10;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full rounded" style={{ background: "#1a1a17", height: 60 }}>
      {/* Center line */}
      <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="#2a2a24" strokeWidth={0.5} />

      {/* Filled area */}
      <path d={areaPath} fill={C.gold} opacity={0.08} />

      {/* Eval line */}
      <path d={linePath} fill="none" stroke={C.gold} strokeWidth={1.5} opacity={0.7} />

      {/* Purple spikes for slow moves */}
      {moves.map((m, i) => {
        if (m.side !== userColor || !m.timeSpent || m.timeSpent <= medianTime) return null;
        const x = (i / (len - 1)) * width;
        return (
          <line
            key={`spike-${i}`}
            x1={x} y1={0} x2={x} y2={height}
            stroke="#8b5cf6" strokeWidth={1} opacity={0.3}
          />
        );
      })}

      {/* Current move marker */}
      {currentIdx >= 0 && (
        <line x1={markerX} y1={0} x2={markerX} y2={height} stroke={C.gold} strokeWidth={1} opacity={0.6} />
      )}
    </svg>
  );
}
