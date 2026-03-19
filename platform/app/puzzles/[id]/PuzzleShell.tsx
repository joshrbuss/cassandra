"use client";

import { useState } from "react";
import { Chess } from "chess.js";
import { type Puzzle } from "@prisma/client";
import RetrogradePuzzle from "@/components/RetrogradePuzzle";
import OpponentPredictionPuzzle from "@/components/OpponentPredictionPuzzle";
import StandardPuzzle from "@/components/StandardPuzzle";
import dynamic from "next/dynamic";
const MoveRankingPuzzle = dynamic(() => import("@/components/puzzles/MoveRankingPuzzle"), {
  ssr: false,
  loading: () => <div className="w-full aspect-square bg-gray-100 rounded animate-pulse" />,
});
import WeaknessSpotPuzzle from "@/components/puzzles/WeaknessSpotPuzzle";
import TimeControlPicker from "@/components/TimeControlPicker";
import type { TimeControl } from "@/lib/benchmarks";

type Stage = "retrograde" | "opponent_prediction" | "standard" | "move_ranking" | "weakness_spot";

interface PuzzleShellProps {
  puzzle: Puzzle;
  drillTargetMs?: number | null;
}

export default function PuzzleShell({ puzzle, drillTargetMs }: PuzzleShellProps) {
  const initialStage: Stage =
    puzzle.type === "retrograde"
      ? "retrograde"
      : puzzle.type === "opponent_prediction"
      ? "opponent_prediction"
      : puzzle.type === "move_ranking"
      ? "move_ranking"
      : puzzle.type === "weakness_spot"
      ? "weakness_spot"
      : "standard";

  const [stage, setStage] = useState<Stage>(initialStage);
  const [timeControl, setTimeControl] = useState<TimeControl>("blitz");

  const solvingTurn = puzzle.solvingFen.split(" ")[1];
  const boardOrientation: "white" | "black" =
    solvingTurn === "w" ? "white" : "black";

  // Step-2 data for opponent prediction multi-move
  const step2Data = (() => {
    if (puzzle.type !== "opponent_prediction") return { fen: null, uci: null };
    const parts = puzzle.solutionMoves.trim().split(/\s+/);
    if (parts.length < 2) return { fen: null, uci: null };
    try {
      const chess = new Chess(puzzle.fen);
      chess.move({ from: puzzle.lastMove.slice(0, 2), to: puzzle.lastMove.slice(2, 4), promotion: puzzle.lastMove[4] });
      chess.move({ from: parts[0].slice(0, 2), to: parts[0].slice(2, 4), promotion: parts[0][4] });
      return { fen: chess.fen(), uci: parts[1] };
    } catch {
      return { fen: null, uci: null };
    }
  })();

  return (
    <div className="flex flex-col gap-4">
      {/* Time control preference — shown before the standard solving phase */}
      {stage === "standard" && (
        <TimeControlPicker onChange={setTimeControl} />
      )}

      {stage === "retrograde" && (
        <RetrogradePuzzle
          puzzleId={puzzle.id}
          solvingFen={puzzle.solvingFen}
          onCorrect={() => setStage("standard")}
          onSkip={() => setStage("standard")}
        />
      )}

      {stage === "opponent_prediction" && (
        <OpponentPredictionPuzzle
          puzzleId={puzzle.id}
          fen={puzzle.fen}
          step2Fen={step2Data.fen}
          step2CorrectUci={step2Data.uci}
          themes={puzzle.themes}
          onComplete={() => setStage("standard")}
          onSkip={() => setStage("standard")}
        />
      )}

      {stage === "standard" && (
        <StandardPuzzle
          puzzleId={puzzle.id}
          solvingFen={puzzle.solvingFen}
          solutionMoves={puzzle.solutionMoves}
          boardOrientation={boardOrientation}
          timeControl={timeControl}
          drillTargetMs={drillTargetMs}
        />
      )}

      {stage === "move_ranking" && <MoveRankingPuzzle puzzle={puzzle} />}

      {stage === "weakness_spot" && <WeaknessSpotPuzzle puzzle={puzzle} />}
    </div>
  );
}
