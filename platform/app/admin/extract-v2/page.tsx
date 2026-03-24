"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { extractPuzzlesV2Client, type ExtractResultV2, type PuzzleCandidateV2, type MoveEvalData } from "@/lib/chess-client/extractPuzzlesV2Client";
import { terminateEngine } from "@/lib/chess-client/stockfishBrowser";

const ChessBoardWrapper = dynamic(() => import("@/components/ChessBoardWrapper"), { ssr: false });

// ─── Types ──────────────────────────────────────────────────────────────────

interface PuzzleResult {
  id: string;
  moveNumber: number;
  solutionMoves: string;
  solutionDepth: number;
  themes: string;
  rating: number;
  evalCp: number;
  fen: string;
}

interface MoveEvalResult {
  move: number;
  side: string;
  cpl: number;
  phase: string;
  played: string;
  best: string;
}

interface GameResult {
  gameUrl?: string;
  accuracy: {
    overall: number;
    opening: number;
    middlegame: number;
    endgame: number;
    averageCpl: number;
    moveCount: number;
  };
  totalMoves: number;
  puzzleCount: number;
  puzzles: PuzzleResult[];
  moveEvals: MoveEvalResult[];
  stockfishAvailable: boolean;
  stockfishError?: string;
}

interface FullResponse {
  ok: boolean;
  error?: string;
  username?: string;
  gamesAnalysed?: number;
  totalPositionsAnalysed?: number;
  puzzlesExtracted?: number;
  puzzlesStored?: number;
  puzzlesSkipped?: number;
  elapsedSeconds?: number;
  games?: GameResult[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ExtractV2Admin() {
  const [username, setUsername] = useState("j_r_b_01");
  const [maxGames, setMaxGames] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FullResponse | null>(null);
  const [selectedPuzzle, setSelectedPuzzle] = useState<PuzzleResult | null>(null);
  const [expandedGame, setExpandedGame] = useState<number | null>(0);
  const [progress, setProgress] = useState("");
  const abortRef = useRef(false);

  async function handleRun() {
    setLoading(true);
    setData(null);
    setSelectedPuzzle(null);
    abortRef.current = false;
    const start = Date.now();

    try {
      // Step 1: Fetch games from server
      setProgress("Fetching games from Chess.com...");
      const fetchRes = await fetch("/api/extract-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, maxGames }),
      });
      const fetchData = await fetchRes.json();

      if (!fetchData.ok) {
        setData({ ok: false, error: fetchData.error });
        return;
      }

      const pgns: string[] = fetchData.pgns;
      const sourceUserId: string | null = fetchData.sourceUserId;

      // Step 2: Analyse each game client-side with browser WASM Stockfish
      const gameResults: GameResult[] = [];
      const storeGames: Array<{
        gameUrl?: string;
        puzzles: PuzzleCandidateV2[];
        moveEvals: MoveEvalData[];
      }> = [];
      let totalPositions = 0;
      let totalPuzzles = 0;

      for (let g = 0; g < pgns.length; g++) {
        if (abortRef.current) break;
        setProgress(`Analysing game ${g + 1}/${pgns.length} with Stockfish WASM (depth 8)...`);

        const result = await extractPuzzlesV2Client(
          pgns[g],
          username,
          (posIdx, totalPos) => {
            setProgress(
              `Game ${g + 1}/${pgns.length} — position ${posIdx + 1}/${totalPos} ` +
              `(${totalPuzzles} puzzles so far)`
            );
          },
        );

        totalPositions += result.totalPositions;
        totalPuzzles += result.candidates.length;

        gameResults.push({
          gameUrl: result.gameUrl,
          accuracy: result.accuracy,
          totalMoves: result.totalPositions,
          puzzleCount: result.candidates.length,
          stockfishAvailable: result.stockfishAvailable,
          stockfishError: result.stockfishError,
          puzzles: result.candidates.map((c) => ({
            id: c.id,
            moveNumber: c.moveNumber ?? 0,
            solutionMoves: c.solutionMoves,
            solutionDepth: c.solutionMoves.split(" ").length,
            themes: c.themes,
            rating: c.rating,
            evalCp: c.evalCp ?? 0,
            fen: c.solvingFen,
          })),
          moveEvals: result.moveEvals.map((e) => ({
            move: e.moveNumber,
            side: e.side,
            cpl: e.cpl,
            phase: e.phase,
            played: e.movePlayed,
            best: e.bestMove,
          })),
        });

        storeGames.push({
          gameUrl: result.gameUrl,
          puzzles: result.candidates,
          moveEvals: result.moveEvals,
        });
      }

      // Step 3: Store results on server
      setProgress("Storing results...");
      const storeRes = await fetch("/api/extract-v2/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUserId, games: storeGames }),
      });
      const storeData = await storeRes.json();

      const elapsed = ((Date.now() - start) / 1000).toFixed(1);

      setData({
        ok: true,
        username,
        gamesAnalysed: pgns.length,
        totalPositionsAnalysed: totalPositions,
        puzzlesExtracted: totalPuzzles,
        puzzlesStored: storeData.stored ?? 0,
        puzzlesSkipped: storeData.skipped ?? 0,
        elapsedSeconds: parseFloat(elapsed),
        games: gameResults,
      });

      if (gameResults[0]?.puzzles?.[0]) {
        setSelectedPuzzle(gameResults[0].puzzles[0]);
      }
    } catch (err) {
      setData({ ok: false, error: String(err) });
    } finally {
      setLoading(false);
      setProgress("");
      terminateEngine();
    }
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#0e0e0e", color: "#eee", minHeight: "100vh", padding: "24px 32px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, color: "#c8942a", margin: "0 0 4px" }}>
          Extract V2 — Test Console
        </h1>
        <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
          Client-side extraction using browser WASM Stockfish (depth 8)
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>USERNAME</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ height: 40, fontSize: 14, background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "0 12px", color: "#eee", width: 200 }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>MAX GAMES</label>
          <input
            type="number"
            value={maxGames}
            onChange={(e) => setMaxGames(Number(e.target.value))}
            min={1}
            max={10}
            style={{ height: 40, fontSize: 14, background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "0 12px", color: "#eee", width: 80 }}
          />
        </div>
        <button
          onClick={handleRun}
          disabled={loading}
          style={{
            height: 40, fontSize: 14, fontWeight: 600, background: loading ? "#555" : "#c8942a", color: "#fff",
            border: "none", borderRadius: 8, padding: "0 24px", cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Running..." : "Run extraction"}
        </button>
      </div>

      {/* Progress */}
      {loading && (
        <div style={{ background: "#1a1a1a", borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <p style={{ fontSize: 14, color: "#c8942a", margin: 0, animation: "pulse 1.5s ease-in-out infinite" }}>
            {progress || "Initialising..."}
          </p>
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
        </div>
      )}

      {/* Error */}
      {data && !data.ok && (
        <div style={{ background: "#2a1515", borderRadius: 12, padding: 20, border: "1px solid #5a2020" }}>
          <p style={{ color: "#ff6b6b", fontWeight: 600, margin: "0 0 4px" }}>Error</p>
          <p style={{ color: "#ccc", fontSize: 13, margin: 0 }}>{data.error}</p>
        </div>
      )}

      {/* Raw debug output */}
      {data && !loading && (
        <details style={{ marginBottom: 24 }}>
          <summary style={{ fontSize: 12, color: "#888", cursor: "pointer", marginBottom: 8 }}>Raw API response</summary>
          <pre style={{ background: "#111", border: "1px solid #333", borderRadius: 8, padding: 16, fontSize: 12, color: "#aaa", overflow: "auto", maxHeight: 600, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>
      )}

      {/* Results */}
      {data?.ok && data.games && (
        <div>
          {/* Summary bar */}
          <div style={{ display: "flex", gap: 24, marginBottom: 24, background: "#1a1a1a", borderRadius: 12, padding: "16px 24px" }}>
            <Stat label="Games" value={data.gamesAnalysed!} />
            <Stat label="Positions" value={data.totalPositionsAnalysed!} />
            <Stat label="Puzzles" value={data.puzzlesExtracted!} />
            <Stat label="Stored" value={data.puzzlesStored!} />
            <Stat label="Skipped" value={data.puzzlesSkipped!} />
            <Stat label="Time" value={`${data.elapsedSeconds}s`} />
          </div>

          {/* Game cards + board */}
          <div style={{ display: "flex", gap: 24 }}>
            {/* Left: game list */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {data.games.map((game, gi) => (
                <GameCard
                  key={gi}
                  game={game}
                  index={gi}
                  expanded={expandedGame === gi}
                  onToggle={() => setExpandedGame(expandedGame === gi ? null : gi)}
                  selectedPuzzleId={selectedPuzzle?.id}
                  onSelectPuzzle={setSelectedPuzzle}
                />
              ))}
            </div>

            {/* Right: mini board */}
            <div style={{ width: 320, flexShrink: 0, position: "sticky", top: 24, alignSelf: "flex-start" }}>
              {selectedPuzzle ? (
                <div style={{ background: "#1a1a1a", borderRadius: 12, padding: 16 }}>
                  <div style={{ width: 288, height: 288, borderRadius: 8, overflow: "hidden", border: "2px solid #333" }}>
                    <ChessBoardWrapper
                      position={selectedPuzzle.fen}
                      interactive={false}
                      boardOrientation="white"
                    />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <p style={{ fontSize: 13, color: "#c8942a", fontWeight: 600, margin: "0 0 4px" }}>
                      Move {selectedPuzzle.moveNumber} · Rating {selectedPuzzle.rating}
                    </p>
                    <p style={{ fontSize: 12, color: "#888", margin: "0 0 4px" }}>
                      Solution: <span style={{ color: "#eee", fontFamily: "monospace" }}>{selectedPuzzle.solutionMoves}</span>
                      {" "}({selectedPuzzle.solutionDepth} ply)
                    </p>
                    <p style={{ fontSize: 12, color: "#888", margin: "0 0 4px" }}>
                      Eval: <span style={{ color: selectedPuzzle.evalCp >= 0 ? "#4ade80" : "#f87171" }}>{selectedPuzzle.evalCp > 0 ? "+" : ""}{(selectedPuzzle.evalCp / 100).toFixed(1)}</span>
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                      {selectedPuzzle.themes.split(" ").map((t) => (
                        <span key={t} style={{ fontSize: 10, background: "#c8942a22", color: "#c8942a", border: "1px solid #c8942a44", borderRadius: 4, padding: "2px 8px" }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: "#1a1a1a", borderRadius: 12, padding: 32, textAlign: "center", color: "#555" }}>
                  Click a puzzle to preview
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p style={{ fontSize: 11, color: "#888", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 700, color: "#eee", margin: 0 }}>{value}</p>
    </div>
  );
}

function GameCard({
  game, index, expanded, onToggle, selectedPuzzleId, onSelectPuzzle,
}: {
  game: GameResult;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  selectedPuzzleId?: string;
  onSelectPuzzle: (p: PuzzleResult) => void;
}) {
  return (
    <div style={{ background: "#1a1a1a", borderRadius: 12, marginBottom: 12, overflow: "hidden", border: "1px solid #2a2a2a" }}>
      {/* Header — always visible */}
      <button
        onClick={onToggle}
        style={{
          width: "100%", background: "transparent", border: "none", color: "#eee",
          padding: "16px 20px", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Game {index + 1}</span>
          <AccuracyBadge value={game.accuracy.overall} />
          <span style={{ fontSize: 12, color: "#888" }}>{game.totalMoves} moves · {game.puzzleCount} puzzles</span>
          {!game.stockfishAvailable && (
            <span style={{ fontSize: 11, color: "#ef4444", background: "#ef444422", padding: "2px 8px", borderRadius: 4 }}>
              Engine unavailable
            </span>
          )}
        </div>
        <span style={{ fontSize: 12, color: "#555" }}>{expanded ? "▼" : "▶"}</span>
      </button>

      {expanded && (
        <div style={{ padding: "0 20px 20px" }}>
          {/* Accuracy breakdown */}
          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <PhaseAccuracy label="Opening" value={game.accuracy.opening} />
            <PhaseAccuracy label="Middlegame" value={game.accuracy.middlegame} />
            <PhaseAccuracy label="Endgame" value={game.accuracy.endgame} />
            <div>
              <p style={{ fontSize: 10, color: "#666", margin: "0 0 2px" }}>AVG CPL</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#eee", margin: 0 }}>{game.accuracy.averageCpl}</p>
            </div>
          </div>

          {/* Game URL */}
          {game.gameUrl && (
            <a href={game.gameUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#c8942a", display: "block", marginBottom: 12 }}>
              {game.gameUrl}
            </a>
          )}

          {/* Puzzles */}
          {game.puzzles.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Puzzles extracted</p>
              {game.puzzles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectPuzzle(p)}
                  style={{
                    width: "100%", background: selectedPuzzleId === p.id ? "#2a2520" : "transparent",
                    border: selectedPuzzleId === p.id ? "1px solid #c8942a44" : "1px solid transparent",
                    borderRadius: 8, padding: "10px 12px", cursor: "pointer", textAlign: "left", display: "flex",
                    justifyContent: "space-between", alignItems: "center", marginBottom: 4, color: "#eee",
                  }}
                >
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>Move {p.moveNumber}</span>
                    <span style={{ fontSize: 11, color: "#888", marginLeft: 8 }}>{p.solutionDepth} ply · {p.rating}r</span>
                    <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                      {p.themes.split(" ").filter(t => t !== "v2").map((t) => (
                        <span key={t} style={{ fontSize: 9, background: "#c8942a22", color: "#c8942a", borderRadius: 3, padding: "1px 6px" }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontFamily: "monospace", color: "#666" }}>{p.solutionMoves.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          )}

          {/* CPL per move — compact bar chart */}
          {game.moveEvals.length > 0 && (
            <div>
              <p style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Centipawn loss per move</p>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 60 }}>
                {game.moveEvals.map((e, i) => {
                  const h = Math.min(e.cpl / 3, 60);
                  const color = e.cpl >= 100 ? "#ef4444" : e.cpl >= 50 ? "#f59e0b" : "#4ade80";
                  return (
                    <div
                      key={i}
                      title={`Move ${e.move} (${e.side}): ${e.cpl}cp — played ${e.played}, best ${e.best} [${e.phase}]`}
                      style={{ width: Math.max(3, 400 / game.moveEvals.length), height: Math.max(1, h), background: color, borderRadius: "2px 2px 0 0", opacity: 0.8 }}
                    />
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 9, color: "#555" }}>Move 1</span>
                <span style={{ fontSize: 9, color: "#555" }}>Move {game.moveEvals[game.moveEvals.length - 1]?.move}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AccuracyBadge({ value }: { value: number }) {
  const color = value >= 90 ? "#4ade80" : value >= 70 ? "#facc15" : value >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <span style={{ fontSize: 13, fontWeight: 700, color, background: `${color}15`, border: `1px solid ${color}33`, borderRadius: 6, padding: "2px 10px" }}>
      {value}%
    </span>
  );
}

function PhaseAccuracy({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  const color = value >= 90 ? "#4ade80" : value >= 70 ? "#facc15" : value >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div>
      <p style={{ fontSize: 10, color: "#666", margin: "0 0 2px" }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 600, color, margin: 0 }}>{value}%</p>
    </div>
  );
}
