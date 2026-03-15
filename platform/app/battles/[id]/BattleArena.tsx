"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { BattleData, RoundResult } from "@/lib/battles/types";
import { playerDisplayName } from "@/lib/battles/types";
import ShareButton from "@/components/marketing/ShareButton";

const BattlePuzzle = dynamic(() => import("@/components/puzzles/BattlePuzzle"), {
  ssr: false,
});

interface PuzzleRow {
  id: string;
  solvingFen: string;
  solutionMoves: string;
  themes: string;
}

interface BattleArenaProps {
  initialBattle: BattleData;
  currentUserId: string | null;
  /** Pre-fetched puzzle data for rounds */
  puzzles: PuzzleRow[];
}

type ArenaPhase =
  | "waiting"       // waiting for opponent
  | "countdown"     // 3-2-1
  | "playing"       // actively solving current round's puzzle
  | "submitted"     // submitted, waiting for opponent
  | "round_result"  // brief round result screen
  | "complete";     // battle over

export default function BattleArena({
  initialBattle,
  currentUserId,
  puzzles,
}: BattleArenaProps) {
  const [battle, setBattle] = useState<BattleData>(initialBattle);
  const [arenaPhase, setArenaPhase] = useState<ArenaPhase>(() =>
    initialBattle.status === "waiting" ? "waiting" :
    initialBattle.status === "completed" ? "complete" :
    "countdown"
  );
  const [countdown, setCountdown] = useState(3);
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [lastRoundResult, setLastRoundResult] = useState<RoundResult | null>(null);
  const [myRatingChange, setMyRatingChange] = useState<number | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevStatusRef = useRef(initialBattle.status);

  const isPlayer1 = battle.player1Id === currentUserId;
  const isPlayer2 = battle.player2Id === currentUserId;
  const isParticipant = isPlayer1 || isPlayer2;

  const myName = currentUserId
    ? isPlayer1
      ? playerDisplayName(battle.player1)
      : battle.player2
      ? playerDisplayName(battle.player2)
      : "You"
    : "Spectator";

  const opponentName = isPlayer1
    ? battle.player2 ? playerDisplayName(battle.player2) : "Waiting…"
    : playerDisplayName(battle.player1);

  // Score from rounds
  const myId = currentUserId;
  const myWins = battle.rounds.filter((r) => r.roundWinnerId === myId).length;
  const oppWins = battle.rounds.filter(
    (r) => r.roundWinnerId !== null && r.roundWinnerId !== myId
  ).length;

  // Active round: first round where I haven't yet submitted
  const activeRound = battle.rounds.find((r) => {
    if (isPlayer1) return r.player1SolveMs === null;
    if (isPlayer2) return r.player2SolveMs === null;
    return false;
  });

  const activeRoundIdx = battle.rounds.findIndex((r) => {
    if (isPlayer1) return r.player1SolveMs === null;
    if (isPlayer2) return r.player2SolveMs === null;
    return false;
  });

  const currentPuzzle = activeRound ? puzzles.find((p) => p.id === activeRound.puzzleId) : null;

  // Polling: update battle state every 2s
  const fetchBattle = useCallback(async () => {
    try {
      const res = await fetch(`/api/battles/${battle.id}`, { cache: "no-store" });
      if (!res.ok) return;
      const updated: BattleData = await res.json();
      setBattle(updated);

      // Detect transition from waiting → active
      if (prevStatusRef.current === "waiting" && updated.status === "active") {
        prevStatusRef.current = "active";
        startCountdown();
        return;
      }
      prevStatusRef.current = updated.status;

      if (updated.status === "completed") {
        stopPolling();
        setArenaPhase("complete");
        // Compute my rating change if we're a participant
        if (myId) {
          const myPlayer =
            updated.player1Id === myId ? updated.player1 : updated.player2;
          const oldRating = isPlayer1 ? initialBattle.player1.battleRating : initialBattle.player2?.battleRating;
          if (myPlayer && oldRating !== undefined) {
            setMyRatingChange(myPlayer.battleRating - oldRating);
          }
        }
      }
    } catch {
      // ignore network errors
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle.id]);

  function startPolling() {
    if (pollRef.current) return;
    pollRef.current = setInterval(fetchBattle, 2000);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startCountdown() {
    setArenaPhase("countdown");
    setCountdown(3);
    let c = 3;
    const t = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(t);
        setArenaPhase("playing");
      }
    }, 1000);
  }

  useEffect(() => {
    if (battle.status === "waiting" || battle.status === "active") {
      startPolling();
    }
    if (battle.status === "active" && arenaPhase === "countdown") {
      // If we loaded directly into an active battle (player 2's first load)
      startCountdown();
    }
    return () => stopPolling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePuzzleComplete(success: boolean, solveTimeMs: number) {
    if (!activeRound || !currentUserId) return;
    setArenaPhase("submitted");

    try {
      const res = await fetch(`/api/battles/${battle.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzleId: activeRound.puzzleId,
          solveTimeMs,
          success,
        }),
      });
      const data = await res.json();
      if (!res.ok) return;

      setBattle(data.battle);

      if (data.battleComplete) {
        stopPolling();
        setArenaPhase("complete");
        const updatedBattle: BattleData = data.battle;
        const myPlayer =
          updatedBattle.player1Id === myId ? updatedBattle.player1 : updatedBattle.player2;
        const oldRating = isPlayer1 ? initialBattle.player1.battleRating : initialBattle.player2?.battleRating;
        if (myPlayer && oldRating !== undefined) {
          setMyRatingChange(myPlayer.battleRating - oldRating);
        }
        return;
      }

      if (data.roundResolved) {
        // Show the round result briefly, then move to next round
        const resolvedRound = (data.battle as BattleData).rounds.find(
          (r: RoundResult) => r.puzzleId === activeRound.puzzleId
        );
        setLastRoundResult(resolvedRound ?? null);
        setArenaPhase("round_result");

        setTimeout(() => {
          setLastRoundResult(null);
          const nextRound = (data.battle as BattleData).rounds.find(
            (r: RoundResult) =>
              isPlayer1 ? r.player1SolveMs === null : r.player2SolveMs === null
          );
          if (nextRound) {
            setArenaPhase("countdown");
            startCountdown();
          }
        }, 3000);
      }
      // else: waiting for opponent to finish — stay in "submitted" phase and keep polling
    } catch {
      setArenaPhase("playing"); // allow retry
    }
  }

  async function handleJoin() {
    const res = await fetch(`/api/battles/${battle.id}/join`, { method: "POST" });
    if (res.ok) {
      const updated: BattleData = await res.json();
      setBattle(updated);
      prevStatusRef.current = "active";
      startCountdown();
    }
  }

  // --- RENDER ---

  if (arenaPhase === "waiting") {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    return (
      <div className="text-center space-y-6">
        <div className="animate-pulse text-4xl">⏳</div>
        <h2 className="text-xl font-bold text-gray-900">Waiting for an opponent…</h2>
        <p className="text-sm text-gray-500">Share this link to challenge someone:</p>
        <div className="bg-gray-100 rounded-lg px-4 py-2 font-mono text-xs text-gray-700 break-all">
          {shareUrl}
        </div>
        {!isParticipant && currentUserId && (
          <button
            onClick={handleJoin}
            className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Join Battle
          </button>
        )}
        {!currentUserId && (
          <p className="text-sm text-gray-400">
            <Link href="/api/auth/signin" className="text-blue-600 underline">Sign in</Link> to join this battle.
          </p>
        )}
      </div>
    );
  }

  if (arenaPhase === "complete") {
    const iWon = battle.winnerId === currentUserId;
    const isDraw = !battle.winnerId;
    return (
      <div className="text-center space-y-6">
        <div className="text-6xl">{iWon ? "🏆" : isDraw ? "🤝" : "😔"}</div>
        <h2 className="text-2xl font-bold text-gray-900">
          {iWon ? "You won!" : isDraw ? "It's a draw!" : "Better luck next time"}
        </h2>
        <div className="flex justify-center gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-blue-600">{myWins}</div>
            <div className="text-xs text-gray-500">Your rounds</div>
          </div>
          <div className="text-2xl font-light text-gray-300 self-center">–</div>
          <div>
            <div className="text-3xl font-bold text-gray-600">{oppWins}</div>
            <div className="text-xs text-gray-500">Opponent rounds</div>
          </div>
        </div>

        {myRatingChange !== null && (
          <div className={`text-lg font-semibold ${myRatingChange >= 0 ? "text-green-600" : "text-red-600"}`}>
            Rating: {myRatingChange >= 0 ? "+" : ""}{myRatingChange}
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Link
            href="/battles"
            className="bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            New Battle
          </Link>
          <Link
            href="/puzzles"
            className="bg-gray-100 text-gray-700 font-semibold px-5 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            Solo Practice
          </Link>
        </div>

        {iWon && (
          <ShareButton
            text={`I just won a Cassandra Chess puzzle battle ${myWins}–${oppWins}! Challenge me:`}
            className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mx-auto"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.252 5.622 5.912-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share this win
          </ShareButton>
        )}
      </div>
    );
  }

  if (arenaPhase === "countdown") {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-gray-500 uppercase tracking-widest">Get ready…</p>
        <div className="text-8xl font-bold text-blue-600 tabular-nums animate-pulse">
          {countdown === 0 ? "Go!" : countdown}
        </div>
      </div>
    );
  }

  if (arenaPhase === "round_result" && lastRoundResult) {
    const iWonRound = lastRoundResult.roundWinnerId === currentUserId;
    const isDrawRound = lastRoundResult.roundWinnerId === null;
    const myMs = isPlayer1 ? lastRoundResult.player1SolveMs : lastRoundResult.player2SolveMs;
    const oppMs = isPlayer1 ? lastRoundResult.player2SolveMs : lastRoundResult.player1SolveMs;
    return (
      <div className="text-center space-y-4">
        <div className="text-5xl">{iWonRound ? "⚡" : isDrawRound ? "🤝" : "💪"}</div>
        <h3 className="text-xl font-bold text-gray-900">
          {iWonRound ? "You got it faster!" : isDrawRound ? "Draw!" : `${opponentName} was faster`}
        </h3>
        <div className="flex justify-center gap-8 text-sm text-gray-600">
          <div>
            <div className="font-mono font-bold">{myMs ? (myMs / 1000).toFixed(1) + "s" : "—"}</div>
            <div className="text-xs text-gray-400">Your time</div>
          </div>
          <div>
            <div className="font-mono font-bold">{oppMs ? (oppMs / 1000).toFixed(1) + "s" : "—"}</div>
            <div className="text-xs text-gray-400">Opponent</div>
          </div>
        </div>
        <div className="flex justify-center gap-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{myWins}</div>
            <div className="text-xs text-gray-500">You</div>
          </div>
          <div className="text-2xl font-light text-gray-300 self-center">–</div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{oppWins}</div>
            <div className="text-xs text-gray-500">{opponentName}</div>
          </div>
        </div>
        <p className="text-xs text-gray-400 animate-pulse">Next puzzle loading…</p>
      </div>
    );
  }

  if (arenaPhase === "submitted") {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl animate-spin">⏳</div>
        <p className="text-gray-600 font-medium">Waiting for {opponentName}…</p>
        <div className="flex justify-center gap-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{myWins}</div>
            <div className="text-xs text-gray-500">You</div>
          </div>
          <div className="text-2xl font-light text-gray-300 self-center">–</div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{oppWins}</div>
            <div className="text-xs text-gray-500">{opponentName}</div>
          </div>
        </div>
      </div>
    );
  }

  // arenaPhase === "playing"
  const roundNumber = activeRoundIdx + 1;
  const orientation: "white" | "black" = isPlayer1 ? "white" : "black";

  return (
    <div className="space-y-4">
      {/* Score header */}
      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
        <div className="text-center flex-1">
          <div className="text-xs text-gray-500 truncate">{myName}</div>
          <div className="text-2xl font-bold text-blue-600">{myWins}</div>
        </div>
        <div className="text-center px-4">
          <div className="text-xs text-gray-400">Round {roundNumber}/5</div>
          <div className="text-lg font-light text-gray-300">vs</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-xs text-gray-500 truncate">{opponentName}</div>
          <div className="text-2xl font-bold text-gray-600">{oppWins}</div>
        </div>
      </div>

      {currentPuzzle ? (
        <BattlePuzzle
          key={currentPuzzle.id}
          puzzleId={currentPuzzle.id}
          solvingFen={currentPuzzle.solvingFen}
          solutionMoves={currentPuzzle.solutionMoves}
          boardOrientation={orientation}
          onComplete={handlePuzzleComplete}
        />
      ) : (
        <div className="text-center text-gray-400 py-10">Loading puzzle…</div>
      )}
    </div>
  );
}
