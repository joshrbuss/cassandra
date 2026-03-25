"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { Chess } from "chess.js";
import type {
  KairosPuzzle,
  KairosPuzzleResult,
  KairosAggregateMetrics,
  KairosInsight,
  KairosProfile,
  KairosCategory,
} from "@/lib/kairos/types";
import { computeMetrics, generateInsight, generateProfile } from "@/lib/kairos/insights";
import type { PieceDropHandlerArgs } from "@/components/ChessBoardWrapper";

const ChessBoardWrapper = dynamic(() => import("@/components/ChessBoardWrapper"), {
  ssr: false,
  loading: () => <div className="w-full aspect-square bg-zinc-800 rounded-lg animate-pulse" />,
});

type Phase = "intro" | "puzzle" | "feedback" | "results";

interface Props {
  puzzles: KairosPuzzle[];
  sessionId: string;
}

// ─── Feedback messages ──────────────────────────────────────────────────────

function getFeedback(
  puzzle: KairosPuzzle,
  moveCorrect: boolean,
  movePlayed: string,
): { title: string; body: string } {
  if (puzzle.kairos_category === "quiet" || (!puzzle.has_tactic && !puzzle.is_defensive)) {
    if (moveCorrect) {
      return {
        title: "Solid move.",
        body: "No forcing move here — a sensible developing move played quickly is exactly right. Quick decisions in calm positions save your clock for when it matters.",
      };
    }
    return {
      title: "No forced win here.",
      body: `The best move was ${puzzle.correct_response_san}. Looking for tricks in positions where there are none is one of the biggest clock drains we see in losing games.`,
    };
  }

  if (puzzle.is_defensive) {
    if (moveCorrect) {
      return {
        title: "Good defensive awareness.",
        body: "Your opponent had a threat here and you handled it. Defensive awareness is underrated and undertrained.",
      };
    }
    return {
      title: "Missed the threat.",
      body: `Your opponent had a threat here — ${puzzle.correct_response_san} was the right response. Spotting what your opponent is trying to do before calculating your own ideas is a separate skill from tactics.`,
    };
  }

  // Tactical position
  if (moveCorrect) {
    return {
      title: "You found it.",
      body: `There was a winning move here — ${puzzle.correct_response_san}. Nice recognition.`,
    };
  }
  return {
    title: "There was something here.",
    body: `The winning move was ${puzzle.correct_response_san}. We'll track this pattern across your session.`,
  };
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function KairosShell({ puzzles, sessionId }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [results, setResults] = useState<KairosPuzzleResult[]>([]);
  const [feedback, setFeedback] = useState<{ title: string; body: string } | null>(null);
  const [moveCorrect, setMoveCorrect] = useState(false);
  const [boardFen, setBoardFen] = useState("");
  const [squareStyles, setSquareStyles] = useState<Record<string, React.CSSProperties>>({});

  // Timer
  const [timerMs, setTimerMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  // Results state
  const [metrics, setMetrics] = useState<KairosAggregateMetrics | null>(null);
  const [insight, setInsight] = useState<KairosInsight | null>(null);
  const [profile, setProfile] = useState<KairosProfile | null>(null);
  const [sessionSaved, setSessionSaved] = useState(false);

  // Layer 2 email
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "loading" | "error">("idle");

  // Feedback auto-advance
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const puzzle = puzzles[currentIdx];

  // Start timer when puzzle starts
  useEffect(() => {
    if (phase === "puzzle" && puzzle) {
      setBoardFen(puzzle.fen);
      setSquareStyles({});
      startTimeRef.current = Date.now();
      setTimerMs(0);
      timerRef.current = setInterval(() => {
        setTimerMs(Date.now() - startTimeRef.current);
      }, 100);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, currentIdx, puzzle]);

  // Auto-advance from feedback
  useEffect(() => {
    if (phase === "feedback") {
      feedbackTimerRef.current = setTimeout(() => advanceFromFeedback(), 4000);
      return () => {
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIdx]);

  function advanceFromFeedback() {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    if (currentIdx + 1 < puzzles.length) {
      setCurrentIdx((i) => i + 1);
      setPhase("puzzle");
    } else {
      finishSession();
    }
  }

  function finishSession() {
    const m = computeMetrics(results);
    const ins = generateInsight(m);
    setMetrics(m);
    setInsight(ins);
    setPhase("results");

    // Save to localStorage first
    try {
      localStorage.setItem(
        `kairos_session_${sessionId}`,
        JSON.stringify({ results, metrics: m, insight: ins })
      );
    } catch { /* ignore */ }

    // POST to server
    fetch("/api/kairos/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ puzzleResults: results }),
    })
      .then(() => setSessionSaved(true))
      .catch(() => { /* silently fail — data is in localStorage */ });
  }

  const handlePieceDrop = useCallback(
    (args: PieceDropHandlerArgs) => {
      if (phase !== "puzzle" || !puzzle) return false;

      const { sourceSquare, targetSquare } = args;
      if (!targetSquare || sourceSquare === targetSquare) return false;

      // Stop timer
      if (timerRef.current) clearInterval(timerRef.current);
      const solveTimeMs = Date.now() - startTimeRef.current;
      const solveTimeSec = Math.round(solveTimeMs / 100) / 10;

      // Validate move
      const chess = new Chess(puzzle.fen);
      let moveUci = "";
      try {
        const result = chess.move({ from: sourceSquare, to: targetSquare });
        if (result) {
          moveUci = `${result.from}${result.to}${result.promotion ?? ""}`;
        }
      } catch {
        // Try with promotion
        try {
          const result = chess.move({
            from: sourceSquare,
            to: targetSquare,
            promotion: "q",
          });
          if (result) {
            moveUci = `${result.from}${result.to}q`;
          }
        } catch {
          return false;
        }
      }

      if (!moveUci) return false;

      // Check correctness: does the played move match the correct response?
      const correct = moveUci === puzzle.correct_response;

      // Record result
      const puzzleResult: KairosPuzzleResult = {
        puzzle_id: puzzle.puzzle_id,
        solve_time_seconds: solveTimeSec,
        move_played: moveUci,
        move_correct: correct,
        has_tactic: puzzle.has_tactic,
        sequence_length: puzzle.sequence_length,
        is_defensive: puzzle.is_defensive,
        tactic_subtype: puzzle.tactic_subtype,
        position_complexity_score: puzzle.position_complexity_score,
        target_solve_time: puzzle.target_solve_time,
        time_vs_target: puzzle.target_solve_time > 0 ? solveTimeSec / puzzle.target_solve_time : 1,
        kairos_category: puzzle.kairos_category,
      };

      setResults((prev) => [...prev, puzzleResult]);
      setMoveCorrect(correct);

      // Show the move on the board
      setBoardFen(chess.fen());
      setSquareStyles({
        [sourceSquare]: { backgroundColor: correct ? "rgba(74,222,128,0.4)" : "rgba(248,113,113,0.4)" },
        [targetSquare]: { backgroundColor: correct ? "rgba(74,222,128,0.4)" : "rgba(248,113,113,0.4)" },
      });

      // If wrong, briefly show then show correct move
      if (!correct) {
        setTimeout(() => {
          const showChess = new Chess(puzzle.fen);
          try {
            const correctFrom = puzzle.correct_response.slice(0, 2);
            const correctTo = puzzle.correct_response.slice(2, 4);
            const promo = puzzle.correct_response[4] || undefined;
            showChess.move({ from: correctFrom, to: correctTo, promotion: promo });
            setBoardFen(showChess.fen());
            setSquareStyles({
              [correctFrom]: { backgroundColor: "rgba(74,222,128,0.4)" },
              [correctTo]: { backgroundColor: "rgba(74,222,128,0.4)" },
            });
          } catch { /* ignore */ }
        }, 800);
      }

      setFeedback(getFeedback(puzzle, correct, moveUci));
      setPhase("feedback");

      return true;
    },
    [phase, puzzle]
  );

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !metrics) return;
    setEmailStatus("loading");
    try {
      const prof = generateProfile(metrics);
      setProfile(prof);

      // Update session with email
      await fetch("/api/kairos/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puzzleResults: results, email }),
      });
      setEmailSubmitted(true);
      setEmailStatus("idle");
    } catch {
      setEmailStatus("error");
    }
  }

  function handleShare() {
    if (!insight) return;
    const params = new URLSearchParams({
      headline: insight.headline,
      number: insight.shareNumber,
      stat: insight.shareStat,
    });
    const imgUrl = `${window.location.origin}/api/kairos/share?${params}`;

    const tweetText = `${insight.headline}\n\n${insight.shareStat}\n\nFind your chess habits:`;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent("https://cassandrachess.com/kairos")}`;
    window.open(tweetUrl, "_blank", "noopener,noreferrer,width=550,height=420");

    // Also copy image URL (for platforms that support it)
    void navigator.clipboard?.writeText(imgUrl);
  }

  const formatTime = (ms: number) => {
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, "0")}`;
  };

  // ─── INTRO ────────────────────────────────────────────────────────────────

  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-[#0e0e0e] text-[#ededed] flex items-center justify-center px-4">
        <div className="max-w-xl w-full">
          <p className="text-[#c8942a] text-sm font-semibold tracking-widest mb-6">KAIROS</p>

          <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-6">
            How do you actually think at the board?
          </h1>

          <div className="text-[#999] text-[15px] leading-relaxed space-y-4 mb-8">
            <p>
              We analysed thousands of chess games to understand why players lose.
              Not just blunders — the patterns that repeat across hundreds of games.
              What we found surprised us: most losses aren&apos;t caused by missed tactics.
              They&apos;re caused by something harder to see.
            </p>
            <p>
              Kairos gives you 20 positions. Some have a winning move. Some have a winning sequence.
              Some have nothing — the right move is just a sensible developing move played quickly.
              Your job is simply to play.
            </p>
            <p>
              We measure how long you think, what you choose, and what that reveals about
              how you make decisions under pressure.
            </p>
            <p className="text-[#666] text-sm">
              Takes about 10 minutes. No account needed.
            </p>
          </div>

          <button
            onClick={() => setPhase("puzzle")}
            className="w-full sm:w-auto px-8 py-3 rounded-lg bg-[#c8942a] text-white font-semibold text-base hover:bg-[#d4a33e] transition-colors"
          >
            Start Kairos
          </button>

          <p className="text-[#555] text-xs mt-6 leading-relaxed">
            Based on analysis of 2,835 games with full engine coverage — we&apos;re still building
            the dataset. Results are directional. The more positions you see, the more accurate
            your profile becomes.
          </p>
        </div>
      </div>
    );
  }

  // ─── PUZZLE ───────────────────────────────────────────────────────────────

  if (phase === "puzzle" && puzzle) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] text-[#ededed] flex flex-col items-center px-4 py-6">
        <div className="w-full max-w-md">
          {/* Top bar: progress + timer */}
          <div className="flex justify-between items-center mb-4">
            <p className="text-[#666] text-sm">
              Position {currentIdx + 1} of {puzzles.length}
            </p>
            <p className="text-[#555] text-sm font-mono tabular-nums">
              {formatTime(timerMs)}
            </p>
          </div>

          {/* Board */}
          <div className="w-full aspect-square rounded-lg overflow-hidden border-2 border-zinc-800">
            <ChessBoardWrapper
              position={boardFen || puzzle.fen}
              interactive
              boardOrientation={puzzle.board_orientation}
              onPieceDrop={handlePieceDrop}
              squareStyles={squareStyles}
            />
          </div>
        </div>
      </div>
    );
  }

  // ─── FEEDBACK ─────────────────────────────────────────────────────────────

  if (phase === "feedback" && feedback) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] text-[#ededed] flex flex-col items-center px-4 py-6">
        <div className="w-full max-w-md">
          {/* Progress */}
          <div className="flex justify-between items-center mb-4">
            <p className="text-[#666] text-sm">
              Position {currentIdx + 1} of {puzzles.length}
            </p>
            <p className="text-[#555] text-sm font-mono tabular-nums">
              {formatTime(timerMs)}
            </p>
          </div>

          {/* Board (showing the move) */}
          <div className="w-full aspect-square rounded-lg overflow-hidden border-2 border-zinc-800 mb-4">
            <ChessBoardWrapper
              position={boardFen}
              interactive={false}
              boardOrientation={puzzle.board_orientation}
              squareStyles={squareStyles}
            />
          </div>

          {/* Feedback card */}
          <div
            className={`rounded-xl p-4 border ${
              moveCorrect
                ? "bg-green-900/20 border-green-800/40"
                : "bg-red-900/20 border-red-800/40"
            }`}
          >
            <p className={`font-semibold text-sm mb-1 ${moveCorrect ? "text-green-400" : "text-red-400"}`}>
              {feedback.title}
            </p>
            <p className="text-[#999] text-sm leading-relaxed">
              {feedback.body}
            </p>
          </div>

          <button
            onClick={advanceFromFeedback}
            className="mt-4 text-[#666] text-sm hover:text-[#999] transition-colors"
          >
            Next position &rarr;
          </button>
        </div>
      </div>
    );
  }

  // ─── RESULTS ──────────────────────────────────────────────────────────────

  if (phase === "results" && metrics && insight) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] text-[#ededed] px-4 py-8">
        <div className="max-w-xl mx-auto">
          <p className="text-[#c8942a] text-sm font-semibold tracking-widest mb-6">KAIROS</p>

          {/* Layer 1: Free insight */}
          <div className="mb-10">
            <p className="text-5xl font-bold text-[#c8942a] mb-4 tabular-nums">
              {insight.shareNumber}
            </p>
            <h2 className="text-2xl font-bold mb-3">{insight.headline}</h2>
            <p className="text-[#999] text-[15px] leading-relaxed mb-6">
              {insight.body}
            </p>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <StatBox label="Accuracy" value={`${metrics.accuracy_pct}%`} />
              <StatBox label="Avg time" value={`${metrics.avg_solve_time}s`} />
              <StatBox label="Correct" value={`${metrics.correct_count}/${metrics.total_puzzles}`} />
            </div>

            {/* Category breakdown */}
            <div className="bg-zinc-900 rounded-xl p-4 mb-6">
              <p className="text-xs text-[#666] uppercase tracking-wider mb-3">By position type</p>
              {(Object.entries(metrics.accuracy_by_category) as [KairosCategory, { correct: number; total: number; pct: number }][]).map(
                ([cat, data]) => (
                  <div key={cat} className="flex justify-between items-center py-1.5 border-b border-zinc-800 last:border-0">
                    <span className="text-sm text-[#999] capitalize">{cat.replace(/_/g, " ")}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-[#ededed]">
                        {data.correct}/{data.total}
                      </span>
                      <span className="text-xs text-[#666] w-10 text-right">
                        {metrics.avg_time_by_category[cat]?.toFixed(0) ?? "-"}s
                      </span>
                    </div>
                  </div>
                ),
              )}
            </div>

            <button
              onClick={handleShare}
              className="w-full py-3 rounded-lg bg-zinc-800 text-[#ededed] font-semibold text-sm hover:bg-zinc-700 transition-colors mb-3"
            >
              Share on X
            </button>
          </div>

          {/* Layer 2: Email for full profile */}
          {!emailSubmitted ? (
            <div className="bg-zinc-900 rounded-xl p-6 mb-10 border border-zinc-800">
              <h3 className="text-lg font-bold mb-2">See your full chess habits profile</h3>
              <p className="text-sm text-[#888] mb-4">
                Speed profile, tactic subtype breakdown, calculation depth analysis, and your player archetype.
              </p>
              <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#c8942a]/50 focus:border-transparent placeholder:text-zinc-600"
                />
                <button
                  type="submit"
                  disabled={emailStatus === "loading"}
                  className="rounded-lg bg-[#c8942a] text-white font-semibold px-5 py-2.5 text-sm hover:bg-[#d4a33e] disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {emailStatus === "loading" ? "Loading..." : "Show my profile"}
                </button>
              </form>
              {emailStatus === "error" && (
                <p className="text-xs text-red-400 mt-2">Something went wrong. Try again.</p>
              )}
            </div>
          ) : profile ? (
            <div className="mb-10">
              <ProfileCard profile={profile} metrics={metrics} />
            </div>
          ) : null}

          {/* Layer 3: Chess.com connection */}
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <h3 className="text-lg font-bold mb-2">See this in your actual games</h3>
            <p className="text-sm text-[#888] mb-4">
              These were general positions. Want to know which specific moments from YOUR games
              are costing you? We&apos;ll find the positions you keep reaching, show you where
              you&apos;re losing them, and build a training set from your own games — not random
              puzzles, but the exact situations you face.
            </p>

            {insight.key !== "strong_overall" && (
              <p className="text-xs text-[#666] mb-4">
                In our analysis so far, players with your profile most commonly struggle with{" "}
                {insight.key === "clock_drain"
                  ? "time management in quiet positions"
                  : insight.key === "missed_tactics"
                    ? "pattern recognition in tactical positions"
                    : insight.key === "missed_defense"
                      ? "defensive awareness"
                      : "consistent calculation depth"}
                . We&apos;ve seen this pattern in games across every rating band we&apos;ve studied.
              </p>
            )}

            <div className="text-center">
              <p className="text-sm text-[#666] mb-3">
                Coming soon — enter your Chess.com username to join the waitlist
              </p>
              <input
                type="text"
                placeholder="Chess.com username"
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#c8942a]/50 focus:border-transparent placeholder:text-zinc-600 mb-3"
              />
              <button
                className="w-full py-3 rounded-lg bg-zinc-800 text-[#c8942a] font-semibold text-sm border border-[#c8942a]/30 hover:bg-[#c8942a]/10 transition-colors"
                onClick={() => {
                  // Waitlist — just collect username
                }}
              >
                Join waitlist
              </button>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-[#444] mt-8">
            {sessionSaved ? "Session saved" : "Saving..."} · cassandrachess.com/kairos
          </p>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900 rounded-lg p-3 text-center">
      <p className="text-xs text-[#666] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-lg font-bold text-[#ededed]">{value}</p>
    </div>
  );
}

function ProfileCard({ profile, metrics }: { profile: KairosProfile; metrics: KairosAggregateMetrics }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[#c8942a] text-sm font-semibold tracking-widest mb-2">YOUR PROFILE</p>
        <h3 className="text-xl font-bold mb-1 capitalize">
          {profile.archetype.replace(/_/g, " ")}
        </h3>
        <p className="text-sm text-[#999] leading-relaxed">
          {profile.archetype_description}
        </p>
      </div>

      {/* Speed profile */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <p className="text-xs text-[#666] uppercase tracking-wider mb-3">Speed profile</p>
        <div className="grid grid-cols-2 gap-2">
          <MiniStat label="Tactical" value={`${profile.speed.avg_tactical.toFixed(0)}s`} />
          <MiniStat label="Quiet" value={`${profile.speed.avg_quiet.toFixed(0)}s`} />
          <MiniStat label="Defensive" value={`${profile.speed.avg_defensive.toFixed(0)}s`} />
          <MiniStat label="Deep sequence" value={`${profile.speed.avg_deep.toFixed(0)}s`} />
        </div>
      </div>

      {/* Accuracy profile */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <p className="text-xs text-[#666] uppercase tracking-wider mb-3">Accuracy profile</p>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-[#999]">Tactical recognition</span>
            <span className="text-sm font-mono text-[#ededed]">{profile.accuracy.tactical_rate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-[#999]">Defensive recognition</span>
            <span className="text-sm font-mono text-[#ededed]">{profile.accuracy.defensive_rate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-[#999]">Quiet position accuracy</span>
            <span className="text-sm font-mono text-[#ededed]">{profile.accuracy.quiet_rate}</span>
          </div>
          {Object.entries(profile.accuracy.by_tactic).length > 0 && (
            <div className="mt-2 pt-2 border-t border-zinc-800">
              <p className="text-xs text-[#555] mb-1">By tactic type</p>
              {Object.entries(profile.accuracy.by_tactic).map(([sub, rate]) => (
                <div key={sub} className="flex justify-between py-0.5">
                  <span className="text-xs text-[#777] capitalize">{sub.replace(/_/g, " ")}</span>
                  <span className="text-xs font-mono text-[#999]">{rate}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Calculation depth */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <p className="text-xs text-[#666] uppercase tracking-wider mb-3">Calculation depth</p>
        <div className="flex justify-between mb-2">
          <span className="text-sm text-[#999]">1-move accuracy</span>
          <span className="text-sm font-mono text-[#ededed]">{profile.depth.single_move_pct}%</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-sm text-[#999]">Sequence accuracy (2+ moves)</span>
          <span className="text-sm font-mono text-[#ededed]">{profile.depth.sequence_pct}%</span>
        </div>
        {profile.depth.depth_drop_pct > 0 && (
          <p className="text-xs text-[#888] mt-2 leading-relaxed">
            Your accuracy drops {profile.depth.depth_drop_pct}% on sequences longer than 1 move — that&apos;s a calculation depth gap, not a pattern recognition gap.
          </p>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-800 rounded-lg p-2 text-center">
      <p className="text-[10px] text-[#555] uppercase">{label}</p>
      <p className="text-sm font-bold text-[#ededed]">{value}</p>
    </div>
  );
}
